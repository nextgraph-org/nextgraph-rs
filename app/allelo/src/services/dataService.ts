import type {Contact} from "@/types/contact";
import type {Group} from "@/types/group";
import {notificationService} from "./notificationService";
import {
  processContactFromJSON,
  resolveFrom
} from '@/utils/socialContact/contactUtils.ts';
import {BasicLdSet} from '@/lib/ldo/BasicLdSet';
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";

// Get the base URL for assets based on the environment
const getAssetUrl = (path: string) => {
  const base = import.meta.env.BASE_URL;
  return `${base}${path.startsWith("/") ? path.slice(1) : path}`;
};

interface RawGroup
  extends Omit<Group, "createdAt" | "updatedAt" | "latestPostAt"> {
  createdAt: string;
  updatedAt: string;
  latestPostAt?: string;
}

// Extended group interface for temporary groups with member details
interface ExtendedGroup extends Group {
  memberDetails?: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    status: string;
    joinedAt: Date | null;
  }[];
}

const temporaryGroups = new Map<string, ExtendedGroup>();

const hasCommonIdentifiers = (contactA: Contact, contactB: Contact): boolean => {
  // Check for common email addresses
  if (contactA.email && contactB.email) {
    const emailsA = contactA.email.toArray().map(email => email.value?.toLowerCase());
    const emailsB = contactB.email.toArray().map(email => email.value?.toLowerCase());

    for (const emailA of emailsA) {
      if (emailA && emailsB.includes(emailA)) {
        console.log(emailA);
        return true;
      }
    }
  }

  // Check for common phone numbers
  if (contactA.phoneNumber && contactB.phoneNumber) {
    const phonesA = contactA.phoneNumber.toArray().map(phone => phone.value);
    const phonesB = contactB.phoneNumber.toArray().map(phone => phone.value);

    for (const phoneA of phonesA) {
      if (phoneA && phonesB.includes(phoneA)) {
        console.log(phoneA);
        return true;
      }
    }
  }

  // Check for common account identifiers
  if (contactA.account && contactB.account) {
    const accountsA = contactA.account.toArray();
    const accountsB = contactB.account.toArray();

    for (const accountA of accountsA) {
      for (const accountB of accountsB) {
        if (accountA.value && accountB.value &&
          accountA.value === accountB.value &&
          accountA.protocol === accountB.protocol) {
          console.log(accountA);
          return true;
        }
      }
    }
  }

  return false;
};

let contacts: Contact[] = [];
let isLoaded = false;
let loadedWithIDs = false;
let draftContact: Contact | undefined;
let draftProfile: Contact | undefined;
const profile: Contact = {
  ["@id"]: "myProfileId",
  type: {
    //@ts-expect-error ldo wrong type here
    "@id": "Individual"
  },
  name: new BasicLdSet([{source: "user", "@id": "name1", value: "J. Doe", firstName: "John", familyName: "Doe", honorificPrefix: "Dr.", honorificSuffix: "Jr."}]),
  email: new BasicLdSet([{value: 'john.doe@example.com', source: "user", "@id": "profile"}]),
  phoneNumber: new BasicLdSet([{value: '+16783434343', source: "user", "@id": "profile"}]),
  //@ts-expect-error ldo wrong type here
  address: new BasicLdSet([
    {
      extendedAddress: '',
      postalCode: '0012',
      source: "user",
      "@id": "address1",
      country: "USA",
      city: "San Francisco",
      type2: new BasicLdSet([{"@id": "home"}]),

    },
  ]),
  biography: new BasicLdSet([{
    value: 'Passionate product manager with 8+ years of experience building user-centered products. I love connecting with fellow professionals and sharing insights about product strategy.',
    source: "user", "@id": "biography1"
  }]),
  //photo: new BasicLdSet([{value: 'images/Niko.jpg', source: "user", "@id": "photo1"}]),
  //@ts-expect-error ldo wrong type here
  url: new BasicLdSet([
    {
      value: 'https://www.blogger.com/about/?bpli=1',
      type2: new BasicLdSet([{"@id": "blog"}]),
      source: "user",
      "@id": "url1"
    },
    {
      value: 'https://www.linkedin.com/feed/',
      type2: new BasicLdSet([{"@id": "linkedin"}]),
      source: "user",
      "@id": "url2"
    },
  ]),
  account: new BasicLdSet(),
  organization: new BasicLdSet([{value: 'TechCorp', position: 'Product Manager', "@id": "org1"}]),
  //@ts-expect-error ldo wrong type here
  language: new BasicLdSet([
    {
      valueIRI: new BasicLdSet([{"@id": "en"}]),
      proficiency: new BasicLdSet([{"@id": "elementary"}]),
      "@id": "language1"
    },
    {
      valueIRI: new BasicLdSet([{"@id": "es"}]),
      proficiency: new BasicLdSet([{"@id": "limitedWork"}]),
      "@id": "language2"
    },
  ]),
  interest: new BasicLdSet([
    {value: 'AI', source: "user", "@id": "interest1"},
    {value: 'Music', source: "user", "@id": "interest3"},
  ])
}

