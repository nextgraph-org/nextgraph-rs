import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {contactService} from "@/services/contactService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useEffect, useRef, useState} from "react";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";

interface UpdateContactData {
  updateContact: (contactId: string, updates: Partial<SocialContact>) => void;
}

export const useUpdateContact = (): UpdateContactData => {
  const [contactId, setContactId] = useState<string>();
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {ormContact} = useContactOrm(contactId);
  const currentChangesRef = useRef<Partial<SocialContact> | undefined>(undefined);

  useEffect(() => {
    if (contactId && ormContact && currentChangesRef.current) {
      contactService.persistSocialContact(session, currentChangesRef.current, ormContact).then(() => {
        currentChangesRef.current = undefined;
      });
      setContactId(undefined);
    }
  }, [contactId, ormContact, session]);

  const updateContact = async (contactId: string, updates: Partial<SocialContact>) => {
    currentChangesRef.current = updates;
    setContactId(contactId);
  };

  return {
    updateContact
  }
}