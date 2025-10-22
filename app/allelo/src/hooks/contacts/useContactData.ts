import {useCallback, useEffect, useState} from "react";
import type {Contact} from "@/types/contact.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {SocialContact} from "@/.ldo/contact.typings.ts";
import {SocialContactShapeType} from "@/.ldo/contact.shapeTypes.ts";
import {dataService} from "@/services/dataService.ts";

export const useContactData = (nuri: string | null) => {
  const [contact, setContact] = useState<Contact | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const { session } = nextGraphAuth;
  const sessionId = session?.sessionId;

  // NextGraph subscription
  useResource(sessionId && nuri ? nuri : undefined, { subscribe: true });
  const socialContact: SocialContact | undefined = useSubject(
    SocialContactShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  useEffect(() => {
    if (!nuri) {
      setContact(undefined);
      setIsLoading(false);
      return;
    }

    if (!isNextGraph) {
      // Mock data loading
      const fetchContact = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const contactData = await dataService.getContact(nuri);
          setContact(contactData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load contact');
        } finally {
          setIsLoading(false);
        }
      };
      fetchContact();
    } else {
      if (socialContact) {
        setContact(socialContact as Contact);
        setIsLoading(false);
        setError(null);
      }
    }
  }, [nuri, isNextGraph, socialContact, sessionId, refreshTrigger]);

  const refreshContact = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { contact, isLoading, error, setContact, refreshContact };
};