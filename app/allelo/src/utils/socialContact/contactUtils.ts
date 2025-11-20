import {LdSet} from '@ldo/ldo';
import {SocialContact} from '@/.ldo/contact.typings';
import {Contact, Source} from "@/types/contact";
import {contactContext} from "@/.ldo/contact.context";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet";
import {geoApiService} from "@/services/geoApiService.ts";

export const contactCommonProperties = [
  "@id",
  "@context",
  "type",
  "naoStatus",
  "invitedAt",
  "createdAt",
  "updatedAt",
  "joinedAt",
  "centralityScore"
] as const satisfies readonly (keyof SocialContact)[];

export type ContactLdSetProperties = Omit<
  SocialContact,
  (typeof contactCommonProperties)[number]
>;

type KeysWithSelected<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends LdSet<infer U>
    ? "selected" extends keyof U
      ? K
      : never
    : never
}[keyof T];

type KeysWithHidden<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends LdSet<infer U>
    ? "hidden" extends keyof U
      ? K
      : never
    : never
}[keyof T];

type KeysWithType<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends LdSet<infer U>
    ? "type2" extends keyof U
      ? K
      : never
    : never
}[keyof T];

export type ContactKeysWithSelected = KeysWithSelected<ContactLdSetProperties>
export type ContactKeysWithHidden = KeysWithHidden<ContactLdSetProperties>
export type ContactKeysWithType = KeysWithType<ContactLdSetProperties>

export type ResolvableKey = keyof ContactLdSetProperties;

export type ItemOf<K extends ResolvableKey> =
  NonNullable<ContactLdSetProperties[K]> extends LdSet<infer T> ? T : never;

type WithSource = { source?: string };
type WithSelected = { selected?: boolean };
type WithHidden = { hidden?: boolean };

export function hasSource(item: any): item is WithSource {
  return item && typeof item === 'object' && item["source"];
}

