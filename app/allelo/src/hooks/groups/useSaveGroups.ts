import {useCallback, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialGroup} from "@/.orm/shapes/group.typings";
import {useShape} from "@ng-org/signals/react";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";

interface UseSaveGroupsReturn {
  createGroup: (group: Partial<SocialGroup>) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveGroups(): UseSaveGroupsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;

  const groups = useShape(SocialGroupShapeType)

  function generateUri(base: string) {
    const b = new Uint8Array(33);
    crypto.getRandomValues(b);

    // Convert to base64url
    const base64url = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const randomString = base64url(b);

    return base.substring(0, 9 + 44) + ":p:" + randomString;
  }

  const createGroup = useCallback(async (group: Partial<SocialGroup>): Promise<string> => {
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

      const groupObj: SocialGroup = {
        "@graph": docId,
        "@id": generateUri(docId),
        "@type": "did:ng:x:social:group#Group",
        ...group
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
