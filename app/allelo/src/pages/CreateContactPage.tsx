import {ContactInfo, ContactViewHeader } from "@/components/contacts";
import {UilArrowLeft, UilRedo, UilSave} from "@iconscout/react-unicons";
import {Box, Button, Divider, Grid, Paper} from "@mui/material";
import {useNavigate} from "react-router-dom";
import {dataService} from "@/services/dataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {useCallback, useEffect, useState} from "react";
import {Contact} from "@/types/contact.ts";
import {contactCommonProperties, contactLdSetProperties} from "@/utils/socialContact/contactUtils.ts";

const CreateContactPage = () => {
  const navigate = useNavigate();
  const isNextgraph = isNextGraphEnabled();
  const {createContact} = useSaveContacts();
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<Contact>();
  const [isValid, setIsValid] = useState(true);

  const initContact = useCallback(async () => {
    const draftContact = await dataService.getDraftContact();
    setIsValid((draftContact?.name?.size ?? 0) > 0);//TODO for now just checking name
    setContact(draftContact);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;

      await initContact();
    })();

    return () => {
      cancelled = true;
    };
  }, [initContact]);

  const saveContact = useCallback(async () => {
    if (!contact)//TODO validation
      return;
    setLoading(true);
    delete contact.isDraft;

    //ldo issue
    if (isNextgraph) {
      contactLdSetProperties.forEach(propertyKey => {
        (contact[propertyKey]?.toArray() as any[]).forEach(el => delete el["@id"]);
      });
      contactCommonProperties.forEach(propertyKey => {
        if (contact[propertyKey]) {
          delete (contact[propertyKey] as any)["@id"];
        }
      });
    }

    const newContact = !isNextgraph ? await dataService.addContact(contact) : await createContact(contact);
    navigate(`/contacts/${newContact!["@id"]}`);
    dataService.removeDraftContact();
  }, [contact, createContact, isNextgraph, navigate]);

  const resetContact = useCallback(() => {
    dataService.removeDraftContact();
    initContact();
  }, [initContact])

  const handleBack = async () => {
    navigate("/contacts");
  };

  return (
    <Box sx={{p: {xs: 2, md: 3}, backgroundColor: 'background.paper'}}>
      <Button
        startIcon={<UilArrowLeft size="20"/>}
        onClick={handleBack}
        sx={{mb: 3}}
      >
        Back to Contacts
      </Button>
      <Paper sx={{p: {xs: 2, md: 3}, mb: 3, backgroundColor: 'background.default'}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
          <Box></Box>
          <Box sx={{display: 'flex', gap: 1}}>
            <Button
              variant={"text"}
              startIcon={<UilRedo size="20"/>}
              onClick={resetContact}
              disabled={loading}
            >
              Reset
            </Button>
            <Button
              variant={"text"}
              startIcon={<UilSave size="20"/>}
              onClick={saveContact}
              loading={loading}
              disabled={!isValid}
            >
              Save
            </Button>
          </Box>
        </Box>

        <ContactViewHeader
          contact={contact!}
          isLoading={false}
          isEditing={!loading}
          showStatus={false}
          showTags={false}
          showActions={false}
          validateParent={setIsValid}
        />

        <Divider sx={{my: 3}}/>

        <Grid container spacing={3}>
          <Grid size={{xs: 12, md: 12}}>
            <ContactInfo contact={contact!} isEditing={!loading}/>
          </Grid>
        </Grid>

        <Divider sx={{my: 3}}/>
      </Paper>
    </Box>
  );
}

export default CreateContactPage;