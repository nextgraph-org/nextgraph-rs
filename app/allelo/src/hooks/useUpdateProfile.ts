import {useCallback, useState} from 'react';
import {useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {nextgraphDataService} from "@/services/nextgraphDataService";
import {SocialContact} from "@/.ldo/contact.typings";

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

  const updateProfile = useCallback(async (profile: Partial<SocialContact>) => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      await nextgraphDataService.updateProfile(session, profile, changeData, commitData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, changeData, commitData]);

  return {
    updateProfile,
    isLoading,
    error
  };
}