import {forwardRef, MutableRefObject, useCallback, useMemo} from 'react';
import {Card, CardContent, useTheme} from '@mui/material';
import {
  UilCheckCircle,
  UilSchedule,
  UilMessage,
} from '@iconscout/react-unicons';
import {ContactCardDetailed} from './ContactCardDetailed';
import {iconFilter} from "@/hooks/contacts/useContacts";
import {useContactData} from "@/hooks/contacts/useContactData";
import {useDraggable} from "@dnd-kit/core";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";

export interface ContactCardProps {
  nuri: string;
  isSelectionMode: boolean;
  onContactClick: (contactId: string) => void;
  onSetIconFilter: (key: iconFilter, value: string) => void;
  getDragContactIds?: (primaryContact: string) => string[];
  inManageMode?: boolean;
}

export const ContactCard = forwardRef<HTMLDivElement, ContactCardProps>(
  ({
     nuri,
     isSelectionMode,
     onContactClick,
     onSetIconFilter,
     getDragContactIds,
     inManageMode
   }, ref) => {
    const theme = useTheme();
    const {contact, resource} = useContactData(nuri);
    const draggedContactIds = useMemo(
      () => (getDragContactIds ? getDragContactIds(nuri) : [nuri]),
      [getDragContactIds, nuri]
    );

    const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
      id: nuri,
      disabled: !inManageMode,
      data: {
        type: 'contact',
        contactIds: draggedContactIds,
      },
    });

    const handleRef = useCallback((node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as MutableRefObject<HTMLDivElement | null>).current = node;
      }
    }, [ref, setNodeRef]);

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

    //TODO: investigate why do we have empty contacts sometimes
    const name = resolveFrom(contact, 'name');
    if (!name) {
      return ;
    }

    return (
      <Card
        ref={handleRef} {...(!isSelectionMode ? listeners : {})} {...(!isSelectionMode ? attributes : {})}
        onClick={() => {
          onContactClick(resource ? resource.uri! : '');
        }}
        sx={{
          border: 1,
          borderColor: 'divider',
          width: '100%',
          opacity: isDragging ? 0.3 : 1,
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
            contact={contact}
            resource={resource}
            getNaoStatusIcon={getNaoStatusIcon}
            onSetIconFilter={onSetIconFilter}
          />
        </CardContent>
      </Card>
    );
  }
);

ContactCard.displayName = 'ContactCard';
