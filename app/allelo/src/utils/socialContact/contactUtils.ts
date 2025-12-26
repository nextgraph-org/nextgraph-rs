import {LdSet} from '@ldo/ldo';
import {SocialContact} from '@/.ldo/contact.typings';
import {Contact} from "@/types/contact";
import {contactContext} from "@/.ldo/contact.context";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet";
import {geoApiService} from "@/services/geoApiService.ts";
import {defaultPolicy} from "@/config/sources.ts";

export const contactCommonProperties = [
  "@id",
  "@context",
  "type",
  "naoStatus",
  "invitedAt",
  "createdAt",
  "updatedAt",
  "joinedAt",
  "rcard",
  "centralityScore",
  "mostRecentInteraction"
] as const satisfies readonly (keyof SocialContact)[];

export type ContactLdSetProperties = Omit<
  SocialContact,
  (typeof contactCommonProperties)[number]
>;

type KeysWithType<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends LdSet<infer U>
    ? "type2" extends keyof U
      ? K
      : never
    : never
}[keyof T];

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

export function getPropsByFilter<K extends keyof ContactLdSetProperties>(socialContact: SocialContact | undefined, key: K, filterParams: Partial<ItemOf<keyof ContactLdSetProperties>>): ItemOf<K>[] {
  if (!socialContact) return [];
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

export function getPropByNuri<K extends ResolvableKey>(socialContact: SocialContact, key: K, nuri: string): ItemOf<K> | undefined {
  //@ts-expect-error this is crazy, but that how it works
  return (socialContact[key]?.toArray() ?? []).find(item => item["@id"] === nuri);
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
        handleLdoBug(el, "photoIRI", withIds);

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
      contact.mostRecentInteraction = new Date(value).toISOString();
    } else {
      // @ts-expect-error mock
      contact[property] = value;
    }
  });

  await geoApiService.initContactGeoCodes(contact);

  //TODO: remove this when we would have real data
  // Only generate the centralityScore once, so we can reliably test the network graph
  if (contact.centralityScore === undefined) {
    contact.centralityScore = Math.round(100 * Math.random());
  }
  //// TODO:

  return contact;
}


const allProperties = Object.keys((contactContext.Individual as any)["@context"]);
const excludedProperties = contactCommonProperties.map(prop => prop as string);
export const contactLdSetProperties = allProperties.filter(prop => !excludedProperties.includes(prop)) as (keyof ContactLdSetProperties)[];