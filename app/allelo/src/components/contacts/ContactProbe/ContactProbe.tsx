import {useEffect} from "react";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";

export function ContactProbe({
                               nuri,
                               onContact,
                             }: {
  nuri: string;
  onContact: (nuri: string, contact: SocialContact | undefined) => void
}) {
  const {ormContact} = useContactOrm(nuri);
  useEffect(() => {
    onContact(nuri, ormContact);
  }, [nuri, ormContact, onContact]);
  return null;
}