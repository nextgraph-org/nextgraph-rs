import {forwardRef} from 'react';
import {Card, CardContent, useTheme} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Send,
} from '@mui/icons-material';
import {ContactCardDetailed} from './ContactCardDetailed';
import type {UseContactDragDropReturn} from '@/hooks/contacts/useContactDragDrop';
import {iconFilter} from "@/hooks/contacts/useContacts";
import {useContactData} from "@/hooks/contacts/useContactData";


export interface ContactCardProps {
  nuri: string;
  isSelectionMode: boolean;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  onContactClick: (contactId: string) => void;
  onSelectContact: (contactId: string) => void;
  dragDrop?: UseContactDragDropReturn;
  onSetIconFilter: (key: iconFilter, value: string) => void;
}

export const ContactCard = forwardRef<HTMLDivElement, ContactCardProps>(
  ({
     nuri,
     isSelectionMode,
     onContactClick,
     dragDrop,
     onSetIconFilter
   }, ref) => {
    const theme = useTheme();
    const {contact} = useContactData(nuri);

    const getNaoStatusIcon = (naoStatus?: string) => {
      switch (naoStatus) {
        case 'member':
          return <CheckCircle sx={{fontSize: 16, color: '#388e3c'}}/>;
        case 'invited':
          return <Schedule sx={{fontSize: 16, color: '#9e9e9e', opacity: 0.7}}/>;
        case 'not_invited':
        default:
          return <Send sx={{fontSize: 16, color: '#1976d2'}}/>;
      }
    };

    return (
      <Card
        ref={ref}
        draggable={!isSelectionMode}
        onDragStart={(e) => dragDrop?.handleDragStart(e, nuri)}
        onDragEnd={dragDrop?.handleDragEnd}
        onClick={() => onContactClick(contact ? contact['@id']! : '')}
        sx={{
          cursor: (isSelectionMode) ? 'default' : 'pointer',
          transition: 'all 0.2s ease-in-out',
          border: 1,
          borderColor: 'divider',
          '&:hover': (!isSelectionMode) ? {
            borderColor: 'primary.main',
            boxShadow: theme.shadows[2],
            transform: 'translateY(-1px)',
          } : {},
          position: 'relative',
          width: '100%',
        }}
      >
        <CardContent sx={{
          p: {xs: '8px 16px', md: 0.5},
          '&:last-child': {
            pb: 0.5
          }
        }}>
          <ContactCardDetailed
            contact={contact}
            getNaoStatusIcon={getNaoStatusIcon}
            onSetIconFilter={onSetIconFilter}
          />
        </CardContent>
      </Card>
    );
  }
);

ContactCard.displayName = 'ContactCard';