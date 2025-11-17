import {useContactData} from "@/hooks/contacts/useContactData";
import {useEffect} from "react";
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

  // Track whether contact has name to trigger updates when name loads
  const hasName = contact?.name ? true : false;

  useEffect(() => {
    onContact(nuri, contact);
  }, [nuri, contact, onContact, hasName]);

  return null;
}
