import {Box, Typography, CircularProgress} from "@mui/material";
import {ContactFilters} from "../ContactFilters";
import {ContactMap} from "@/components/ContactMap";
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {useNavigate} from "react-router-dom";
import {ShortSocialContactShapeType} from "@/.orm/shapes/shortcontact.shapeTypes.ts";
import {useEffect, useState} from "react";
import {ShortSocialContact} from "@/.orm/shapes/shortcontact.typings.ts";
import {getObjects} from "../../../../../../sdk/js/orm";


export const ContactMapTab = () => {
  const {
    contactNuris,
    isLoading,
    error,
    filters,
    addFilter,
    clearFilters,
  } = useContacts({
    limit: 0,
    initialFilters: {
      "hasAddressFilter": true
    }
  });

  const [contacts, setContacts] = useState<ShortSocialContact[]>([]);

  useEffect(() => {
    const loadContacts = async () => {
      const contactsSet = await getObjects(ShortSocialContactShapeType, {graphs: contactNuris});
      const contactsArray = [...contactsSet ?? []];
      setContacts(contactsArray);
    };

    loadContacts();
  }, [contactNuris]);

  const navigate = useNavigate();

  return <Box sx={{
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <ContactFilters
      filters={filters}
      onAddFilter={addFilter}
      onClearFilters={clearFilters}
      showFilters={false}
      onMergeContacts={() => {
      }}
    />
    {error ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="error" gutterBottom>
          Error loading contacts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error.message}
        </Typography>
      </Box>
    ) : !isLoading && contacts.length === 0 ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No contacts to display on map
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Import some contacts to see your map!
        </Typography>
      </Box>
    ) : (
      <Box sx={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        height: "100%"
      }}>
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 500, display: 'flex', gap: 1, alignItems: 'center' }}>
          {isLoading && (
            <CircularProgress size={20} sx={{ color: 'primary.main' }} />
          )}
        </Box>
        <ContactMap
          contacts={contacts}
          onContactClick={(contact) => {
            navigate(`/contacts/${contact["@graph"]}`);
          }}
        />
      </Box>
    )}
  </Box>
}