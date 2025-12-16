import { create } from 'zustand';
import {SocialContact} from "@/.orm/shapes/contact.typings";
import { resolveFrom, ResolvableKey, ItemOf } from "@/utils/socialContact/contactUtilsOrm";
import { renderTemplate, defaultTemplates } from "@/utils/templateRenderer";
import { useContactOrm } from "@/hooks/contacts/useContactOrm";

interface ContactOrmState {
  // Resolver functions
  resolveName: (contact: SocialContact | undefined, template?: string) => string;
  resolveField: <K extends ResolvableKey>(contact: SocialContact | undefined, key: K) => ItemOf<K> | undefined;
  resolveEmail: (contact: SocialContact | undefined) => string | undefined;
  resolvePhone: (contact: SocialContact | undefined) => string | undefined;
  resolveAddress: (contact: SocialContact | undefined) => string | undefined;
  resolveOrganization: (contact: SocialContact | undefined) => string | undefined;
  resolvePhoto: (contact: SocialContact | undefined) => string | undefined;
  // resolveGroupMemberData: (contact: SocialContact | undefined, groupId?: string | undefined) => InternalGroup | undefined;
}

export const useContactOrmStore = create<ContactOrmState>(() => ({
  /**
   * Resolves contact name using template renderer
   * Uses the default contactName template or a custom one
   */
  resolveName: (contact) => {
    if (!contact) return '';

    const name = resolveFrom(contact, 'name');
    return name?.value || renderTemplate(defaultTemplates.contactName, name)
  },

  /**
   * Generic field resolver using the resolveFrom utility
   */
  resolveField: <K extends ResolvableKey>(contact: SocialContact | undefined, key: K): ItemOf<K> | undefined => {
    if (!contact) return undefined;
    return resolveFrom(contact, key);
  },

  /**
   * Resolves primary email address
   */
  resolveEmail: (contact) => {
    if (!contact) return undefined;
    const emailItem = resolveFrom(contact, 'email');
    return emailItem?.value;
  },

  /**
   * Resolves primary phone number
   */
  resolvePhone: (contact) => {
    if (!contact) return undefined;
    const phoneItem = resolveFrom(contact, 'phoneNumber');
    return phoneItem?.value;
  },

  /**
   * Resolves primary address using template renderer
   */
  resolveAddress: (contact) => {
    if (!contact) return undefined;

    const addressItem = resolveFrom(contact, 'address');
    if (!addressItem) return undefined;

    return renderTemplate(defaultTemplates.address, addressItem);
  },

  /**
   * Resolves primary organization/affiliation
   */
  resolveOrganization: (contact) => {
    if (!contact) return undefined;
    const orgItem = resolveFrom(contact, 'organization');
    return orgItem?.value;
  },

  /**
   * Resolves primary photo IRI
   */
  resolvePhoto: (contact) => {
    if (!contact) return undefined;
    const photoItem = resolveFrom(contact, 'photo');
    return photoItem?.photoIRI;
  },

  // resolveGroupMemberData: (contact, groupId) => {
  //   if (!contact || !groupId) return undefined;
  //   const groups = contact.internalGroup;
  //   if (!groups) return;
  //
  //   for (const item of groups) {
  //     if (item.groupId === groupId) {
  //       return item;
  //     }
  //   }
  // },
}));

/**
 * Convenience hook that takes a nuri and returns resolved contact fields
 * Combines useContactOrm with field resolvers
 * Returns reactive values that update when the contact changes
 */
export function useResolvedContact(nuri: string | null | undefined, isProfile = false) {
  const { ormContact } = useContactOrm(nuri, isProfile);
  const {
    resolveName,
    resolveEmail,
    resolvePhone,
    resolveAddress,
    resolveOrganization,
    resolvePhoto,
    // resolveGroupMemberData
  } = useContactOrmStore();

  return {
    ormContact,
    name: resolveName(ormContact),
    email: resolveEmail(ormContact),
    phone: resolvePhone(ormContact),
    address: resolveAddress(ormContact),
    organization: resolveOrganization(ormContact),
    photo: resolvePhoto(ormContact),
    // groupMemberData: resolveGroupMemberData(ormContact, groupId),
  };
}