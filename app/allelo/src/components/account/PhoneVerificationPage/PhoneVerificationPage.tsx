import React, {useState, useCallback, useEffect, useMemo} from "react";
import GreenCheck from "@/lib/greencheck-api-client";
import {
  Container,
  Box,
  Stepper,
  Step,
  StepLabel, FormControlLabel, Typography, Paper, Switch
} from "@mui/material";
import {GreenCheckClaim} from "@/lib/greencheck-api-client/types";
import PhoneInput from "./PhoneInput";
import CodeInput from "./CodeInput";
import PhoneVerificationSuccess from "./PhoneVerificationSuccess";
import {useParams} from "react-router-dom";
import {useSettings} from "@/hooks/useSettings.ts";
import {useGreenCheck} from "@/hooks/useGreenCheck.ts";

interface PhoneVerificationProps {
  onError?: (error: Error) => void;
}

type VerificationState = 'phone-input' | 'code-input' | 'success';

export const PhoneVerificationPage = ({
                                        onError,
                                      }: PhoneVerificationProps) => {
  const {settings, updateSettings} = useSettings();
  const {phone} = useParams<{ phone: string }>();
  const [state, setState] = useState<VerificationState>('phone-input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [claims, setClaims] = useState<GreenCheckClaim[]>([]);
  const [greenCheckId, setGreenCheckId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const {verified} = useGreenCheck();
  const [claimOtherPlatforms, setClaimOtherPlatforms] = useState(true);

  const token =
    import.meta.env.VITE_GREENCHECK_TOKEN
    ?? (typeof process !== 'undefined' ? process.env.GREENCHECK_TOKEN : 'temp-token');

  const client = useMemo(() => new GreenCheck({authToken: token}), [token]);

  const steps = ['Enter Phone', 'Verify Code'];
  const activeStep = state === 'phone-input' ? 0 : 1;

  useEffect(() => {
    setPhoneNumber(phone ?? "");
  }, [phone]);

  useEffect(() => {
    if (verified) {
      setClaimOtherPlatforms(false);
    }

  }, [verified]);

  useEffect(() => {
    if (settings?.greencheckToken) {
      client.getGreenCheckIdFromToken(settings.greencheckToken).then((el) => {
        setGreenCheckId(el);
        setState("success");
        client.setCurrentAuthToken(settings.greencheckToken!);
      }).catch(() => setState("phone-input"));
    }
  }, [client, settings]);

  const handleClaimOtherPlatformsToggle = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setClaimOtherPlatforms(newValue);
  }, []);

  const handlePhoneSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await client.requestPhoneVerification(phoneNumber);
      if (success) {
        setState('code-input');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, client, onError]);

  const handleCodeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authSession = await client.verifyPhoneCode(phoneNumber, verificationCode);
      setGreenCheckId(authSession.greenCheckId);

      await updateSettings({greencheckId: authSession.greenCheckId, greencheckToken: authSession.authToken});

      if (claimOtherPlatforms) {
        const userClaims = await client.getClaims(authSession.authToken);
        setClaims(userClaims);
      }
      setState('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, client, phoneNumber, claimOtherPlatforms, updateSettings, onError]);

  const handleStartOver = useCallback(() => {
    setState('phone-input');
    setPhoneNumber("");
    setVerificationCode('');
    setError(null);
    setClaims([]);
    setGreenCheckId('');
  }, []);

  return (
    <Container maxWidth="md" sx={{p: {xs: 0, md: 2}}}>
      <Box sx={{mb: 4}}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {state === 'phone-input' && (
        <PhoneInput
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          isLoading={isLoading}
          error={error}
          onSubmit={handlePhoneSubmit}
        />
      )}

      {state === 'code-input' && (
        <CodeInput
          phoneNumber={phoneNumber}
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          isLoading={isLoading}
          error={error}
          onSubmit={handleCodeSubmit}
          onBack={handleStartOver}
        />
      )}

      {state === 'success' && (
        <PhoneVerificationSuccess
          phoneNumber={phoneNumber}
          greenCheckId={greenCheckId}
          claims={claims}
          client={client}
        />
      )}

      {state === 'phone-input' && <Paper variant="outlined" sx={{mt: 1, p: 1}}>
        <FormControlLabel
          control={
            <Switch
              checked={claimOtherPlatforms}
              onChange={handleClaimOtherPlatformsToggle}
            />
          }
          label={
            <Box>
              <Typography variant="caption" color="text.secondary">
                Verify and claim your accounts from other platforms via GreenCheck
              </Typography>
            </Box>
          }
        />
      </Paper>}
    </Container>
  );
};