export function hasType(item: any): item is { type2?: BasicLdSet } {
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

const defaultPolicy: Source[] = ["user", "GreenCheck", "linkedin", "Android Phone", "iPhone", "Gmail", "vcard"];

export function resolveFrom<K extends ResolvableKey>(
  socialContact: SocialContact | undefined,
  key: K,
  policy = defaultPolicy,
): ItemOf<K> | undefined {
  if (!socialContact) return;

  const set = socialContact[key];
  if (!set) return;

  const items = set.toArray() as ItemOf<K>[];

  const selectedItem = items.find(item => hasSelected(item) && item.selected || hasProperty(item, "preferred") && item.preferred);
  if (selectedItem) return selectedItem;

  const firstBySrc = new Map<string, ItemOf<K>>();
  let fallback: ItemOf<K> | undefined;

  for (const item of items) {
    const src = hasSource(item) ? item.source : undefined;
    if (hasHidden(item) && item.hidden) {
      continue;
    }
    if (src && !firstBySrc.has(src)) firstBySrc.set(src, item);
    if (!fallback) fallback = item;
  }

  for (const s of policy) {
    const hit = firstBySrc.get(s);
    if (hit) return hit;
  }
  return fallback;
}

export function getSubProperty(item: ItemOf<keyof ContactLdSetProperties>, property: keyof ItemOf<keyof ContactLdSetProperties>): string | undefined {
  if (!item || typeof item !== 'object' && !item[property]) {
    return;
  }
  if (item[property] instanceof Array) {
    return item[property][0];
  } else if (item[property] instanceof BasicLdSet) {
    return item[property].toArray()[0];
  } else if (typeof item[property] === "string") {
    return item[property];
  }
}

export function getPropsByFilter<K extends keyof ContactLdSetProperties>(socialContact: SocialContact, key: K, filterParams: Partial<ItemOf<keyof ContactLdSetProperties>>): ItemOf<K>[] {
  //@ts-expect-error this is crazy, but that how it works
  return (socialContact[key]?.toArray() ?? []).filter((item) => {
    const filterProps = Object.keys(filterParams) as (keyof ItemOf<keyof ContactLdSetProperties>)[];
    for (const prop of filterProps) {
      if (getSubProperty(item, prop) !== filterParams[prop]) {
        return false;
      }
    }
    return true;
  })
}

export function getPropType(property: ItemOf<keyof ContactLdSetProperties>): string {
  const types = ((hasType(property) && property.type2?.toArray()) ?? []) as any[];
  return types.length > 0 ? types[0]["@id"] : "";
}

export function getPropsByType<K extends ContactKeysWithType>(socialContact: SocialContact, key: K, type: string): ItemOf<K>[] {
  //@ts-expect-error this is crazy, but that how it works
  return (socialContact[key]?.toArray() ?? []).filter((el) => {
    return getPropType(el) === type;
  })
}

export function getPropByType<K extends ContactKeysWithType>(socialContact: SocialContact, key: K, type: string): ItemOf<K> | undefined {
  return getPropsByType(socialContact, key, type)[0];
}

export function getPropByNuri<K extends ResolvableKey>(socialContact: SocialContact, key: K, nuri: string): ItemOf<K> | undefined {
  //@ts-expect-error this is crazy, but that how it works
  return (socialContact[key]?.toArray() ?? []).find(item => item["@id"] === nuri);
}

export function getVisibleItems<K extends ResolvableKey>(
  socialContact: SocialContact | undefined,
  key: K,
): ItemOf<K>[] {
  if (!socialContact) return [];

  const set = socialContact[key];
  if (!set) return [];

  return set.toArray().filter(item =>
    !(hasHidden(item) && item.hidden) && item["@id"]
  ) as ItemOf<K>[];
}

export function setUpdatedTime(contactObj: Contact) {
  const currentDateTime = new Date(Date.now()).toISOString();
  if (contactObj.updatedAt) {
    contactObj.updatedAt.valueDateTime = currentDateTime;
  } else {
    contactObj.updatedAt = {
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
  const set = contact[key] as LdSet<any>;
  if (!set) return;

  const items = set.toArray();

  if (mode === "single") {
    items.forEach(el => {
      if (!el["@id"]) return;
      el[flag] = el["@id"] === itemId;
    });
  } else {
    const target = items.find(el => el["@id"] === itemId);
    if (target) {
      target[flag] = !(target[flag] ?? false);
    }
  }
}


export function updateProperty<K extends ResolvableKey>(
  contact: SocialContact,
  key: K,
  itemId: string,
  property: string,
  value: any
): void {
  const set = contact[key] as LdSet<any>;
  if (!set) return;

  const items = set.toArray();

  const item = items.find(el => el["@id"] === itemId);
  if (item) {
    item[property] = value;
  }
}

function handleLdoBug(el: any, key: string, toShow = true) {
  if (!el[key]) return;

  if (typeof el[key] === "string") {
    el[key] = {"@id": el[key]};
  }

  if (toShow) {
    if (!el[key][0]) {
      el[key] = [el[key]];
    }
    el[key] = new BasicLdSet(el[key]);
  } else {
    if (el[key][0]) {
      el[key] = el[key][0];
    }
  }
}

// Process Contact from JSON to ensure LdSet properties are properly instantiated
export async function processContactFromJSON(jsonContact: any, withIds = true): Promise<Contact> {
  const contact = {} as Contact;
  if (withIds) {
    jsonContact["@id"] ??= Math.random().toExponential(32);
  }

  contactLdSetProperties.forEach(property => {
    contact[property] ??= new BasicLdSet([]);
    if (jsonContact[property] && Array.isArray(jsonContact[property])) {
      jsonContact[property].forEach((el: any) => {
        if (withIds) {
          el["@id"] = Math.random().toExponential(32);
        }

        handleLdoBug(el, "type2", withIds);
        handleLdoBug(el, "valueIRI", withIds);

        contact[property]!.add(el);
      });
    }
  });

  contactCommonProperties.forEach(property => {
    if (jsonContact[property]) {
      let value = jsonContact[property];
      if (Array.isArray(value)) {
        value = new BasicLdSet(value);
      }
      contact[property] = value;
    }
  })

  const mockProperties = [
    "humanityConfidenceScore",
    "vouchesSent",
    "vouchesReceived",
    "praisesSent",
    "praisesReceived",
    "relationshipCategory",
    "lastInteractionAt",
    "interactionCount",
    "recentInteractionScore",
    "sharedTagsCount",
  ] as (keyof Contact)[];

  mockProperties.forEach(property => {
    let value = jsonContact[property];
    if (property === "lastInteractionAt" && value) {
      value = new Date(value);
    }
    // @ts-expect-error mock
    contact[property] = value;
  });

  await geoApiService.initContactGeoCodes(contact);

  //TODO: remove this when we would have real data
  contact.centralityScore = Math.round(100 * Math.random());
  //// TODO:

  return contact;
}


const allProperties = Object.keys((contactContext.Individual as any)["@context"]);
const excludedProperties = contactCommonProperties.map(prop => prop as string);
export const contactLdSetProperties = allProperties.filter(prop => !excludedProperties.includes(prop)) as (keyof ContactLdSetProperties)[];