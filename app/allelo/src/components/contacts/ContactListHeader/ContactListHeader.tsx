import { Typography, Box } from '@mui/material';
import { Button } from '@/components/ui';
import { Add, CloudDownload, QrCode } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface ContactListHeaderProps {
  isSelectionMode: boolean;
  mode?: string | null;
  selectedContactsCount: number;
}

export const ContactListHeader = ({ 
  isSelectionMode, 
  mode,
  selectedContactsCount 
}: ContactListHeaderProps) => {
  const navigate = useNavigate();

  const handleAddContact = () => {
    navigate('/contacts/create');
  };

  const handleInvite = () => {
    navigate('/invite');
  };

  const getTitle = () => {
    if (mode === 'create-group') return 'Select Group Members';
    if (mode === 'invite') return 'Select Contact to Invite';
    if (isSelectionMode) return 'Select Contact to Invite';
    return 'Contacts';
  };

  const getSubtitle = () => {
    if (isSelectionMode) {
      if (mode === 'create-group') {
        return `Choose contacts to add to your new group ${selectedContactsCount > 0 ? `(${selectedContactsCount} selected)` : ''}`;
      }
      return 'Choose a contact from your network to invite to the group';
    }
    return null;
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'row',
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: { xs: 1, md: 1 },
      gap: 1,
      width: '100%',
      overflow: 'hidden',
      minWidth: 0
    }}>
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden', display: { xs: "none", md: "block"} }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            mb: { xs: 0, md: 0 },
            fontSize: { xs: '1.5rem', md: '2.125rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {getTitle()}
        </Typography>
        {getSubtitle() && (
          <Typography variant="body2" color="text.secondary">
            {getSubtitle()}
          </Typography>
        )}
      </Box>
      {!isSelectionMode && (
        <>
          {/* Desktop Button Layout */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' },
            gap: 1,
            justifyContent: 'flex-end'

          }}>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={() => navigate('/import')}
              sx={{ borderRadius: 2 }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<QrCode />}
              onClick={handleInvite}
              sx={{ borderRadius: 2 }}
            >
              Invite
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddContact}
              sx={{ borderRadius: 2 }}
            >
              Add Contact
            </Button>
          </Box>
          
          {/* Mobile Button Layout */}
          <Box sx={{ 
            display: { xs: 'flex', md: 'none' },
            gap: 1,
            width: '100%',
            height: 60,
            alignItems: 'center',
            py: 1
          }}>
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={() => navigate('/import')}
              fullWidth
              sx={{ 
                borderRadius: 2,
                height: 44,
                fontSize: '0.8rem'
              }}
            >
              Import
            </Button>
            <Button
              variant="outlined"
              startIcon={<QrCode />}
              onClick={handleInvite}
              fullWidth
              sx={{ 
                borderRadius: 2,
                height: 44,
                fontSize: '0.8rem'
              }}
            >
              Invite
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddContact}
              fullWidth
              sx={{ 
                borderRadius: 2,
                height: 44,
                fontSize: '0.8rem'
              }}
            >
              Add
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};