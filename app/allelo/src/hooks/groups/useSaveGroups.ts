import {useCallback, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {GroupMembership, SocialGroup} from "@/.orm/shapes/group.typings";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";
import {getShortId} from "@/utils/orm/ormUtils.ts";
import {insertObject} from "../../../../../sdk/js/orm";

interface UseSaveGroupsReturn {
  createGroup: (group: Partial<SocialGroup>, membersNuris: string[], adminNuri: string) => Promise<SocialGroup>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveGroups(): UseSaveGroupsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;

  const createGroup = useCallback(async (group: Partial<SocialGroup>, membersNuris: string[], adminNuri: string): Promise<SocialGroup> => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const docId = await session.ng.doc_create(
        session.sessionId!,
        "Graph",
        "data:graph",
        "store"
      );

      const id = getShortId(docId);

      const members: GroupMembership[] = membersNuris.map(nuri => {
        return {
          "@id": "",
          "@graph": "",
          contactId: nuri,
          memberStatus: "did:ng:k:contact:memberStatus#invited"
        }
      });

      members.push({
        "@id": "",
        "@graph": "",
        contactId: adminNuri,
        memberStatus: "did:ng:k:contact:memberStatus#joined",
        isAdmin: true,
        joinDate: (new Date()).toISOString()
      })

      const groupObj: SocialGroup = {
        "@graph": docId,
        "@id": id,
        "@type": new Set(["did:ng:x:social:group#Group"]),
        "title": group.title ?? "",
        "description": group.description,
        "hasMember": new Set(members),
        "tag": group.tag,
        "createdAt": (new Date()).toISOString()
      }

      await insertObject(SocialGroupShapeType, groupObj);

      return groupObj;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  return {
    createGroup,
    isLoading,
    error
  };
}
