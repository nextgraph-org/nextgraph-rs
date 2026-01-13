import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import {mergeContactService} from "@/services/mergeContactService.ts";
import {useMergeContactIntoTarget} from "@/hooks/contacts/useMergeContactIntoTarget.ts";
import { OrmConnection } from "@ng-org/orm";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

interface UseMergeContactsReturn {
  getDuplicatedContacts: () => Promise<string[][]>;
  mergeContacts: (contactsIDs: string[]) => Promise<void>;
}

export function useMergeContacts(): UseMergeContactsReturn {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
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


  const save = async (mergedContact: SocialContact) => {
    if (!session) {
      return;
    }
    const connection = OrmConnection.getOrCreate(SocialContactShapeType, {graphs: [session.privateStoreId!]});
    connection.beginTransaction();
    connection.signalObject.add(mergedContact);
    await connection.commitTransaction();
    connection.close();
  }

  const onMergeContactChange = useCallback(async() => {
    if (!mergedContact || mergedContact["@id"] || isMergingNow.current) return;
    isMergingNow.current = true;
    try {
      await save(mergedContact);
      await mergeContactService.markContactsAsMerged(session, contactIds, mergedContact!["@id"]!);
    } catch (error) {
      console.log(error);
    }
    isMergingNow.current = false;

    if (mergeResolveRef.current) {
      mergeResolveRef.current();
      mergeResolveRef.current = null;
    }
  }, [mergedContact, save, session, contactIds]);

  useEffect(() => {
    onMergeContactChange();
  }, [onMergeContactChange]);

  return {
    getDuplicatedContacts,
    mergeContacts
  };
}