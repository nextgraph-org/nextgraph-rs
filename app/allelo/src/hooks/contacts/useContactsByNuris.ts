import { useEffect, useState } from 'react';
import { Contact } from '@/types/contact';
import { isNextGraphEnabled } from '@/utils/featureFlags';
import { useNextGraphAuth } from '@/lib/nextgraph';
import { NextGraphAuth } from '@/types/nextgraph';
import { dataService } from '@/services/dataService';
import { dataset } from '@/lib/nextgraph';
import { SocialContactShapeType } from '@/.ldo/contact.shapeTypes';

/**
 * Hook to fetch multiple contacts by their NURIs
 * Used by network graph and other components that need bulk contact data
 */
export const useContactsByNuris = (nuris: string[]) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const { session } = nextGraphAuth;
  const sessionId = session?.sessionId;

  useEffect(() => {
    if (!nuris || nuris.length === 0) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    const fetchContacts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!isNextGraph) {
          // Mock mode - fetch from dataService
          const allContacts = await dataService.getContacts();
          const filteredContacts = allContacts.filter(c => nuris.includes(c['@id'] || ''));
          setContacts(filteredContacts);
        } else {
          // NextGraph mode - use LDO dataset to fetch contacts
          if (!sessionId) {
            setContacts([]);
            setIsLoading(false);
            return;
          }

          const fetchedContacts: Contact[] = [];

          for (const nuri of nuris) {
            try {
              // Extract the base URI without the overlay
              const baseUri = nuri.substring(0, 53);

              // Get the contact from the LDO dataset
              const socialContact = dataset
                .usingType(SocialContactShapeType)
                .fromSubject(baseUri);

              if (socialContact && socialContact['@id']) {
                fetchedContacts.push(socialContact as Contact);
              }
            } catch (err) {
              console.warn(`Failed to fetch contact ${nuri}:`, err);
            }
          }

          console.log(`📊 useContactsByNuris - Fetched ${fetchedContacts.length} contacts from ${nuris.length} NURIs`);
          setContacts(fetchedContacts);
        }
      } catch (err) {
        console.error('Error fetching contacts by NURIs:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch contacts'));
        setContacts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [JSON.stringify(nuris), isNextGraph, sessionId]);

  return { contacts, isLoading, error };
};
