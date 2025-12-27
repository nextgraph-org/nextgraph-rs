import {SocialContact} from '@/.ldo/contact.typings';
import {Contact} from "@/types/contact";
import {contactContext} from "@/.ldo/contact.context";

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

// Process Contact from JSON to ensure LdSet properties are properly instantiated
export async function processContactFromJSON(jsonContact: any, withIds = true): Promise<Contact> {
  return {} as Contact;
}


const allProperties = Object.keys((contactContext.Individual as any)["@context"]);
const excludedProperties = contactCommonProperties.map(prop => prop as string);
export const contactLdSetProperties = allProperties.filter(prop => !excludedProperties.includes(prop)) as (keyof ContactLdSetProperties)[];