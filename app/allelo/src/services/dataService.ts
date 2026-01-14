import type {Group} from "@/types/group";
import {
  processContactFromJSON as processContactFromJSONOrm,
} from '@/utils/socialContact/contactUtilsOrm.ts';
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

// Get the base URL for assets based on the environment
const getAssetUrl = (path: string) => {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.startsWith("/") ? path.slice(1) : path}`;
};

export const dataService = {
  async getContactsOrm(): Promise<SocialContact[]> {
    const contacts = await this.loadContactsOrm();
    return contacts.filter(contact => (contact.mergedInto?.size ?? 0) === 0);
  },

  async loadContactsOrm(): Promise<SocialContact[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(getAssetUrl("contacts.json"));
          const contactsData = await response.json() as any[];
          const contacts = await Promise.all(
            contactsData.map(jsonContact => processContactFromJSONOrm(jsonContact))
          );

          resolve(contacts);
        } catch (error) {
          console.error("Failed to load contacts:", error);
          resolve([]);
        }
      }, 100);
    });
  },

  async getGroup(id: string): Promise<Group | undefined> {
    return;
  },
};
