import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {defaultPolicy} from "@/config/sources.ts";
import {geoApiService} from "@/services/geoApiService.ts";
import {
  SocialContactDictMap,
  socialContactNonSetProperties,
  socialContactSetProperties
} from "@/.orm/utils/contact.utils.ts";
import {renderTemplate, defaultTemplates} from "@/utils/templateRenderer";
import {NextGraphSession} from "@/types/nextgraph.ts";
import {contactsOverlay} from "@/constants/overlays.ts";
import {contactDictMapper} from "@/utils/dictMappers.ts";

export const excludedContactKeys = [
  "@type", "mergedInto", "mergedFrom"
] as const satisfies readonly (keyof SocialContact)[];

type SetKeys<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends Set<any> ? K : never
}[keyof T];
type SetItem<T> = T extends Set<infer U> ? U : never;
type FilterFor<T> = Partial<T>;
type ExcludeTypeKey<T> = Omit<T, (typeof excludedContactKeys)[number]>;

export type ContactSetProperties =
  SetKeys<ExcludeTypeKey<SocialContact>>;
export type ContactSetItem<K extends ContactSetProperties> = SetItem<NonNullable<SocialContact[K]>>;

export type ContactKeysWithSelected = {
  [K in ContactSetProperties]-?:
  ContactSetItem<K> extends { selected?: boolean } ? K : never
}[ContactSetProperties];

export type ContactKeysWithHidden = {
  [K in ContactSetProperties]-?:
  ContactSetItem<K> extends { hidden?: boolean } ? K : never
}[ContactSetProperties];

type WithSource = { source?: string };
type WithSelected = { selected?: boolean };
type WithHidden = { hidden?: boolean };

export function hasSource(item: any): item is WithSource {
  return item && typeof item === 'object' && item["source"];
}

function hasSelected(item: any): item is WithSelected {
  return item && typeof item === 'object' && item["selected"] && item["@id"];
}

export function hasType(item: any): item is { type: string } {
  return item && typeof item === 'object' && item["type"];
}

function hasHidden(item: any): item is WithHidden {
  return item && typeof item === 'object' && item["hidden"];
}

function hasProperty<T extends object, P extends PropertyKey>(
  item: any,
  property: P,
): item is T & Record<P, unknown> {
  return !!item && typeof item === "object" && property in item;
}

export function resolveFrom<K extends ContactSetProperties>(
  socialContact: SocialContact | undefined,
  key: K,
  policy = defaultPolicy,
): ContactSetItem<K> | undefined {
  if (!socialContact) return;

  const set = socialContact[key];
  if (!set) return;

  let selectedItem: ContactSetItem<K> | undefined;
  for (const item of set) {
    if (hasSelected(item) && item.selected || hasProperty(item, "preferred") && item.preferred) {
      selectedItem = item as ContactSetItem<K>;
      break;
    }
  }
  if (selectedItem) return selectedItem;

  const firstBySrc = new Map<string, ContactSetItem<K>>();
  let fallback: ContactSetItem<K> | undefined;

  for (const item of set) {
    const src = hasSource(item) ? item.source : undefined;
    if (hasHidden(item) && item.hidden) {
      continue;
    }
    if (src && !firstBySrc.has(src)) firstBySrc.set(src, item as ContactSetItem<K>);
    if (!fallback) fallback = item as ContactSetItem<K>;
  }

  for (const s of policy) {
    const hit = firstBySrc.get(s);
    if (hit) return hit;
  }
  return fallback;
}

