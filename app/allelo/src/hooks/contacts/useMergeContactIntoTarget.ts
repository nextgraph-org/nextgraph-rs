import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
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

interface UseMergeContactIntoTargetReturn {
  setMergingContactIds: (mergingContactIds: string[]) => void;
  mergedContact: SocialContact | undefined;
}

export function useMergeContactIntoTarget(): UseMergeContactIntoTargetReturn {
  const [mergingContactId, setMergingContactId] = useState<string>();
  const [mergingContactIds, setMergingContactIds] = useState<string[]>([]);
  const [mergedContact, setMergedContact] = useState<SocialContact>();
  const [targetContact, setTargetContact] = useState<SocialContact>();

  const mergedContactIndex = useRef<number>(0);

  const initTargetContact = useCallback(() => {
    setTargetContact({
      mergedFrom: new Set(),
      "@graph": "",
      "@id": "",
      "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"])
    });
  }, []);

  useEffect(() => {
    if (!mergingContactIds.length) {
      setTargetContact(undefined);
      return;
    }
    mergedContactIndex.current = 0;
    initTargetContact();
  }, [mergingContactIds, initTargetContact]);

  useEffect(() => {
    setMergingContactIds([]);
  }, [mergedContact]);

  const initCurrentMergingContact = useCallback(() => {
    if (!mergingContactIds.length || !targetContact) return;
    if (mergedContactIndex.current >= mergingContactIds.length) {
      socialContactSetProperties.forEach(propertyKey => {
        if (targetContact && targetContact[propertyKey]) {
          targetContact[propertyKey] = new Set(uniqueShallow([...targetContact![propertyKey]]));
        }
      });
      setMergingContactId(undefined);
      setMergedContact(targetContact);
    } else {
      setMergingContactId(mergingContactIds[mergedContactIndex.current]);
    }
  }, [mergingContactIds, targetContact]);

  useEffect(initCurrentMergingContact, [initCurrentMergingContact]);

  const onContact = useCallback((nuri?: string | null, contact?: SocialContact) => {
    if (!nuri || !contact) {
      return;
    }

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

    mergedContactIndex.current++;
    initCurrentMergingContact();
  }, [initCurrentMergingContact, targetContact]);

  useContactOrm(mergingContactId, false, onContact);

  return {
    setMergingContactIds,
    mergedContact,
  };
}