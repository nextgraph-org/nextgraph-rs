import {
  Typography,
  Box,
  Button,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {UilUserMinus} from '@iconscout/react-unicons';
import {useResolvedContact} from "@/stores/contactOrmStore.ts";
import {ContactCardAvatarOrm} from "@/components/contacts/ContactCardAvatar";

export interface MemberListItemProps {
  memberNuri: string;
  isCurrentUserAdmin: boolean;
  isLastItem: boolean;
  onRemoveMember: (nuri: string, name: string) => void;
}

export const MemberListItem = ({
                                 memberNuri,
                                 isCurrentUserAdmin,
                                 isLastItem,
                                 onRemoveMember,
                               }: MemberListItemProps) => {
  const {name, ormContact} = useResolvedContact(memberNuri);

  return (
    <ListItem
      sx={{
        px: 0,
        py: 1,
        borderBottom: isLastItem ? 'none' : '1px solid',
        borderColor: 'divider',
      }}
    >
      <ListItemAvatar>
        <ContactCardAvatarOrm contact={ormContact} size={{xs: 48, sm: 48}}/>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              <Typography variant="subtitle1" sx={{fontWeight: 600}}>
                {name}
              </Typography>
              {/*{member.role === 'Admin' && (
                <Chip
                  label="Admin"
                  size="small"
                  color="primary"
                  sx={{height: 20, fontSize: '0.7rem'}}
                />
              )}*/}
            </Box>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              {/*{member.status && (
                <Chip
                  label={member.status}
                  size="small"
                  color={member.status === 'Member' ? 'success' : 'warning'}
                  variant={member.status === 'Member' ? 'filled' : 'outlined'}
                  sx={{height: 20, fontSize: '0.7rem'}}
                />
              )}*/}
              {isCurrentUserAdmin && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<UilUserMinus size="20"/>}
                  onClick={() => {
                    onRemoveMember(ormContact["@graph"], name)
                  }}
                  sx={{
                    height: 20,
                    fontSize: '0.6rem',
                    minWidth: 'auto',
                    px: 1,
                    py: 0,
                    borderColor: 'error.main',
                    color: 'error.main',
                    '&:hover': {
                      borderColor: 'error.dark',
                      backgroundColor: 'error.light'
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Box>
        }
        secondary={
          <Typography variant="body2" color="text.secondary">
            {/*{member.status === 'Invited' ? 'Invitation sent' : `Joined ${member.joinedAt ? formatDate(member.joinedAt, {
              month: "short",
              hour: undefined,
              minute: undefined
            }) : 'Unknown'}`}*/}
          </Typography>
        }
      />
    </ListItem>
  );
};