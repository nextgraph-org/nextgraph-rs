import {forwardRef} from 'react';
import {Card, CardContent, useTheme} from '@mui/material';
import {
  UilCheckCircle,
  UilSchedule,
  UilMessage,
} from '@iconscout/react-unicons';
import {ContactCardDetailed} from './ContactCardDetailed';
import {iconFilter} from "@/hooks/contacts/useContacts";
import {useResolvedContact} from "@/hooks/contacts/useResolvedContact.ts";

export interface ContactCardProps {
  nuri: string;
  onContactClick: (contactId: string) => void;
  onSetIconFilter: (key: iconFilter, value: string) => void;
  inManageMode?: boolean;
}

export const ContactCard = forwardRef<HTMLDivElement, ContactCardProps>(
  ({
     nuri,
     onContactClick,
     onSetIconFilter,
   }) => {
    const theme = useTheme();
    const {ormContact, name} = useResolvedContact(nuri);

    const getNaoStatusIcon = (naoStatus?: string) => {
      switch (naoStatus) {
        case 'member':
          return <UilCheckCircle size="16" color={theme.palette.success.main}/>;
        case 'invited':
          return <UilSchedule size="16" color={theme.palette.text.disabled} style={{opacity: 0.7}}/>;
        case 'not_invited':
        default:
          return <UilMessage size="16" color={theme.palette.primary.main}/>;
      }
    };

    if (!name) {
      return ;
    }

    return (
      <Card
        onClick={() => {
          onContactClick(ormContact["@graph"]);
        }}
        sx={{
          border: 1,
          borderColor: 'divider',
          width: '100%',
          opacity: 1,
          boxShadow: theme.shadows[1],
          cursor: 'pointer'
        }}
      >
        <CardContent sx={{
          p: {xs: '3px', md: 0.5},
          '&:last-child': {
            pb: {xs: '3px', md: 0.5},
          }
        }}>
          <ContactCardDetailed
            contact={ormContact}
            getNaoStatusIcon={getNaoStatusIcon}
            onSetIconFilter={onSetIconFilter}
          />
        </CardContent>
      </Card>
    );
  }
);

ContactCard.displayName = 'ContactCard';
