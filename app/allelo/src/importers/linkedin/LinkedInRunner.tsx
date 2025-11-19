import {SourceRunnerProps} from "@/types/importSource";
import {useCallback, useMemo, useState} from "react";
import {Contact} from "@/types/contact";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button
} from "@mui/material";
import {useUpdateProfile} from "@/hooks/useUpdateProfile";
import {LinkedInData} from "./linkedInTypes";
import {LinkedInLoginForm} from "./LinkedInLoginForm";
import {LinkedInVerification} from "./LinkedInVerification";
import {LinkedInChallenge} from "./LinkedInChallenge";
import {LinkedInArchiveStatus} from "./LinkedInArchiveStatus";
import {LinkedInDragDropFallback} from "./LinkedInDragDropFallback";
import {mapLinkedInPerson} from "@/importers/linkedin/linkedinDataMap";

type FlowStep = 'LOGIN' | 'VERIFICATION' | 'ARCHIVE_STATUS' | 'DRAG_DROP' | 'CHALLENGE';

export function LinkedInRunner({open, onClose, onError, onGetResult}: SourceRunnerProps) {
  const isNextGraph = useMemo(() => isNextGraphEnabled(), []);
  const {updateProfile} = useUpdateProfile();

  // Flow state management
  const [currentStep, setCurrentStep] = useState<FlowStep>('LOGIN');
  const [sessionId, setSessionId] = useState<string>('');
  const [linkedInUsername, setLinkedInUsername] = useState<string>('');
  const [preservedUsername, setPreservedUsername] = useState<string>('');

  const processLinkedInData = useCallback(async (data: LinkedInData) => {
    try {
      const contacts: Contact[] = [];

      // Process user's own profile
      if (data.data.profileData) {
        const profileContact = await mapLinkedInPerson(
          data.data.profileData,
          linkedInUsername,
          true,
          data.data.otherData,
          !isNextGraph
        );
        await updateProfile(profileContact);
      }

      // Process connections
      if (data.data.contactsData && Array.isArray(data.data.contactsData)) {
        for (const connection of data.data.contactsData) {
          // Skip empty contacts
          if (!connection.firstName && !connection.lastName && !connection.fullName) {
            continue;
          }

          const contact = await mapLinkedInPerson(connection, linkedInUsername, false, undefined, !isNextGraph);
          contacts.push(contact);
        }
      }

      onGetResult(contacts);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [onGetResult, onClose, linkedInUsername, isNextGraph, updateProfile, onError]);

  // Step 1: Login handlers
  const handleLoginSuccess = useCallback((username?: string) => {
    if (username) {
      setLinkedInUsername(username);
      setCurrentStep('ARCHIVE_STATUS');
    }
  }, []);

  const handleVerificationRequired = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
    setCurrentStep('VERIFICATION');
  }, []);

  const handleChallengeRequired = useCallback((newSessionId: string) => {
    setSessionId(newSessionId);
    setCurrentStep('CHALLENGE');
  }, []);

  const handleCaptchaRequired = useCallback(() => {
    setCurrentStep('DRAG_DROP');
  }, []);

  // Step 2: Verification handlers
  const handleVerificationSuccess = useCallback((username: string) => {
    setLinkedInUsername(username);
    setCurrentStep('ARCHIVE_STATUS');
  }, []);

  const handleVerificationRestart = useCallback(() => {
    setCurrentStep('LOGIN');
  }, []);

  // Step 3: Archive handlers
  const handleArchiveSuccess = useCallback((data: LinkedInData) => {
    processLinkedInData(data);
  }, [processLinkedInData]);

  const handleArchiveFallback = useCallback(() => {
    setCurrentStep('DRAG_DROP');
  }, []);

  const handleArchiveRelogin = useCallback(() => {
    setCurrentStep('LOGIN');
  }, []);

  // Step 4: Drag-drop handlers
  const handleDragDropSuccess = useCallback((data: LinkedInData) => {
    processLinkedInData(data);
  }, [processLinkedInData]);

  const handleDragDropError = useCallback((error: Error) => {
    onError(error);
  }, [onError]);

  const handleClose = useCallback(() => {
    setCurrentStep('LOGIN');
    setSessionId('');
    setLinkedInUsername('');
    setPreservedUsername('');
    onClose();
  }, [onClose]);

  const renderButtons = useCallback(() => {
    switch (currentStep) {
      case 'LOGIN':
        return <Button onClick={handleArchiveFallback}>
          Try Manual Upload
        </Button>;
      default:
        return;
    }
  }, [currentStep, handleArchiveFallback])

  const renderStep = useCallback(() => {
    switch (currentStep) {
      case 'LOGIN':
        return (
          <LinkedInLoginForm
            onSuccess={handleLoginSuccess}
            onVerificationRequired={handleVerificationRequired}
            onChallengeRequired={handleChallengeRequired}
            onCaptchaRequired={handleCaptchaRequired}
            preservedUsername={preservedUsername}
          />
        );
      case 'VERIFICATION':
        return (
          <LinkedInVerification
            sessionId={sessionId}
            onSuccess={handleVerificationSuccess}
            onRestart={handleVerificationRestart}
          />
        );
      case 'CHALLENGE':
        return (
          <LinkedInChallenge
            sessionId={sessionId}
            onSuccess={handleVerificationSuccess}
            onRestart={handleVerificationRestart}
          />
        );
      case 'ARCHIVE_STATUS':
        return (
          <LinkedInArchiveStatus
            linkedInUsername={linkedInUsername}
            onSuccess={handleArchiveSuccess}
            onFallbackToDragDrop={handleArchiveFallback}
            onRelogin={handleArchiveRelogin}
          />
        );
      case 'DRAG_DROP':
        return (
          <LinkedInDragDropFallback
            onSuccess={handleDragDropSuccess}
            onError={handleDragDropError}
          />
        );
    }
  }, [currentStep, handleArchiveFallback, handleArchiveRelogin, handleArchiveSuccess, handleCaptchaRequired, handleDragDropError, handleDragDropSuccess, handleLoginSuccess, handleVerificationRequired, handleVerificationRestart, handleVerificationSuccess, linkedInUsername, preservedUsername, sessionId]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Import LinkedIn Data</DialogTitle>
      <DialogContent>
        {renderStep()}
      </DialogContent>
      <DialogActions>
        {renderButtons()}
        <Button onClick={handleClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}