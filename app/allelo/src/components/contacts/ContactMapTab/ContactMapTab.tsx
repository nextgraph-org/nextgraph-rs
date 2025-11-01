import {Box, Typography} from "@mui/material";
import {ContactFilters} from "../ContactFilters";
import {ContactMap} from "@/components/ContactMap";
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {useNavigate} from "react-router-dom";


export const ContactMapTab = () => {
  const {
    contactNuris,
    isLoading,
    error,
    filters,
    addFilter,
    clearFilters,
  } = useContacts({limit: 0});

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
    ) : isLoading ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Loading map...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Building your contact map view
        </Typography>
      </Box>
    ) : contactNuris.length === 0 ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No contacts to map
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
        <ContactMap
          contactNuris={contactNuris}
          onContactClick={(contact) => {
            navigate(`/contacts/${contact["@id"]}`);
          }}
        />
      </Box>
    )}
  </Box>
}