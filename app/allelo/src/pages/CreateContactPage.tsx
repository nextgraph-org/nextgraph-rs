import {ContactInfo, ContactViewHeader} from "@/components/contacts";
import {UilArrowLeft, UilRedo, UilSave} from "@iconscout/react-unicons";
import {Box, Button, CircularProgress, Divider, Grid, Paper, Typography} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {useCallback, useEffect, useState} from "react";
import {useAddContact} from "@/hooks/contacts/useAddContact.ts";

const CreateContactPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const {draftContact, error, isLoading, saveDraftContact, resetContact} = useAddContact();

  useEffect(() => {
    setIsValid((draftContact?.name?.size ?? 0) > 0);
  }, [draftContact]);

  const addContact = useCallback(async () => {
    if (!draftContact || !isValid)//TODO validation
      return;
    setLoading(true);
    saveDraftContact();
    navigate(`/contacts/${draftContact!["@graph"]}`);
  }, [draftContact, isValid, navigate, saveDraftContact]);

  const handleBack = async () => {
    navigate("/contacts");
  };

  return (
    <Box sx={{p: {xs: 0, md: 3}, backgroundColor: 'background.paper'}}>
      <Button
        startIcon={<UilArrowLeft size="20"/>}
        onClick={handleBack}
        sx={{mb: 3}}
      >
        Back to Contacts
      </Button>
      {
        error ? (
          <Box sx={{textAlign: 'center', py: 8}}>
            <Typography variant="h6" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error.message}
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            gap: 2
          }}>
            <CircularProgress size={48}/>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Loading...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait
            </Typography>
          </Box>
        ) : <Paper sx={{p: {xs: 2, md: 3}, mb: 3, backgroundColor: 'background.default'}}>
          <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0}}>
            <Box sx={{display: 'block', gap: 1}}>
              <Button
                style={{float: 'right'}}
                variant={"text"}
                startIcon={<UilRedo size="20"/>}
                onClick={resetContact}
                disabled={loading}
              >
                Reset
              </Button>
            </Box>
            <Box>
              <Button
                style={{float: 'right'}}
                variant={"text"}
                startIcon={<UilSave size="20"/>}
                onClick={addContact}
                loading={loading}
                disabled={!isValid}
              >
                Save
              </Button>
            </Box>
          </Box>

          <ContactViewHeader
            contact={draftContact!}
            isEditing={!loading}
            showStatus={false}
            showTags={false}
            showActions={false}
            validateParent={setIsValid}
          />

          <Divider sx={{my: 3}}/>

          <Grid container spacing={3}>
            <Grid size={{xs: 12, md: 12}}>
              <ContactInfo contact={draftContact!} isEditing={!loading}/>
            </Grid>
          </Grid>

          <Divider sx={{my: 3}}/>
        </Paper>
      }
    </Box>
  );
}

export default CreateContactPage;