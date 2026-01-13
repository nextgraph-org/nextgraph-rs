import {useCallback, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {rCardService} from "@/services/rCardService.ts";
import {contactService} from "@/services/contactService.ts";
import {insertObject, OrmConnection} from "@ng-org/orm";
import {getShortId} from "@/utils/orm/ormUtils.ts";

interface UseSaveContactsReturn {
  saveContacts: (contacts: SocialContact[], onProgress?: (current: number, total: number) => void) => Promise<void>;
  saveContact: (contact: SocialContact) => Promise<SocialContact | undefined>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveContacts(): UseSaveContactsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;


  const createContactDocument = useCallback(async (contact: SocialContact, rCardId?: string): Promise<SocialContact | undefined> => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      rCardId ??= await rCardService.getRCardId(session);

      const docId = await session.ng!.doc_create(
        session.sessionId!,
        "Graph",
        "data:graph",
        "store"
      );

      // @ts-expect-error @graph shouldn't be readonly
      contact["@graph"] = docId;
      // @ts-expect-error @id shouldn't be readonly
      contact["@id"] = getShortId(docId);

      contact.rcard ??= rCardId;

      await contactService.updateContactDocHeader(contact, session);

      return contact;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save contacts';
      setError(errorMsg);
    }
  }, [session]);

  const saveContact = useCallback(async (contactData: SocialContact) => {
    const contact = await createContactDocument(contactData);

    if (contact) {
      await insertObject(SocialContactShapeType, contact)
    }

    return contact;
  }, [createContactDocument]);

  const saveContacts = useCallback(async (contacts: SocialContact[], onProgress?: (current: number, total: number) => void) => {
    if (!session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      console.log(`Starting to save ${contacts.length} contacts...`);

      const rCardId = await rCardService.getRCardId(session);
      const connection = OrmConnection.getOrCreate(SocialContactShapeType, {graphs: ["did:ng:" + session.privateStoreId!]});
      connection.beginTransaction();

      for (let i = 0; i < contacts.length; i++) {
        const contact = await createContactDocument(contacts[i], rCardId);

        if (contact) {
          connection.signalObject.add(contact);
        }

        onProgress?.(i + 1, contacts.length);

        if ((i + 1) % 30 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          const contactsPerSecond = ((i + 1) / (Date.now() - startTime) * 1000).toFixed(2);
          console.log(`✓ Saved ${i + 1}/${contacts.length} contacts | ${elapsed}s elapsed | ${contactsPerSecond} contacts/sec`);
        }
      }
      await connection.commitTransaction();
      connection.close();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const avgSpeed = (contacts.length / (Date.now() - startTime) * 1000).toFixed(2);
      console.log(`✅ Completed saving ${contacts.length} contacts in ${totalTime}s | Average: ${avgSpeed} contacts/sec`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save contacts';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [createContactDocument, session]);

  return {
    saveContacts,
    saveContact,
    isLoading,
    error
  };
}