import {useContactData} from "@/hooks/contacts/useContactData";
import {useEffect} from "react";
import {Contact} from "@/types/contact";

export function ContactProbe({
                               nuri,
                               onContact,
                             }: { nuri: string; onContact: (nuri: string, contact: Contact | undefined) => void }) {
  const {contact} = useContactData(nuri);
  useEffect(() => {
    onContact(nuri, contact);
  }, [nuri, contact, onContact]);
  return null;
}