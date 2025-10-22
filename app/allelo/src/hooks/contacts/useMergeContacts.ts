import {dataService} from "@/services/dataService.ts";
import {ldoToJson, nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import type {Contact} from "@/types/contact.ts";
import {
  contactCommonProperties,
  contactLdSetProperties,
  processContactFromJSON
} from "@/utils/socialContact/contactUtils.ts";
import {dataset, useNextGraphAuth} from "@/lib/nextgraph.ts";
import {SocialContactShapeType} from "@/.ldo/contact.shapeTypes.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {useCallback} from "react";
import {SocialContact} from "@/.ldo/contact.typings.ts";

interface UseMergeContactsReturn {
  getDuplicatedContacts: () => Promise<string[][]>;
  mergeContacts: (contactsIDs: string[]) => Promise<void>;
}

function uniqueShallow (arr: any[]): any[] {
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

export function useMergeContacts(): UseMergeContactsReturn {
  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const {createContact, updateContact} = useSaveContacts();

  const getDuplicatedContacts = async (): Promise<string[][]> => {
    return !isNextGraph ? dataService.getDuplicatedContacts() : nextgraphDataService.getDuplicatedContacts(session);
  };

  const calcMergedContact = async (contactsToMerge: Contact[]): Promise<Contact | null> => {
    if (contactsToMerge.length === 0) return null;

    const mergedContactJson: any = {
      mergedFrom: []
    };

    contactsToMerge.forEach((contact) => {
      try {
        delete contact.mergedFrom;
        delete contact.mergedInto;
        const contactJson = ldoToJson(contact) as any;

        mergedContactJson.mergedFrom.push({"@id": contactJson["@id"]});
        contactLdSetProperties.forEach(propertyKey => {
          let value = contactJson[propertyKey] as any[];
          if (!value?.length) {
            return;
          }

          if (isNextGraph) {//LDO bug issue
            value = value.filter(el => el["@id"]);
            if (!value.length) {
              return;
            }
          }

          value.forEach(el => delete el["@id"]);
          mergedContactJson[propertyKey] ??= [];
          mergedContactJson[propertyKey].push(...value);
        });

        contactCommonProperties.forEach(key => {
          if (["@id", "@context", "type"].includes(key) || !contactJson[key]) {
            return;
          }
          const value = contactJson[key] as any;
          delete value["@id"];
          mergedContactJson[key] ??= value;
        });

        if (!isNextGraph) {
          ([
            "humanityConfidenceScore",
            "vouchesSent",
            "vouchesReceived",
            "praisesSent",
            "praisesReceived",
            "relationshipCategory",
            "lastInteractionAt",
            "interactionCount",
            "recentInteractionScore",
            "sharedTagsCount"
          ] as (keyof Contact)[]).forEach(key => mergedContactJson[key] ??= contact[key]);
        }
      } catch (error) {
        console.log("Couldn't parse contact to json: " + contact);
        throw error;
      }
    });

    contactLdSetProperties.forEach(propertyKey => {
      if (mergedContactJson[propertyKey]) {
        mergedContactJson[propertyKey] = uniqueShallow(mergedContactJson[propertyKey]);
      }
    })

    return await processContactFromJSON(mergedContactJson, !isNextGraph);
  }

  const getMergingContacts = useCallback(async (mergingContactIds: string[]) => {
    return (await Promise.all(
      mergingContactIds.map(id => {
        if (!isNextGraph) {
          return dataService.getContact(id)
        }
        return dataset.usingType(SocialContactShapeType).fromSubject(id);
      })
    )) as Contact[];
  }, [isNextGraph])

  const mergeContacts = async (mergingContactIds: (string)[]) => {
    if (isNextGraph) {
      mergingContactIds = mergingContactIds.map(id => id.substring(0, 53));
    }
    const mergingContacts = await getMergingContacts(mergingContactIds);
    try {
      const mergedContact = await calcMergedContact(mergingContacts);

      if (mergedContact) {
        if (!isNextGraph) {
          await dataService.addContact(mergedContact);
        } else {
          await createContact(mergedContact);
        }

        for (const contactId of mergingContactIds) {
          await updateContact(contactId, {mergedInto: new BasicLdSet([{"@id": mergedContact["@id"]} as SocialContact])});
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  return {
    getDuplicatedContacts,
    mergeContacts
  };
}