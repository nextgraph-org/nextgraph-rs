import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes";
import {useShape} from "@ng-org/orm/react";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export const useContactOrm = (nuri: string | null | undefined, isProfile = false): { ormContact: SocialContact } => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  if (isProfile) {
    nuri = "did:ng:" + session?.protectedStoreId;
  }

  const ormContacts = useShape(SocialContactShapeType, nuri ? nuri : undefined);
  const objects = [...(ormContacts || [])];
  const ormContact = objects[0] as SocialContact;

  return {ormContact};
};
