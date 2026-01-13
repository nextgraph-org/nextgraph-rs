import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {useCallback} from "react";
import {mergeContactService} from "@/services/mergeContactService.ts";
import {getObjects} from "../../../../../sdk/js/orm";
import {SocialContactShapeType} from "@/.orm/shapes/contact.shapeTypes.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {socialContactNonSetProperties, socialContactSetProperties} from "@/.orm/utils/contact.utils.ts";

function uniqueShallow(arr: any[]): any[] {
  const seen = new Set();
  const excludeKeys = ["preferred", "selected", "hidden"];
  return arr.filter((obj): any => {
    const h = JSON.stringify(Object.keys(obj)
      .filter(k => !excludeKeys.includes(k))
      .sort()
      .map(k => [k, obj[k]]));
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });
}

interface UseMergeContactsReturn {
  getDuplicatedContacts: () => Promise<string[][]>;
  mergeContacts: (contactsIDs: string[]) => Promise<void>;
}

export function useMergeContacts(): UseMergeContactsReturn {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const {saveContact} = useSaveContacts();

  const getDuplicatedContacts = useCallback(async (): Promise<string[][]> => {
    return mergeContactService.getDuplicatedContacts(session);
  }, [session]);

  const getMergedContact = useCallback((contacts: Set<SocialContact>): SocialContact => {
    const targetContact: SocialContact = {
      mergedFrom: new Set(),
      "@graph": "",
      "@id": "",
      "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"])
    };
    
    [...contacts].forEach((contact: SocialContact) => {
      if (!targetContact || !contact) return;
      delete contact.mergedFrom;
      delete contact.mergedInto;

      targetContact.mergedFrom!.add(contact["@id"]);
      socialContactSetProperties.forEach(propertyKey => {
        const value = contact[propertyKey];
        if (!value?.size) {
          return;
        }

        targetContact[propertyKey] ??= new Set<any>();

        value.forEach(el => {
          targetContact[propertyKey]!.add({
            //@ts-expect-error narrow later
            ...el,
            "@graph": "",
            "@id": ""
          });
        });
      });

      socialContactNonSetProperties.forEach(key => {
        if (!contact[key]) {
          return;
        }
        const value = contact[key] as any;
        delete value["@graph"];
        delete value["@id"];
        targetContact[key] ??= value;
      });
    });
    socialContactSetProperties.forEach(propertyKey => {
      if (targetContact && targetContact[propertyKey]) {
        targetContact[propertyKey] = new Set(uniqueShallow([...targetContact![propertyKey]]));
      }
    });
    
    return targetContact;
  }, []);

  const mergeContacts = useCallback(async (contactIdsToMerge: string[]) => {
    if (contactIdsToMerge.length === 0) return;
    
    const contacts = await getObjects(SocialContactShapeType, {graphs: contactIdsToMerge});
    const mergedContact = getMergedContact(contacts);
    await saveContact(mergedContact);
    await mergeContactService.markContactsAsMerged(session, contactIdsToMerge, mergedContact!["@id"]!);

  }, [saveContact, getMergedContact, session]);


  return {
    getDuplicatedContacts,
    mergeContacts
  };
}