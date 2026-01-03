import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes";
import {useShape} from "@ng-org/orm/react";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useEffect} from "react";

export const useContactOrm = (
  nuri: string | null | undefined,
  isProfile = false,
  onContact?: (nuri?: string | null, ormContact?: SocialContact) => void | Promise<void>
): { ormContact: SocialContact } => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  if (isProfile) {
    nuri = "did:ng:" + session?.protectedStoreId;
  }

  const ormContacts = useShape(SocialContactShapeType, nuri ? nuri : undefined);
  const objects = [...(ormContacts || [])];
  const ormContact = objects[0] as SocialContact;

  useEffect(() => {
    if (onContact) {
      onContact(nuri, ormContact);
    }
  }, [nuri, ormContact, onContact]);

  return {ormContact};
};
