import {useContactData} from "@/hooks/contacts/useContactData";
import {useEffect, useRef} from "react";
import {Contact} from "@/types/contact";

/**
 * Invisible component that loads contact data for a single NURI
 * Similar to ContactProbe but optimized for network graph use
 */
export function NetworkContactProbe({
  nuri,
  onContact,
}: {
  nuri: string;
  onContact: (nuri: string, contact: Contact | undefined) => void;
}) {
  const {contact} = useContactData(nuri);
  const lastContactRef = useRef<Contact | undefined>(undefined);

  useEffect(() => {
    if (contact !== lastContactRef.current) {
      lastContactRef.current = contact;
      onContact(nuri, contact);
    }
  }, [nuri, contact, onContact]);

  return null;
}