export function getVisibleItems<K extends ContactSetProperties>(
  socialContact: SocialContact | undefined,
  key: K,
): ContactSetItem<K>[] {
  if (!socialContact) return [];

  const set = socialContact[key];
  if (!set) return [];

  return [...set].filter(item =>
    !(hasHidden(item) && item.hidden) && item["@id"]
  ) as ContactSetItem<K>[];
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

export function updatePropertyFlag<K extends ContactSetProperties>(
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

function handleDictionaries(el: any, property: keyof SocialContactDictMap, subProperty: string) {
  if (!el[subProperty]) return;

  let normalized = el[subProperty];
  if ("@id" in normalized) {
    normalized = normalized["@id"];
  }

  if (subProperty === "type2") {
    el["type"] = contactDictMapper.appendPrefixToDictValue(property, subProperty, normalized);
    delete el[subProperty];
  } else {
    el[subProperty] = contactDictMapper.appendPrefixToDictValue(property, subProperty, normalized);
  }
}

export async function prepareContact(contact: Partial<SocialContact>): Promise<SocialContact> {
  contact["@type"] = new Set(["http://www.w3.org/2006/vcard/ns#Individual"]);

  await geoApiService.initContactGeoCodes(contact);
/*
  //TODO: remove this when we would have real data
  // Only generate the centralityScore once, so we can reliably test the network graph
  if (contact.centralityScore === undefined) {
    contact.centralityScore = Math.round(100 * Math.random());
  }
  //TODO: for geo map test only
  contact.address ??= new Set();
  contact.address.add({
    "@graph": "",
    "@id": "",
    value: "some address",
    coordLng: -180 + Math.random() * 360, // Random longitude: -180 to 180
    coordLat: -60 + Math.random() * 130    // Random latitude: -60 to 70 (populated areas)
  })*/

  return contact as SocialContact;
}

export async function processContactFromJSON(jsonContact: any): Promise<SocialContact> {
  const contact = {
    "@graph": "",
    "@id": "",
    "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"])
  } as SocialContact;
  socialContactSetProperties.forEach(property => {
    if (jsonContact[property] && Array.isArray(jsonContact[property])) {
      const props = jsonContact[property].map((el: any) => {
        //TODO: check this
        handleDictionaries(el, property, "type");
        handleDictionaries(el, property, "type2");
        handleDictionaries(el, property, "valueIRI");
        handleDictionaries(el, property, "photoIRI");

        return el;
      });

      contact[property] ??= new Set(props);
    }
  });

  socialContactNonSetProperties.forEach(property => {
    if (jsonContact[property]) {
      contact[property] = jsonContact[property];
    }
  })

  return prepareContact(contact);
}

/**
 * Resolves contact name using template renderer
 * Uses the default contactName template
 */
export function resolveContactName(
  contact: SocialContact | undefined,
): string {
  if (!contact) return '';

  const name = resolveFrom(contact, 'name');
  return name?.value || renderTemplate(defaultTemplates.contactName, name);
}

/**
 * Resolves primary email address
 */
export function resolveContactEmail(contact: SocialContact | undefined): string | undefined {
  if (!contact) return undefined;
  const emailItem = resolveFrom(contact, 'email');
  return emailItem?.value;
}

/**
 * Resolves primary phone number
 */
export function resolveContactPhone(contact: SocialContact | undefined): string | undefined {
  if (!contact) return undefined;
  const phoneItem = resolveFrom(contact, 'phoneNumber');
  return phoneItem?.value;
}

/**
 * Resolves primary address using template renderer
 */
export function resolveContactAddress(contact: SocialContact | undefined): string | undefined {
  if (!contact) return undefined;

  const addressItem = resolveFrom(contact, 'address');
  if (!addressItem) return undefined;

  return renderTemplate(defaultTemplates.address, addressItem);
}

/**
 * Resolves primary organization/affiliation
 */
export function resolveContactOrganization(contact: SocialContact | undefined): string | undefined {
  if (!contact) return undefined;
  const orgItem = resolveFrom(contact, 'organization');
  return orgItem?.value;
}

/**
 * Resolves primary photo IRI
 */
export function resolveContactPhoto(contact: SocialContact | undefined): string | undefined {
  if (!contact) return undefined;
  const photoItem = resolveFrom(contact, 'photo');
  return photoItem?.photoIRI;
}

export function getContactGraph(nuri: string, session: NextGraphSession): string {
  return nuri.substring(0, 53) + contactsOverlay(session);
}

export function getSubProperty<K extends ContactSetProperties, P extends keyof ContactSetItem<K>
>(item: ContactSetItem<K>, property: P): string | undefined {
  if (!item || typeof item !== "object") return;

  const v = item[property];

  if (typeof v === "string") return v;

  if (v instanceof Set) {
    for (const el of v) {
      if (typeof el === "string") return el;
      break;
    }
  }

  return;
}

export function getPropsByFilter<K extends ContactSetProperties>(
  socialContact: SocialContact | undefined,
  key: K,
  filterParams: FilterFor<ContactSetItem<K>>
): ContactSetItem<K>[] {
  if (!socialContact) return [];
  const set = socialContact?.[key];
  if (!(set instanceof Set)) return [];

  const entries = Object.entries(filterParams) as [keyof ContactSetItem<K>, string][];

  if (entries.length === 0) return [...set] as ContactSetItem<K>[];

  return ([...set] as ContactSetItem<K>[]).filter((item) => {
    for (const [prop, expected] of entries) {
      if (getSubProperty(item, prop) !== expected) return false;
    }
    return true;
  });
}

export function getPropsByType<K extends ContactSetProperties>(socialContact: SocialContact, key: K, type: string): ContactSetItem<K>[] {
  return ([...socialContact[key] ?? []]).filter((el) => {
    return hasType(el) && el.type === type;
  }) as ContactSetItem<K>[]
}

export function getPropByNuri<K extends ContactSetProperties>(socialContact: SocialContact, key: K, nuri: string): ContactSetItem<K> | undefined {
  return ([...socialContact[key] ?? []]).find(item => item["@id"] === nuri) as ContactSetItem<K>;
}