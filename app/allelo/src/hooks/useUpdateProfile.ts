import {useCallback, useState} from 'react';
import {useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {nextgraphDataService} from "@/services/nextgraphDataService";
import {SocialContact} from "@/.ldo/contact.typings";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {dataService} from "@/services/dataService.ts";

interface UseUpdateProfileReturn {
  updateProfile: (profile: Partial<SocialContact>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useUpdateProfile(): UseUpdateProfileReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, changeData} = useLdo();

  const isNextGraph = isNextGraphEnabled();

  const updateProfile = useCallback(async (profile: Partial<SocialContact>) => {
    if (isNextGraph && !session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isNextGraph) {
        await nextgraphDataService.updateProfile(session, profile, changeData, commitData);
      } else {
        await dataService.updateProfile(profile);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isNextGraph, session, changeData, commitData]);

  return {
    updateProfile,
    isLoading,
    error
  };
}