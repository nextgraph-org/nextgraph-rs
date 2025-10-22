import {useParams, useNavigate, useLocation} from 'react-router-dom';
import {useState, useEffect} from 'react';
import {
  Typography,
  Box,
  Paper,
  Divider,
  Grid,
  Card,
  CardContent,
  Alert,
  Skeleton,
  alpha,
  useTheme,
  Button
} from '@mui/material';
import {
  ArrowBack,
  Edit
} from '@mui/icons-material';
import {
  ContactViewHeader,
  ContactInfo,
  ContactDetails,
  ContactGroups,
  ContactActions,
  RejectedVouchesAndPraises
} from '@/components/contacts';
import {resolveFrom} from '@/utils/socialContact/contactUtils.ts';
import {useContactView} from "@/hooks/contacts/useContactView";
import {VouchesAndPraises} from "@/components/contacts/VouchesAndPraises";
import {dataService} from "@/services/dataService";
import {Block, CheckCircle} from '@mui/icons-material';

const ContactViewPage = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [isBlocked, setIsBlocked] = useState(false);
  const [vouchesRefreshKey, setVouchesRefreshKey] = useState(0);

  const {
    contact,
    contactGroups,
    isLoading,
    error,
    toggleHumanityVerification,
    inviteToNAO,
    refreshContact
  } = useContactView(id || null);

  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (id) {
      // Always check current blocked state, especially when navigating from notifications
      const currentlyBlocked = dataService.isContactBlocked(id);
      setIsBlocked(currentlyBlocked);
      
      // Refresh data when navigating from notifications
      if (location.state?.from === 'notifications') {
        setVouchesRefreshKey(prev => prev + 1);
        refreshContact(); // Refresh contact data to get updated status
      }
    }
  }, [id, location.state, refreshContact]);

  // Also refresh blocked state when the page becomes visible (in case it was changed elsewhere)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && id) {
        setIsBlocked(dataService.isContactBlocked(id));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [id]);

  const handleRefreshVouches = () => {
    setVouchesRefreshKey(prev => prev + 1);
  };

  const handleBack = () => {
    if (location.state?.from === 'notifications') {
      navigate('/notifications');
    } else {
      navigate('/contacts');
    }
  };

  const handleInviteToNAO = () => {
    inviteToNAO();
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleUnblock = () => {
    if (id) {
      dataService.unblockContact(id);
      setIsBlocked(false);
    }
  };

  const handleConnect = async () => {
    if (id) {
      try {
        await dataService.sendConnectionRequest(id);
        // Show success message or navigate back
        alert(`Connection request sent to ${resolveFrom(contact, 'name')?.value || 'contact'}!`);
        handleBack();
      } catch (error) {
        console.error('Failed to send connection request:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <Box sx={{height: '100%', p: {xs: 2, md: 3}, backgroundColor: 'background.default'}}>
        <Box sx={{display: 'flex', alignItems: 'center', mb: 3}}>
          <Skeleton variant="circular" width={40} height={40}/>
          <Skeleton variant="text" width={200} height={40} sx={{ml: 2}}/>
        </Box>
        <Paper sx={{p: {xs: 2, md: 3}}}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 3,
            flexDirection: {xs: 'column', sm: 'row'},
            textAlign: {xs: 'center', sm: 'left'}
          }}>
            <Skeleton variant="circular" width={120} height={120} sx={{mb: {xs: 2, sm: 0}}}/>
            <Box sx={{ml: {xs: 0, sm: 3}, flex: 1}}>
              <Skeleton variant="text" width={200} height={40}/>
              <Skeleton variant="text" width={300} height={24}/>
              <Skeleton variant="text" width={250} height={24}/>
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (error || !contact) {
    return (
      <Box sx={{height: '100%', p: {xs: 2, md: 3}, backgroundColor: 'background.default'}}>
        <Button
          startIcon={<ArrowBack/>}
          onClick={handleBack}
          sx={{mb: 3}}
        >
          {location.state?.from === 'notifications' ? 'Back to Notifications' : 'Back to Contacts'}
        </Button>
        <Alert severity="error">
          {error || 'Contact not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{p: {xs: 2, md: 3}, backgroundColor: 'background.default'}}>
      <Button
        startIcon={<ArrowBack/>}
        onClick={handleBack}
        sx={{mb: 3}}
      >
        {location.state?.from === 'notifications' ? 'Back to Notifications' : 'Back to Contacts'}
      </Button>
      
      {isBlocked && contact && (
        <Alert 
          severity="warning"
          icon={<Block />}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                onClick={handleUnblock}
                variant="outlined"
              >
                Unblock
              </Button>
            </Box>
          }
          sx={{ mb: 3 }}
        >
          You have blocked this contact. Connection requests from {resolveFrom(contact, 'name')?.value || 'this contact'} are currently blocked.
        </Alert>
      )}
      
      {!isBlocked && location.state?.from === 'notifications' && contact?.naoStatus?.value === 'pending' && (
        <Alert 
          severity="info"
          action={
            <Button 
              size="small" 
              onClick={handleConnect}
              startIcon={<CheckCircle />}
              variant="contained"
              color="primary"
            >
              Send Connection Request
            </Button>
          }
          sx={{ mb: 3 }}
        >
          You can now send a connection request to {resolveFrom(contact, 'name')?.value || 'this contact'}.
        </Alert>
      )}
      
      <Paper sx={{p: {xs: 2, md: 3}, mb: 3, backgroundColor: 'background.default'}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
          <Typography variant="h6" sx={{fontWeight: 600}}>
            Contact Information
          </Typography>
          <Button
            variant={"text"}
            startIcon={<Edit/>}
            onClick={handleEditToggle}
          >
            {isEditing ? "Exit" : "Edit"}
          </Button>
        </Box>

        <ContactViewHeader
          contact={contact}
          isLoading={isLoading}
          isEditing={isEditing}
        />

        <Divider sx={{my: 3}}/>

        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <ContactInfo contact={contact} isEditing={isEditing}/>
            <ContactGroups groups={contactGroups}/>
          </Grid>

          <Grid size={{xs: 12, md: 6}}>
            <ContactDetails
              contact={contact}
              onHumanityToggle={toggleHumanityVerification}
            />
          </Grid>
        </Grid>

        <Divider sx={{my: 3}}/>

        {/* Contact Actions */}
        <ContactActions
          contact={contact}
          onInviteToNAO={handleInviteToNAO}
          onConfirmHumanity={toggleHumanityVerification}
        />

        {/* Merged Contact Details Section */}
        {(contact["@id"] === '1' || contact["@id"] === '3' || contact["@id"] === '5') && (
          <Box sx={{mb: 3}}>
            <Typography variant="h6" sx={{fontWeight: 600, mb: 2}}>
              Merged Contact Details
            </Typography>

            <Card variant="outlined">
              <CardContent sx={{p: 3}}>
                <Typography variant="body1" gutterBottom>
                  This contact was created by merging the following duplicate contacts:
                </Typography>

                <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 2}}>
                  <Box sx={{
                    display: 'flex',
                    gap: 2,
                    p: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.04),
                    borderRadius: 2
                  }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'primary.main',
                        color: 'white',
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}
                    >
                      {resolveFrom(contact, 'name')?.value?.charAt(0) || '?'}
                    </Box>
                    <Box sx={{minWidth: 0}}>
                      <Typography variant="body2" sx={{fontWeight: 600}}>
                        LinkedIn Import - {resolveFrom(contact, 'name')?.value || 'Unknown'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Imported from LinkedIn
                        • {resolveFrom(contact, 'organization')?.position || ''} at {resolveFrom(contact, 'organization')?.value || ''}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.04),
                  borderRadius: 2,
                  border: 1,
                  borderColor: alpha(theme.palette.success.main, 0.12)
                }}>
                  <Typography variant="body2" color="success.main" sx={{fontWeight: 500, mb: 0.5}}>
                    Merge completed successfully
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Combined contact information, removed duplicates, and preserved all data sources.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Vouches and Praises Section */}
        <VouchesAndPraises 
          contact={contact} 
          onInviteToNAO={handleInviteToNAO}
          refreshTrigger={vouchesRefreshKey}
        />
        
        {/* Rejected Vouches and Praises Section */}
        <RejectedVouchesAndPraises 
          contact={contact} 
          onAcceptanceChanged={handleRefreshVouches}
        />
      </Paper>
    </Box>
  );
};

export default ContactViewPage;