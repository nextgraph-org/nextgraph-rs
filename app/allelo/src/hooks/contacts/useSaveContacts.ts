import {useCallback, useState, useEffect, useRef} from 'react';
import {useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {nextgraphDataService} from "@/services/nextgraphDataService";
import {Contact} from "@/types/contact";
import {dataService} from "@/services/dataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {useShape} from "@ng-org/orm/react";

interface UseSaveContactsReturn {
  saveContacts: (contacts: Contact[], onProgress?: (current: number, total: number) => void) => Promise<void>;
  createContact: (contact: Contact) => Promise<Contact | undefined>;
  updateContact: (contactId: string, updates: Partial<Contact>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveContacts(): UseSaveContactsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(undefined);
  const currentContactRef = useRef<Contact | undefined>(undefined);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, createData, changeData} = useLdo();

  const isNextGraph = isNextGraphEnabled();

  const contactsSet = useShape(SocialContactShapeType, currentDocId);

  function generateUri(base: string) {
    return base.substring(0, 9 + 44);
  }

  const saveContacts = useCallback(async (contacts: Contact[], onProgress?: (current: number, total: number) => void) => {
    if (isNextGraph && !session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isNextGraph) {
        const startTime = Date.now();
        console.log(`Starting to save ${contacts.length} contacts...`);

        const rCardId = await nextgraphDataService.getRCardId(session);

        for (let i = 0; i < contacts.length; i++) {
          const docId = await session.ng!.doc_create(
            session.sessionId,
            "Graph",
            "data:graph",
            "store"
          );

          contacts[i]["@graph"] = docId;
          contacts[i]["@id"] = generateUri(docId);
          contacts[i].rcard = rCardId;

          currentContactRef.current = contacts[i];
          setCurrentDocId(docId);

          onProgress?.(i + 1, contacts.length);

          if ((i + 1) % 30 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            const contactsPerSecond = ((i + 1) / (Date.now() - startTime) * 1000).toFixed(2);
            console.log(`✓ Saved ${i + 1}/${contacts.length} contacts | ${elapsed}s elapsed | ${contactsPerSecond} contacts/sec`);
          }
        }

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        const avgSpeed = (contacts.length / (Date.now() - startTime) * 1000).toFixed(2);
        console.log(`✅ Completed saving ${contacts.length} contacts in ${totalTime}s | Average: ${avgSpeed} contacts/sec`);
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
  }, [isNextGraph, session]);

  useEffect(() => {
    if (currentDocId && contactsSet && currentContactRef.current) {
      contactsSet.add(currentContactRef.current);
    }
  }, [currentDocId, contactsSet]);

  const createContact = useCallback(async (contact: Contact): Promise<Contact | undefined> => {
    if (!session || !session.ng) {
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
        await nextgraphDataService.updateContact(session, contactId.substring(0, 53), updates, commitData, changeData);
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