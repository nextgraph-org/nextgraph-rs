import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {defaultPolicy} from "@/config/sources.ts";
import {geoApiService} from "@/services/geoApiService.ts";
import {contactNonSetProperties, contactSetProperties} from "@/.orm/shapes/contact.utils.ts";
import {appendPrefixToDictValue} from "@/utils/socialContact/dictMapper.ts";

type ContactSetProperties = {
  [K in keyof SocialContact as NonNullable<SocialContact[K]> extends Set<any> ? K : never]: SocialContact[K]
};

export type ContactLdSetProperties = {
  [K in keyof ContactSetProperties as NonNullable<ContactSetProperties[K]> extends Set<infer U>
    ? U extends { "@id": any }
      ? K
      : never
    : never]: ContactSetProperties[K]
};

type KeysWithSelected<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Set<infer U>
    ? "selected" extends keyof U
      ? K
      : never
    : never
}[keyof T];

type KeysWithHidden<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Set<infer U>
    ? "hidden" extends keyof U
      ? K
      : never
    : never
}[keyof T];

type KeysWithType<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Set<infer U>
    ? "type2" extends keyof U
      ? K
      : never
    : never
}[keyof T];

export type ContactKeysWithSelected = KeysWithSelected<ContactLdSetProperties>
export type ContactKeysWithHidden = KeysWithHidden<ContactLdSetProperties>
export type ContactKeysWithType = KeysWithType<ContactLdSetProperties>

type WithSource = { source?: string };
type WithSelected = { selected?: boolean };
type WithHidden = { hidden?: boolean };


export type ResolvableKey = keyof ContactLdSetProperties;

export type ItemOf<K extends ResolvableKey> =
  NonNullable<ContactLdSetProperties[K]> extends Set<infer T> ? T : never;

export function hasSource(item: any): item is WithSource {
  return item && typeof item === 'object' && item["source"];
}

export function hasType<K>(item: any): item is { type2?: Set<K> } {
  return item && typeof item === 'object' && item["type2"];
}

function hasSelected(item: any): item is WithSelected {
  return item && typeof item === 'object' && item["selected"] && item["@id"];
}

function hasHidden(item: any): item is WithHidden {
  return item && typeof item === 'object' && item["hidden"];
}

function hasProperty(item: any, property: string): item is { [property]?: any } {
  return item && typeof item === 'object' && item[property] && item[property];
}

export function resolveFrom<K extends ResolvableKey>(
  socialContact: SocialContact | undefined,
  key: K,
  policy = defaultPolicy,
): ItemOf<K> | undefined {
  if (!socialContact) return;

  const set = socialContact[key];
  if (!set) return;

  let selectedItem: ItemOf<K> | undefined;
  for (const item of set) {
    // @ts-expect-error for now
    if (hasSelected(item) && item.selected || hasProperty(item, "preferred") && item.preferred) {
      selectedItem = item as ItemOf<K>;
      break;
    }
  }
  if (selectedItem) return selectedItem;

  const firstBySrc = new Map<string, ItemOf<K>>();
  let fallback: ItemOf<K> | undefined;

  for (const item of set) {
    const src = hasSource(item) ? item.source : undefined;
    if (hasHidden(item) && item.hidden) {
      continue;
    }
    if (src && !firstBySrc.has(src)) firstBySrc.set(src, item as ItemOf<K>);
    if (!fallback) fallback = item as ItemOf<K>;
  }

  for (const s of policy) {
    const hit = firstBySrc.get(s);
    if (hit) return hit;
  }
  return fallback;
}

export function getVisibleItems<K extends ResolvableKey>(
  socialContact: SocialContact | undefined,
  key: K,
): ItemOf<K>[] {
  if (!socialContact) return [];

  const set = socialContact[key];
  if (!set) return [];

  return [...set].filter(item =>
    !(hasHidden(item) && item.hidden) && item["@id"]
  ) as ItemOf<K>[];
}

export function setUpdatedTime(contactObj: SocialContact) {
  const currentDateTime = new Date(Date.now()).toISOString();
  if (contactObj.updatedAt) {
    contactObj.updatedAt.valueDateTime = currentDateTime;
  } else {
    contactObj.updatedAt = {
      "@graph": "",
      "@id": "",
      valueDateTime: currentDateTime,
      source: "user",
    }
  }
}

export function updatePropertyFlag<K extends ResolvableKey>(
  contact: SocialContact,
  key: K,
  itemId: string,
  flag: string,           // "preferred" | "selected" | "hidden"
  mode: "single" | "toggle" = "single",
): void {
  const set = contact[key];
  if (!set) return;

  const items = [...set];

  if (mode === "single") {
    items.forEach(el => {
      if (!el["@id"]) return;
      (el as any)[flag] = el["@id"] === itemId;
    });
  } else {
    const target = items.find(el => el["@id"] === itemId);
    if (target) {
      (target as any)[flag] = !((target as any)[flag] ?? false);
    }
  }
}

function handleDictionaries(el: any, key: string) {
  if (!el[key]) return;

  let normalized = el[key];
  if ("@id" in normalized) {
    normalized = normalized["@id"];
  }

  if (key === "type2") {
    el["type"] = appendPrefixToDictValue(key, normalized);
    delete el[key];
  } else {
    el[key] = appendPrefixToDictValue(key, normalized);
  }
}

export async function processContactFromJSON(jsonContact: any): Promise<SocialContact> {
  const contact = {
    "@graph": "",
    "@id": "",
    "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"])
  } as SocialContact;
  contactSetProperties.forEach(property => {
    if (jsonContact[property] && Array.isArray(jsonContact[property])) {
      const props = jsonContact[property].map((el: any) => {
        handleDictionaries(el, "type2");
        // handleDictionaries(el, "type");
        handleDictionaries(el, "valueIRI");
        handleDictionaries(el, "photoIRI");

        return el;
      });

      contact[property] ??= new Set(props);
    }
  });

  contactNonSetProperties.forEach(property => {
    if (jsonContact[property]) {
      contact[property] = jsonContact[property];
    }
  })

  await geoApiService.initContactGeoCodes(contact);

  //TODO: remove this when we would have real data
  // Only generate the centralityScore once, so we can reliably test the network graph
  if (contact.centralityScore === undefined) {
    contact.centralityScore = Math.round(100 * Math.random());
  }
  //// TODO:

  return contact;
}