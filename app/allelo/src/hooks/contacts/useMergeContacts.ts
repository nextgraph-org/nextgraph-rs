import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import {mergeContactService} from "@/services/mergeContactService.ts";
import {useMergeContactIntoTarget} from "@/hooks/contacts/useMergeContactIntoTarget.ts";

interface UseMergeContactsReturn {
  getDuplicatedContacts: () => Promise<string[][]>;
  mergeContacts: (contactsIDs: string[]) => Promise<void>;
}

export function useMergeContacts(): UseMergeContactsReturn {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const {createContact} = useSaveContacts();
  const isMergingNow = useRef<boolean>(false);
  const mergeResolveRef = useRef<(() => void) | null>(null);

  const [contactIds, setContactIds] = useState<string[]>([]);

  const {setMergingContactIds, mergedContact} = useMergeContactIntoTarget();

  const getDuplicatedContacts = useCallback(async (): Promise<string[][]> => {
    return mergeContactService.getDuplicatedContacts(session);
  }, [session]);

  useEffect(() => {
    setMergingContactIds(contactIds);
  }, [contactIds, setMergingContactIds]);

  const mergeContacts = useCallback(async (contactIdsToMerge: string[]) => {
    if (contactIdsToMerge.length === 0) return;

    return new Promise<void>((resolve) => {
      mergeResolveRef.current = resolve;
      setContactIds(contactIdsToMerge);
    });
  }, []);

  const onMergeContactChange = useCallback(async() => {
    if (!mergedContact || mergedContact["@id"] || isMergingNow.current) return;
    isMergingNow.current = true;
    try {
      await createContact(mergedContact);
      await mergeContactService.markContactsAsMerged(session, contactIds, mergedContact!["@id"]!);
    } catch (error) {
      console.log(error);
    }
    isMergingNow.current = false;

    if (mergeResolveRef.current) {
      mergeResolveRef.current();
      mergeResolveRef.current = null;
    }
  }, [mergedContact, contactIds, createContact, session]);

  useEffect(() => {
    onMergeContactChange();
  }, [onMergeContactChange]);

  return {
    getDuplicatedContacts,
    mergeContacts
  };
}