const blockedContacts = new Set<string>();

type ContactUpdateListener = (contactId: string, contact: Contact | undefined) => void;
const contactUpdateListeners = new Set<ContactUpdateListener>();

const notifyContactUpdateListeners = (contactId: string, contact: Contact | undefined) => {
  contactUpdateListeners.forEach(listener => {
    try {
      listener(contactId, contact);
    } catch (err) {
      console.error("Failed to notify contact update listener:", err);
    }
  });
};

export const dataService = {
  async getDraftContact() {
    if (!draftContact) {
      const contactJson = {
        "type": [
          {
            "@id": "Individual"
          }
        ],
      };
      draftContact = await processContactFromJSON(contactJson);
      draftContact.isDraft = true;
    }

    return draftContact;
  },

  removeDraftContact() {
    draftContact = undefined;
  },

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

  async getContacts(withIds = true): Promise<Contact[]> {
    if (!isLoaded || withIds !== loadedWithIDs) await this.loadContacts(withIds);
    return contacts.filter(contact => (contact.mergedInto?.size ?? 0) === 0);
  },

  async loadContacts(withIds = true): Promise<Contact[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(getAssetUrl("contacts.json"));
          const contactsData = await response.json() as any[];
          contacts = await Promise.all(
            contactsData.map(jsonContact => processContactFromJSON(jsonContact, withIds))
          );

          contacts.push(profile);

          isLoaded = true;
          loadedWithIDs = withIds;
          resolve(contacts);
        } catch (error) {
          console.error("Failed to load contacts:", error);
          resolve([]);
        }
      }, 100);
    });
  },

  async addContact(contact: Contact): Promise<Contact> {
    return new Promise((resolve) => {
      setTimeout(() => {
        contacts.push(contact);
        resolve(contact);
      }, 100);
    });
  },

  async addContacts(allContacts: Contact[]): Promise<Contact[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        contacts.push(...allContacts);
        resolve(allContacts);
      }, 100);
    });
  },

  async getContact(id: string): Promise<Contact | undefined> {
    try {
      if (contacts.length === 0) {
        await this.getContacts();
      }

      return contacts.find((c: Contact) => c["@id"] === id);
    } catch (error) {
      console.error("Failed to load contact:", error);
      return;
    }
  },

  async getGroups(): Promise<Group[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(getAssetUrl("groups.json"));
          const groupsData = await response.json();
          const groups = groupsData.map((group: RawGroup) => {
            const {createdAt, updatedAt, latestPostAt, ...groupData} = group;
            const processedGroup: Group = {
              ...groupData,
              createdAt: new Date(createdAt),
              updatedAt: new Date(updatedAt),
              latestPostAt: latestPostAt ? new Date(latestPostAt) : undefined,
            };

            return processedGroup;
          });

          // Add temporary groups to the list
          const temporaryGroupsArray = Array.from(temporaryGroups.values());
          const allGroups = [...groups, ...temporaryGroupsArray];

          resolve(allGroups);
        } catch (error) {
          console.warn("Failed to load groups:", error);
          resolve([]);
        }
      }, 0);
    });
  },

  async getGroup(id: string): Promise<Group | undefined> {
    // First check if it's a temporary group (newly created)
    if (temporaryGroups.has(id)) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(temporaryGroups.get(id)), 300);
      });
    }

    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(getAssetUrl("groups.json"));
          const groupsData = await response.json();
          const group = groupsData.find((g: Group) => g.id === id);
          if (group) {
            const processedGroup = {
              ...(group as unknown as Group),
              createdAt: new Date(group.createdAt),
              updatedAt: new Date(group.updatedAt),
            };

            // Convert optional date fields if they exist
            if (group.latestPostAt) {
              processedGroup.latestPostAt = new Date(group.latestPostAt);
            }

            resolve(processedGroup);
          } else {
            resolve(undefined);
          }
        } catch (error) {
          console.error("Failed to load group:", error);
          resolve(undefined);
        }
      }, 300);
    });
  },

  async getGroupsForUser(userId: string): Promise<Group[]> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const response = await fetch(getAssetUrl("groups.json"));
          const groupsData = await response.json();
          const userGroups = groupsData
            .filter((group: RawGroup) => group.memberIds.includes(userId))
            .map((group: RawGroup) => {
              const {createdAt, updatedAt, latestPostAt, ...groupData} =
                group;
              const processedGroup: Group = {
                ...groupData,
                createdAt: new Date(createdAt),
                updatedAt: new Date(updatedAt),
                latestPostAt: latestPostAt ? new Date(latestPostAt) : undefined,
              };

              return processedGroup;
            });
          resolve(userGroups);
        } catch (error) {
          console.error("Failed to load user groups:", error);
          resolve([]);
        }
      }, 400);
    });
  },

  // Create a new group (temporary implementation for demo purposes)
  async createGroup(groupData: {
    name: string;
    description: string;
    logoPreview?: string;
    tags: string[];
    members: string[];
  }): Promise<Group> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const contacts = (await dataService.getContacts()).filter((contact) =>
          groupData.members.includes(contact['@id'] || ''),
        );
        const groupId = `group-${Date.now()}`;
        const newGroup: ExtendedGroup = {
          id: groupId,
          name: groupData.name,
          description: groupData.description,
          image: groupData.logoPreview || "",
          tags: groupData.tags,
          isPrivate: false,
          memberCount: groupData.members.length + 1, // +1 for creator
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "current-user",
          // Additional fields that might be needed
          memberIds: ["current-user", ...groupData.members],
          // Store member details for demo purposes
          memberDetails: [
            {
              id: "oli-sb",
              name: "Oliver Sylvester-Bradley",
              avatar: "images/Oli.jpg",
              role: "Admin",
              status: "Member",
              joinedAt: new Date(),
            },
            ...contacts.map((contact: Contact) => {
              const name = resolveFrom(contact, 'name');
              const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);
              return {
                id: contact['@id'] || '',
                name: displayName || 'Unknown',
                role: "Member",
                status: "Invited",
                joinedAt: null,
              };
            }),
          ],
        };

        // Store temporarily
        temporaryGroups.set(groupId, newGroup);

        // Send group invitation notifications to all selected members
        for (const member of contacts) {
          try {
            await notificationService.createNotification({
              userId: member['@id'] || '',
              type: "group_invite",
              title: `You've been invited to join "${groupData.name}"`,
              message: `${newGroup.createdBy} has invited you to join the group "${groupData.name}". ${groupData.description ? groupData.description : "Join to connect with other members!"}`,
              actionUrl: `/groups/${groupId}/join`, // URL for accepting the invitation
              metadata: {
                groupId: groupId,
                groupName: groupData.name,
                inviterName: newGroup.createdBy,
                inviterId: "current-user",
                invitedAt: new Date().toISOString(),
                canAccept: true,
                canDecline: true,
              },
            });
            console.log(
              `📧 Group invitation notification sent to ${resolveFrom(member, 'name')?.value} (${member['@id']}) for group "${groupData.name}"`,
            );
          } catch (error) {
            console.error(
              `Failed to send invitation notification to ${member.name}:`,
              error,
            );
          }
        }

        console.log(
          `✅ Group "${groupData.name}" created successfully with ${groupData.members.length} invitation notifications sent`,
        );

        resolve(newGroup);
      }, 500);
    });
  },

  // Get temporary group data (for passing to GroupInfoPage)
  getTemporaryGroupData(groupId: string) {
    return temporaryGroups.get(groupId);
  },

  // Handle group invitation response
  async respondToGroupInvitation(
    groupId: string,
    userId: string,
    response: "accept" | "decline",
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const group = temporaryGroups.get(groupId);
          const extendedGroup = group as ExtendedGroup;
          if (!group || !extendedGroup.memberDetails) {
            reject(new Error("Group not found"));
            return;
          }

          const memberDetails = extendedGroup.memberDetails;
          const memberIndex = memberDetails.findIndex((m) => m.id === userId);

          if (memberIndex === -1) {
            reject(new Error("Member not found in group"));
            return;
          }

          if (response === "accept") {
            // Update member status to 'Member' and set joinedAt date
            memberDetails[memberIndex] = {
              ...memberDetails[memberIndex],
              status: "Member",
              joinedAt: new Date(),
            };

            // Update group member count if needed
            const updatedGroup = {
              ...group,
              memberDetails: memberDetails,
            };
            temporaryGroups.set(groupId, updatedGroup);

            console.log(
              `✅ ${memberDetails[memberIndex].name} accepted invitation to group "${group.name}"`,
            );
          } else {
            // Remove member from group
            memberDetails.splice(memberIndex, 1);

            const updatedGroup = {
              ...group,
              memberCount: memberDetails.length,
              memberDetails: memberDetails,
            };
            temporaryGroups.set(groupId, updatedGroup);

            console.log(
              `❌ ${memberDetails[memberIndex].name} declined invitation to group "${group.name}"`,
            );
          }

          resolve();
        } catch (error) {
          console.error("Failed to process group invitation response:", error);
          reject(error);
        }
      }, 300);
    });
  },

  async updateContact(
    contactId: string,
    updates: Partial<Contact>,
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const contact = await this.getContact(contactId);
          if (contact) {
            Object.assign(contact, updates);
          }
          notifyContactUpdateListeners(contactId, contact);
          console.log(`📝 Updated contact ${contactId}:`, updates);
          resolve();
        } catch (error) {
          console.error("Failed to update contact:", error);
          throw error;
        }
      }, 100);
    });
  },

  async getDuplicatedContacts(): Promise<string[][]> {
    const allContacts = await this.getContacts();
    const groups: string[][] = [];
    const assigned = new Set<string>();

    for (const contact of allContacts) {
      const contactId = contact['@id'];
      if (!contactId || assigned.has(contactId)) continue;

      // Find all contacts connected to this one (including transitively)
      const group = new Set<string>([contactId]);
      const toCheck = [contact];

      while (toCheck.length > 0) {
        const currentContact = toCheck.pop()!;

        for (const otherContact of allContacts) {
          const otherId = otherContact['@id'];
          if (!otherId || group.has(otherId)) continue;

          if (hasCommonIdentifiers(currentContact, otherContact)) {
            group.add(otherId);
            toCheck.push(otherContact);
          }
        }
      }

      if (group.size > 1) {
        groups.push(Array.from(group));
        group.forEach(id => assigned.add(id));
      }
    }

    return groups;
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
    return new Promise((resolve) => {
      setTimeout(() => {
        // Add to blocked list and persist
        blockedContacts.add(contactId);
        console.log(`🚫 Rejected connection request ${notificationId} and blocked contact ${contactId}`);
        resolve();
      }, 300);
    });
  },

  isContactBlocked(contactId: string): boolean {
    return blockedContacts.has(contactId);
  },

  unblockContact(contactId: string): void {
    blockedContacts.delete(contactId);
    console.log(`✅ Unblocked contact ${contactId}`);
  },

  // Update contact NAO status
  updateContactStatus(contactId: string, newStatus: string): void {
    this.updateContact(contactId, {naoStatus: {value: newStatus}});
    console.log(`📝 Updated contact ${contactId} status to ${newStatus}`);
  },

  async sendConnectionRequest(contactId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`📤 Sent connection request to contact ${contactId}`);
        // In a real app, this would create a notification on the recipient's end
        resolve();
      }, 300);
    });
  },
  subscribeToContactUpdates(listener: ContactUpdateListener): () => void {
    contactUpdateListeners.add(listener);
    return () => {
      contactUpdateListeners.delete(listener);
    };
  },
  getProfile(): Contact {
    return profile;
  },
  updateProfile(updates: Partial<Contact>): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          Object.assign(profile, updates);
          notifyContactUpdateListeners("myProfileId", profile);
          resolve();
        } catch (error) {
          console.error("Failed to update profile:", error);
          throw error;
        }
      }, 100);
    });
  },
};
