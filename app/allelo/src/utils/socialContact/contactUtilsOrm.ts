import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {defaultPolicy} from "@/config/sources.ts";

export const contactCommonProperties = [
  "@id",
  "@graph",
  "@type",
  "naoStatus",
  "invitedAt",
  "createdAt",
  "updatedAt",
  "joinedAt",
  "centralityScore",
  "mostRecentInteraction"
] as const satisfies readonly (keyof SocialContact)[];

export type ContactLdSetProperties = Omit<
  SocialContact,
  (typeof contactCommonProperties)[number]
>;

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

  let selectedItem: ItemOf<K> | undefined;;
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