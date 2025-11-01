import {useEffect, useState} from "react";
import type {Contact} from "@/types/contact";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContact} from "@/.ldo/contact.typings";
import {SocialContactShapeType} from "@/.ldo/contact.shapeTypes";
import {useMockContactSubject} from "@/hooks/contacts/useMockContactSubject";

export const useContactData = (nuri: string | null, isProfile = false) => {
  const [contact, setContact] = useState<Contact | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  if (isProfile) {
    nuri = "did:ng:" + session?.protectedStoreId;
  }

  // NextGraph subscription
  useResource(sessionId && nuri ? nuri : undefined, {subscribe: true});
  const socialContact: SocialContact | undefined = useSubject(
    SocialContactShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  const mockNuri = !isNextGraph ? nuri : null;
  const mockContact = useMockContactSubject(mockNuri);

  useEffect(() => {
    if (!nuri) {
      setContact(undefined);
      setIsLoading(false);
      return;
    }

    if (!isNextGraph) {
      if (mockContact) {
        setContact(mockContact);
        setIsLoading(false);
        setError(null);
      }
    } else {
      if (socialContact) {
        setContact(socialContact as Contact);
        setIsLoading(false);
        setError(null);
      }
    }
  }, [nuri, isNextGraph, socialContact, sessionId, mockContact]);

  return {contact, isLoading, error, setContact};
};
