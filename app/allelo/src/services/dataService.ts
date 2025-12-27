import type {Contact} from "@/types/contact";
import type {Group} from "@/types/group";
import {
  processContactFromJSON,
} from '@/utils/socialContact/contactUtils.ts';
import {
  processContactFromJSON as processContactFromJSONOrm,
} from '@/utils/socialContact/contactUtilsOrm.ts';
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

// Get the base URL for assets based on the environment
const getAssetUrl = (path: string) => {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.startsWith("/") ? path.slice(1) : path}`;
};

let draftProfile: Contact | undefined;

export const dataService = {
  async getDraftProfile() {
    if (!draftProfile) {
      const profileJson = {
        "@id": "myProfileId",
        "type": [
          {
            "@id": "Individual"
          }
        ],
      };
      draftProfile = await processContactFromJSON(profileJson);
      draftProfile.isDraft = true;
    }

    return draftProfile;
  },

  removeDraftProfile() {
    draftProfile = undefined;
  },

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

  async addContact(contact: Contact): Promise<Contact> {
    return {} as Contact;
  },

  async getContact(id: string): Promise<Contact | undefined> {
    return;
  },

  async getGroup(id: string): Promise<Group | undefined> {
    return;
  },

  async getDuplicatedContacts(): Promise<string[][]> {
    return [];
  },

  async acceptConnectionRequest(
    notificationId: string,
    selectedRCardId: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`✅ Accepted connection request ${notificationId} with rCard ${selectedRCardId}`);
        // Note: The actual contact ID would be passed from the notification service
        // For now, the notification service should call updateContactStatus directly
        // since it has access to the notification metadata with contactId
        resolve();
      }, 300);
    });
  },

  async rejectConnectionRequest(
    notificationId: string,
    contactId: string,
  ): Promise<void> {
    return;
  },

  updateProfile(updates: Partial<Contact>) {
  }
};
