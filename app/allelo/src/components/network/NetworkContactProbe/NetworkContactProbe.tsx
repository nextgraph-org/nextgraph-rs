import {useEffect, useRef} from "react";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";

/**
 * Invisible component that loads contact data for a single NURI
 * Similar to ContactProbe but optimized for network graph use
 */
export function NetworkContactProbe({
  nuri,
  onContact,
}: {
  nuri: string;
  onContact: (nuri: string, contact: SocialContact | undefined) => void;
}) {
  const {ormContact} = useContactOrm(nuri);
  const lastContactRef = useRef<SocialContact | undefined>(undefined);

  useEffect(() => {
    if (ormContact !== lastContactRef.current) {
      lastContactRef.current = ormContact;
      onContact(nuri, ormContact);
    }
  }, [nuri, ormContact, onContact]);

  return null;
}
