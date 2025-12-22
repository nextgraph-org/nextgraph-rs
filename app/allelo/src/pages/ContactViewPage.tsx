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
import {VouchesAndPraises} from "@/components/contacts/VouchesAndPraises";
import {useResolvedContact} from "@/stores/contactOrmStore";

const ContactViewPage = () => {
  const {id} = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vouchesRefreshKey, setVouchesRefreshKey] = useState(0);

  const [isEditing, setIsEditing] = useState(false);

  const {ormContact: contact} = useResolvedContact(id);
  
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

  if (!contact) {
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
          {'Contact not found'}
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
          isEditing={isEditing}
        />

        <Divider sx={{my: 3}}/>

        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 6}}>
            {/*TODO<ContactInfo contact={contact} isEditing={isEditing} resource={resource}/>*/}
            {/*<ContactGroups groupsNuris={contactGroupsNuris ?? []}/>*/}
          </Grid>

          <Grid size={{xs: 12, md: 6}}>
            {/*TODO: <ContactDetails
              contact={contact}
              onHumanityToggle={toggleHumanityVerification}
            />*/}
          </Grid>
        </Grid>

        <Divider sx={{my: 3}}/>

        {/*TODO:<ContactActions
          contact={contact}
          onInviteToNAO={handleInviteToNAO}
          onConfirmHumanity={toggleHumanityVerification}
        />

        <VouchesAndPraises
          contact={contact} 
          onInviteToNAO={handleInviteToNAO}
          refreshTrigger={vouchesRefreshKey}
        />
        
        <RejectedVouchesAndPraises
          contact={contact} 
          onAcceptanceChanged={handleRefreshVouches}
        />*/}
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