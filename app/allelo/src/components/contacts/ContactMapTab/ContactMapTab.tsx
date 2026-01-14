import {Box, Typography, CircularProgress} from "@mui/material";
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
  } = useContacts({
    limit: 0,
    initialFilters: {
      "hasAddressFilter": true
    }
  });

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
      onMergeContacts={() => {}}
      onAutomaticDeduplication={() => {}}
      onAssignRCard={() => {}}
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
    ) : !isLoading && contactNuris.length === 0 ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No contacts with coordinates to display on map
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
          isNuriLoading={isLoading}
          contactNuris={contactNuris}
          onContactClick={(contact) => {
            navigate(`/contacts/${contact["@graph"]}`);
          }}
        />
      </Box>
    )}
  </Box>
}