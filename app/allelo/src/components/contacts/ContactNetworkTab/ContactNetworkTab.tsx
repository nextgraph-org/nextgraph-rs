import { Box } from '@mui/material';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { NetworkGraph } from '@/components/network/NetworkGraph';
import { NetworkContactProbe } from '@/components/network/NetworkContactProbe';
import { useContacts } from '@/hooks/contacts/useContacts';
import { useNetworkGraph } from '@/hooks/network/useNetworkGraph';
import { Contact } from '@/types/contact';

export const ContactNetworkTab = () => {
  const { contactNuris } = useContacts({ limit: 0 });
  const [contactsByNuri, setContactsByNuri] = useState<Record<string, Contact>>({});
  const [debouncedContacts, setDebouncedContacts] = useState<Contact[]>([]);

  // Callback for when each contact loads
  const handleContactLoaded = useCallback((nuri: string, contact: Contact | undefined) => {
    if (!contact) {
      // Contact failed to load - don't add it to the graph
      return;
    }

    // Always update - create a new object to trigger React updates
    // This ensures changes to contact properties (like name) trigger re-renders
    setContactsByNuri(prev => ({ ...prev, [nuri]: contact }));
  }, []);

  // Convert contact map to array
  const contacts = useMemo(() => Object.values(contactsByNuri), [contactsByNuri]);

  // Debounce contact updates to reduce re-renders and improve performance
  useEffect(() => {
    if (contacts.length === 0) {
      setDebouncedContacts([]);
      return;
    }

    // Use shorter debounce for more responsive updates
    const timer = setTimeout(() => {
      setDebouncedContacts(contacts);
    }, 100); // Wait 100ms after last contact update

    return () => clearTimeout(timer);
  }, [contacts]);

  // Build the network graph from loaded contacts
  useNetworkGraph({ maxNodes: 30, contacts: debouncedContacts });

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Render probes to load contact data */}
      {contactNuris.map(nuri => (
        <NetworkContactProbe key={nuri} nuri={nuri} onContact={handleContactLoaded} />
      ))}

      <NetworkGraph />
    </Box>
  );
};