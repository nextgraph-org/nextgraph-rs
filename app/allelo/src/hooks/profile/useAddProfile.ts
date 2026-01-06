import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {contactService} from "@/services/contactService.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {socialContactSetProperties} from "@/.orm/utils/contact.utils.ts";
import {getShortId} from "@/utils/orm/ormUtils.ts";
import {useShape} from "@ng-org/orm/react";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {profileService} from "@/services/profileService.ts";

interface AddContactData {
  profile: SocialContact | undefined;
  isLoading: boolean;
  error: Error | null;
  saveProfile: () => void;
  resetProfile: () => void;
}

export const useAddProfile = (): AddContactData => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const scope = useMemo(() => session?.protectedStoreId ? "did:ng:" + session.protectedStoreId : undefined, [session]);

  const contactSet = useShape(SocialContactShapeType, scope);
  const profile = [...contactSet][0] as SocialContact;

  const createDraftProfile = useCallback(async () => {
    if (profile) {
      return;
    } else {
      const newProfile: SocialContact = {
        "@graph": scope!,
        "@id": getShortId(scope!),
        "@type": new Set(["did:ng:x:contact:class#Me", "http://www.w3.org/2006/vcard/ns#Individual"]),
        isDraft: true
      }

      socialContactSetProperties.forEach((propertyKey) => {
        newProfile[propertyKey] = new Set<any>();
      });
      contactSet.add(newProfile);
    }
  }, [contactSet, profile, scope])

  const loadDraftProfile = useCallback(async () => {
    try {
      if (!session) {
        setError('No active session available');
        setIsLoading(false);
        return;
      }
      const isProfileCreated = await profileService.isProfileCreated(session);
      if (!isProfileCreated) {
        await createDraftProfile();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create draft profile');
    }
    setIsLoading(false);
  }, [createDraftProfile, session]);

  useEffect(() => {
    loadDraftProfile();
  }, [loadDraftProfile]);

  const saveProfile = useCallback(async () => {
    if (!profile) return;
    profile.isDraft = false;
  }, [profile]);

  const resetProfile = useCallback(() => {
    if (!profile) return;
    contactService.resetDraftContact(profile);
  }, [profile]);

  return {
    profile,
    isLoading,
    error,
    saveProfile,
    resetProfile
  }
}