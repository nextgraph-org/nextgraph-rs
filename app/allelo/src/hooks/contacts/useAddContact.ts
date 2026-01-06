import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useCallback, useEffect, useState} from "react";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {contactService} from "@/services/contactService.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {getContactGraph} from "@/utils/socialContact/contactUtilsOrm.ts";
import {socialContactSetProperties} from "@/.orm/utils/contact.utils.ts";

interface AddContactData {
  draftContact: SocialContact | undefined;
  isLoading: boolean;
  error: Error | null;
  saveContact: () => void;
  resetContact: () => void;
}

export const useAddContact = (): AddContactData => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [draftContactId, setDraftContactId] = useState<string | undefined>();

  const {ormContact: draftContact} = useContactOrm(draftContactId);

  const {createContact} = useSaveContacts();
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const createDraftContact = useCallback(async () => {

    const contact: SocialContact = {
      "@graph": "",
      "@id": "",
      "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"]),
      isDraft: true
    }

    socialContactSetProperties.forEach((propertyKey) => {
      contact[propertyKey] = new Set<any>();
    })


    await createContact(contact)
    if (!contact) {
      setError('Failed to create draft contact');
    } else {
      setDraftContactId(contact["@graph"]);
    }
  }, [createContact])

  const loadDraftContact = useCallback(async () => {
    try {
      if (!session) {
        setError('No active session available');
        setIsLoading(false);
        return;
      }
      const contactId = await contactService.getDraftContactId(session);
      if (!contactId) {
        await createDraftContact();
      } else {
        setDraftContactId(getContactGraph(contactId, session));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft contact');
    }
    setIsLoading(false);
  }, [createDraftContact, session]);

  useEffect(() => {
    loadDraftContact();
  }, [loadDraftContact]);

  const saveContact = useCallback(async () => {
    if (!draftContact) return;
    await contactService.updateContactDocHeader(draftContact, session);
    draftContact.isDraft = false;
    setDraftContactId(undefined);
  }, [draftContact, session]);

  const resetContact = useCallback(() => {
    if (!draftContact) return;
    contactService.resetDraftContact(draftContact);
  }, [draftContact]);

  return {
    draftContact,
    isLoading,
    error,
    saveContact,
    resetContact
  }
}