import {useCallback, useState} from 'react';
import {useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {nextgraphDataService} from "@/services/nextgraphDataService";
import {Contact} from "@/types/contact";
import {dataService} from "@/services/dataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";

interface UseSaveContactsReturn {
  saveContacts: (contacts: Contact[]) => Promise<void>;
  createContact: (contact: Contact) => Promise<Contact | undefined>;
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveContacts(): UseSaveContactsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, createData, changeData} = useLdo();

  const isNextGraph = isNextGraphEnabled();

  const saveContacts = useCallback(async (contacts: Contact[]) => {
    if (isNextGraph && !session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isNextGraph) {
        await nextgraphDataService.saveContacts(session!, contacts, createData, commitData, changeData);
      } else {
        await dataService.addContacts(contacts);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save contacts';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, createData, commitData, changeData, isNextGraph]);

  const createContact = useCallback(async (contact: Contact): Promise<Contact | undefined> => {
    if (!session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      contact["@id"] = await nextgraphDataService.createContact(session, contact, createData, commitData, changeData);
      return contact;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save contacts';
      setError(errorMsg);
    }
  }, [session, createData, commitData, changeData]);


  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    try {
      if (isNextGraph) {
        await nextgraphDataService.updateContact(session, contactId, updates, commitData, changeData);
      } else {
        await dataService.updateContact(contactId, updates);
      }
    } catch (error) {
      console.error(`❌ Failed to persist contact update for ${contactId}:`, error);
    }
  };

  return {
    saveContacts,
    createContact,
    updateContact,
    isLoading,
    error
  };
}