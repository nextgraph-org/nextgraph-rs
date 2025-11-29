import {useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialGroup} from "@/.ldo/group.typings.ts";
import {SocialGroupShapeType} from "@/.ldo/group.shapeTypes.ts";

export const useGroupData = (nuri: string | null | undefined) => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  const resource = useResource(sessionId && nuri ? nuri : undefined, {subscribe: true});

  const group: SocialGroup | undefined = useSubject(
    SocialGroupShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  return {group, resource};
};
