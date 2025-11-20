import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { UilArrowLeft } from '@iconscout/react-unicons';
import type { Group } from '@/types/group';
import { InvitationDetails } from './InvitationDetails';
import { InvitationActions } from './InvitationActions';
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";

export interface InvitationPageProps {
  className?: string;
}

export const InvitationPage = forwardRef<HTMLDivElement, InvitationPageProps>(
  ({ className }, ref) => {
    const [group, setGroup] = useState<Group | null>(null);
    const [isGroupInvite, setIsGroupInvite] = useState(false);
    const navigate = useNavigate();
    const [isSetup, setIsSetup] = useState(false);

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
          group={group}
          isGroupInvite={isGroupInvite}
        />

        <Box sx={{ my: 3, display: 'flex', justifyContent: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isSetup}
                onChange={(e) => setIsSetup(e.target.checked)}
              />
            }
            label="I vouch this is a real person"
          />
        </Box>

        {isSetup && <InvitationActions
          group={group}
          isGroupInvite={isGroupInvite}
          onDownloadQR={handleDownloadQR}
          onNewInvitation={handleNewInvitation}
        />}
      </Container>
    );
  }
);

InvitationPage.displayName = 'InvitationPage';