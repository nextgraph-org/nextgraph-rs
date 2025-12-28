import {useCallback, useMemo, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph.ts';
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useUpdatePermission} from "@/hooks/rCards/useUpdatePermission.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {profileService} from "@/services/profileService.ts";
import {useShape} from "@ng-org/orm/react";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {getShortId} from "@/utils/orm/ormUtils.ts";
import {contactService} from "@/services/contactService.ts";

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

  const scope = useMemo(() => session?.protectedStoreId ? "did:ng:" + session.protectedStoreId : undefined, [session]);

  const contactSet = useShape(SocialContactShapeType, scope);
  const profile = [...contactSet][0] as SocialContact;

  const {updateProfilePermissionNodes} = useUpdatePermission(undefined, true);

  const updateProfile = useCallback(async (profileData: Partial<SocialContact>) => {
    if (!session) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      if (profile) {
        await contactService.persistSocialContact(session, profileData, profile);
        //in case user hasn't finished creating profile, but imported it from linkedin for example
        delete profile.isDraft;
      } else {
        const isProfileCreated = await profileService.isProfileCreated(session);
        if (!isProfileCreated) {
          const newProfile: Partial<SocialContact> = {
            "@graph": scope,
            "@id": getShortId(scope!),
            "@type": new Set(["did:ng:x:contact:class#Me", "http://www.w3.org/2006/vcard/ns#Individual"]),
          }
          await contactService.persistSocialContact(session, profileData, newProfile as SocialContact);
          contactSet.add(newProfile);
        }
      }

      updateProfilePermissionNodes();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [contactSet, profile, scope, session, updateProfilePermissionNodes]);

  return {
    updateProfile,
    isLoading,
    error
  };
}