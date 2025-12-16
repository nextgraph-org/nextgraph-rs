import {useCallback, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {GroupMembership, SocialGroup} from "@/.orm/shapes/group.typings";
import {useShape} from "@ng-org/signals/react";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";

interface UseSaveGroupsReturn {
  createGroup: (group: Partial<SocialGroup>, membersNuris: string[], adminNuri: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveGroups(): UseSaveGroupsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;

  const groups = useShape(SocialGroupShapeType);


  function generateUri(base: string) {
    return base.substring(0, 9 + 44);
  }

  const createGroup = useCallback(async (group: Partial<SocialGroup>, membersNuris: string[], adminNuri: string): Promise<string> => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const docId = await session.ng.doc_create(
        session.sessionId,
        "Graph",
        "data:graph",
        "store"
      );

      const id = generateUri(docId);

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
      })

      const groupObj: SocialGroup = {
        "@graph": docId,
        "@id": id,
        "@type": "did:ng:x:social:group#Group",
        "title": group.title ?? "",
        "description": group.description,
        "tag": group.tag,
        "hasMember": new Set(members),
      }

      groups?.add(groupObj);

      return docId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [groups, session]);

  return {
    createGroup,
    isLoading,
    error
  };
}
