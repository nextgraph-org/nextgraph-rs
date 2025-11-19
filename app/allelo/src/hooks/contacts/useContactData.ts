import {useEffect, useMemo, useState} from "react";
import type {Contact} from "@/types/contact";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {SocialContact} from "@/.ldo/contact.typings";
import {SocialContactShapeType} from "@/.ldo/contact.shapeTypes";
import {SocialContactShapeType as Shape} from "@/.orm/shapes/contact.shapeTypes";
import {useMockContactSubject} from "@/hooks/contacts/useMockContactSubject";
import { useShape } from "@ng-org/signals/react";

export const useContactData = (nuri: string | null, isProfile = false, /*refreshKey = 0*/) => {
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

  // NextGraph subscription - subscribe to updates
  const resource = useResource(sessionId && nuri ? nuri : undefined, {subscribe: true});

  const socialContact: SocialContact | undefined = useSubject(
    SocialContactShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  const ormContacts = useShape(Shape, nuri ? nuri : undefined);
  const ormContact = useMemo(() => ormContacts?.values().next().value, [ormContacts]);

  const mockNuri = !isNextGraph ? nuri : null;
  const mockContact = useMockContactSubject(mockNuri/*, refreshKey*/);

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
      /*// Force a re-fetch when refreshKey changes
      if (refreshKey > 0) {
        setIsLoading(true);
        // Delay to allow NextGraph to propagate the changes
        const timeout = setTimeout(() => {
          if (socialContact) {
            setContact(socialContact as Contact);
            setIsLoading(false);
            setError(null);
          } else {
            setIsLoading(false);
          }
        }, 500);
        return () => clearTimeout(timeout);
      } else {*/
        if (socialContact) {
          setContact(socialContact as Contact);
          setIsLoading(false);
          setError(null);
        }
      //}
    }
  }, [nuri, isNextGraph, socialContact, sessionId, mockContact/*, refreshKey*/]);

  return {contact, isLoading, error, setContact, resource, ormContact};
};
