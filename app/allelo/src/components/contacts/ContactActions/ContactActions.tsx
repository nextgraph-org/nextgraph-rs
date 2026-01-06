import {forwardRef} from 'react';
import {
  Box,
  Button,
} from '@mui/material';
import {
  UilPlus,
} from '@iconscout/react-unicons';
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactActionsProps {
  contact?: SocialContact | null;
  onInviteToNAO?: () => void;
}

export const ContactActions = forwardRef<HTMLDivElement, ContactActionsProps>(
  ({contact, onInviteToNAO}, ref) => {

    if (!contact) return null;


    return (
      <Box ref={ref}>
        {/* Main Action Buttons */}
        <Box sx={{display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3}}>
          {contact.naoStatus === 'not_invited' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<UilPlus size="20"/>}
              onClick={onInviteToNAO}
            >
              Invite to NAO
            </Button>
          )}
        </Box>
      </Box>
    );
  }
);

ContactActions.displayName = 'ContactActions';