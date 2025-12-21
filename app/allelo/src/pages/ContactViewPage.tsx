import {useParams, useNavigate} from 'react-router-dom';
import {useState} from 'react';
import {
  Box,
  Paper,
  Divider,
  Grid,
  Alert,
  Skeleton,
  Button
} from '@mui/material';
import {
  UilArrowLeft as ArrowBack,
  UilEdit
} from '@iconscout/react-unicons';
import {
  ContactViewHeader,
  ContactInfo,
  ContactDetails,
  ContactActions,
  RejectedVouchesAndPraises
} from '@/components/contacts';
import {useContactView} from "@/hooks/contacts/useContactView";
import {VouchesAndPraises} from "@/components/contacts/VouchesAndPraises";
import {NextGraphResource} from "@ldo/connected-nextgraph";
// import {useResolvedContact} from "@/stores/contactOrmStore.ts";

const ContactViewPage = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vouchesRefreshKey, setVouchesRefreshKey] = useState(0);

  const [isEditing, setIsEditing] = useState(false);

  const {
    contact,
    isLoading,
    error,
    toggleHumanityVerification,
    resource
  } = useContactView(id || null/*, refreshKey*/);
  // const {ormContact} = useResolvedContact(resource ? resource["uri"] : null);
  
  const handleRefreshVouches = () => {
    setVouchesRefreshKey(prev => prev + 1);
  };

  const handleBack = () => {
      navigate('/contacts');
  };

  const handleInviteToNAO = () => {
    //TODO: ?
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
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

  if (error || !contact || !(resource instanceof NextGraphResource)) {
    return (
      <Box sx={{height: '100%', p: {xs: 2, md: 3}, backgroundColor: 'background.default'}}>
        <Button
          startIcon={<ArrowBack size="20"/>}
          onClick={handleBack}
          sx={{mb: 3}}
        >
          Back to Contacts
        </Button>
        <Alert severity="error">
          {error || 'Contact not found'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{p: {xs: 0, md: 3}, backgroundColor: 'background.paper'}}>
      <Button
        startIcon={<ArrowBack size="20"/>}
        onClick={handleBack}
        sx={{mb: 3}}
      >
        Back to Contacts
      </Button>
      
      <Paper sx={{p: {xs: 1, md: 3}, mb: 3, backgroundColor: 'background.default'}}>
        <ContactViewHeader
          contact={contact}
          isLoading={isLoading}
          isEditing={isEditing}
          resource={resource}
          // ormContact={ormContact}
        />

        <Divider sx={{my: 3}}/>

        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            <ContactInfo contact={contact} isEditing={isEditing} resource={resource}/>
            {/*<ContactGroups groupsNuris={contactGroupsNuris ?? []}/>*/}
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

      <Box sx={{
        display: {xs: 'block', md: 'block'},
        position: 'fixed',
        top: 10,
        right: 16,
        zIndex: 1000,
      }}>
        {!isEditing ? (
          <Button
            variant="contained"
            startIcon={<UilEdit size="20"/>}
            onClick={handleEditToggle}
          >
            Edit
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<UilEdit size="20"/>}
            onClick={handleEditToggle}
          >
            Done editing
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ContactViewPage;