import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContactShapeType as Shape} from "@/.orm/shapes/contact.shapeTypes";
import {useShape} from "@ng-org/signals/react";

export const useContactOrm = (nuri: string | null | undefined, isProfile = false) => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  if (isProfile) {
    nuri = "did:ng:" + session?.protectedStoreId;
  }

  const ormContacts = useShape(Shape, nuri ? nuri : undefined);
  const objects = [...(ormContacts || [])];
  const ormContact = objects[0];

  return {ormContact};
};
