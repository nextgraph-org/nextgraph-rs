import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import { UilArrowLeft } from '@iconscout/react-unicons';
import { dataService } from '@/services/dataService';
import type { Group } from '@/types/group';
import type { Contact } from '@/types/contact';
import { InvitationDetails } from './InvitationDetails';
import { InvitationActions } from './InvitationActions';
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";

export interface InvitationPageProps {
  className?: string;
}

export const InvitationPage = forwardRef<HTMLDivElement, InvitationPageProps>(
  ({ className }, ref) => {
    const [invitationUrl, setInvitationUrl] = useState('');
    const [personalizedInvite, setPersonalizedInvite] = useState<{
      inviteeName?: string;
      inviterName?: string;
      relationshipType?: string;
    }>({});
    const [copySuccess, setCopySuccess] = useState(false);
    const [invitationId, setInvitationId] = useState('');
    const [group, setGroup] = useState<Group | null>(null);
    const [isGroupInvite, setIsGroupInvite] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
      const loadGroupAndGenerateInvitation = async () => {
        const groupId = searchParams.get('groupId');
        
        const inviterName = searchParams.get('inviterName');
        const relationshipType = searchParams.get('relationshipType');
        
        setPersonalizedInvite({
          inviterName: inviterName || undefined,
          relationshipType: relationshipType || undefined,
        });

        let isExistingMember = false;
        let inviteeName = '';

        const inviteeNuri = searchParams.get("inviteeNuri");
        if (inviteeNuri) {
          try {
            const contact = (await dataService.getContact(inviteeNuri))!;
            inviteeName = resolveFrom(contact, "name")?.value || "";
            if (contact?.naoStatus?.value === 'member') {
              isExistingMember = true;
              console.log(`${inviteeName} NAO status:`, contact.naoStatus);
            }
            setPersonalizedInvite(prev => ({
              ...prev,
              inviteeName: inviteeName,
              inviteeEmail: contact.email
            }));
          } catch (error) {
            console.error('Failed to fetch contact:', error);
          }
        }

        if (groupId) {
          setIsGroupInvite(true);
          try {
            const groupData = await dataService.getGroup(groupId);
            setGroup(groupData || null);
          } catch (error) {
            console.error('Failed to load group:', error);
          }
        }

        const id = Math.random().toString(36).substring(2, 15);
        setInvitationId(id);

        const urlParams = new URLSearchParams({
          invite: id,
          ...(groupId && { groupId }),
          ...(inviteeName && { inviteeName }),
          ...(inviterName && { inviterName }),
          ...(relationshipType && { relationshipType }),
          ...(isExistingMember && { existingMember: 'true' }),
        });

        const url = `${window.location.origin}/onboarding?${urlParams.toString()}`;
        setInvitationUrl(url);
      };

      loadGroupAndGenerateInvitation();
    }, [searchParams]);

    const handleCopyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(invitationUrl);
        setCopySuccess(true);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    const handleShare = async () => {
      if (navigator.share) {
        try {
          const inviterName = personalizedInvite.inviterName || 'Oli S-B';
          const title = isGroupInvite ? `Join ${group?.name}` : `Join ${inviterName}'s Network`;
          const text = isGroupInvite 
            ? (personalizedInvite.inviteeName 
                ? `Hi ${personalizedInvite.inviteeName}, I'd like to invite you to join the ${group?.name} Group on the NAO network!`
                : `I'd like to invite you to join the ${group?.name} Group on the NAO network - collaborate and stay connected!`)
            : `I'd like to invite you to join my personal network!`;
          
          await navigator.share({
            title,
            text,
            url: invitationUrl,
          });
        } catch (err) {
          console.error('Error sharing:', err);
        }
      } else {
        handleCopyToClipboard();
      }
    };

    const handleEmailShare = () => {
      const inviteeName = personalizedInvite.inviteeName;
      
      const subject = isGroupInvite 
        ? encodeURIComponent(`Join me in the ${group?.name} Group`)
        : encodeURIComponent(`Join my network on NAO`);
      
      const greeting = inviteeName ? `Hi ${inviteeName},\n\n` : 'Hi!\n\n';
      const body = isGroupInvite
        ? encodeURIComponent(`${greeting}I'd like to invite you to join the ${group?.name} Group on the NAO network.\n\nClick here to join: ${invitationUrl}\n\nLooking forward to connecting!`)
        : encodeURIComponent(`${greeting}I'd like to add you to my personal network.\n\nClick here to join: ${invitationUrl}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    };

    const handleWhatsAppShare = () => {
      const inviteeName = personalizedInvite.inviteeName;
      
      const greeting = inviteeName ? `Hi ${inviteeName}! ` : 'Hi! ';
      const text = isGroupInvite
        ? encodeURIComponent(`${greeting}I'd like to invite you to join the ${group?.name} Group on the NAO network. Join here: ${invitationUrl}`)
        : encodeURIComponent(`${greeting}I'd like to invite you to join my network: ${invitationUrl}`);
      window.open(`https://wa.me/?text=${text}`);
    };

    const handleSMSShare = () => {
      const inviteeName = personalizedInvite.inviteeName;
      
      const greeting = inviteeName ? `Hi ${inviteeName}! ` : 'Hi! ';
      const text = isGroupInvite
        ? encodeURIComponent(`${greeting}I'd like to invite you to join the ${group?.name} Group on the NAO network. Join: ${invitationUrl}`)
        : encodeURIComponent(`${greeting}I'd like to invite you to join my network: ${invitationUrl}`);
      window.open(`sms:?body=${text}`);
    };

    const handleDownloadQR = () => {
      const svg = document.querySelector('#qr-code-svg') as SVGElement;
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          const pngFile = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.download = 'network-invitation-qr.png';
          downloadLink.href = pngFile;
          downloadLink.click();
        };
        
        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
      }
    };

    const handleNewInvitation = async () => {
      const groupId = searchParams.get('groupId');
      const inviteeName = searchParams.get('inviteeName');
      const inviterName = searchParams.get('inviterName');
      const relationshipType = searchParams.get('relationshipType');
      
      const id = Math.random().toString(36).substring(2, 15);
      setInvitationId(id);
      
      let isExistingMember = false;
      if (inviteeName) {
        try {
          const contacts: Contact[] = await dataService.getContacts();
          const contact = contacts.find(c => {
            const name = resolveFrom(c, "name");
            const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);
            return displayName?.toLowerCase() === inviteeName.toLowerCase()
            }
          );
          
          if (contact) {
            isExistingMember = contact?.naoStatus?.value === 'member';
          }
        } catch (error) {
          console.error('Failed to check contacts:', error);
        }
      }
      
      const urlParams = new URLSearchParams({
        invite: id,
        ...(groupId && { groupId }),
        ...(inviteeName && { inviteeName }),
        ...(inviterName && { inviterName }),
        ...(relationshipType && { relationshipType }),
        ...(isExistingMember && { existingMember: 'true' }),
      });
      
      const url = `${window.location.origin}/onboarding?${urlParams.toString()}`;
      setInvitationUrl(url);
    };

    const handleBack = () => {
      if (isGroupInvite && group) {
        navigate(`/groups/${group.id}?newMember=true&fromInvite=true`);
      } else {
        navigate('/contacts');
      }
    };

    return (
      <Container ref={ref} maxWidth="md" sx={{ py: 4 }} className={className}>
        {/* Back Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={handleBack} size="large">
            <UilArrowLeft size="20" />
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            {isGroupInvite ? `Back to ${group?.name}` : 'Back to Contacts'}
          </Typography>
        </Box>

        <InvitationDetails
          personalizedInvite={personalizedInvite}
          group={group}
          isGroupInvite={isGroupInvite}
        />

        <InvitationActions
          invitationUrl={invitationUrl}
          invitationId={invitationId}
          personalizedInvite={personalizedInvite}
          group={group}
          isGroupInvite={isGroupInvite}
          onCopyToClipboard={handleCopyToClipboard}
          onShare={handleShare}
          onEmailShare={handleEmailShare}
          onWhatsAppShare={handleWhatsAppShare}
          onSMSShare={handleSMSShare}
          onDownloadQR={handleDownloadQR}
          onNewInvitation={handleNewInvitation}
        />

        <Snackbar
          open={copySuccess}
          autoHideDuration={3000}
          onClose={() => setCopySuccess(false)}
        >
          <Alert
            onClose={() => setCopySuccess(false)}
            severity="success"
            sx={{ width: '100%' }}
          >
            Invitation link copied to clipboard!
          </Alert>
        </Snackbar>
      </Container>
    );
  }
);

InvitationPage.displayName = 'InvitationPage';