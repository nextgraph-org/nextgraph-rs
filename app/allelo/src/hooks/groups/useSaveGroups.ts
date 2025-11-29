import {useCallback, useState} from 'react';
import {useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {groupService} from "@/services/groupService";
import {SocialGroup} from "@/.ldo/group.typings";

interface UseSaveGroupsReturn {
  createGroup: (group: Partial<SocialGroup>) => Promise<SocialGroup | undefined>;
  updateGroup: (group: SocialGroup, updates: Partial<SocialGroup>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveGroups(): UseSaveGroupsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, createData, changeData} = useLdo();

  const createGroup = useCallback(async (group: Partial<SocialGroup>): Promise<SocialGroup | undefined> => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const groupUri = await groupService.createGroup(session, group, createData, commitData, changeData);
      if (groupUri) {
        return {
          ...group,
          "@id": groupUri
        } as SocialGroup;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, createData, commitData, changeData]);

  const updateGroup = useCallback(async (group: SocialGroup, updates: Partial<SocialGroup>) => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      await groupService.updateGroup(session, group, updates, commitData, changeData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, commitData, changeData]);

  return {
    createGroup,
    updateGroup,
    isLoading,
    error
  };
}
