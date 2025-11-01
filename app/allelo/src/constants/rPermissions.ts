import {ContactLdSetProperties} from "@/utils/socialContact/contactUtils";
import {AccountRegistry} from "@/utils/accountRegistry.tsx";
import {defaultTemplates} from "@/utils/templateRenderer.ts";

export type rCardZones = "top" | "bottom" | "middle";

export type PropertyConfig = {
  label?: string;
  displayProp?: string;
  template?: string;
  templateProp?: keyof ContactLdSetProperties;
  resolveTo?: string;
  zone?: rCardZones;
  type?: string;
  order?: number;
  isPermissionGiven?: boolean;
  isMultiple?: boolean;
  separator?: string;
  filterParams?: any;
}
export type ContactPermissions = Partial<Record<keyof ContactLdSetProperties, PropertyConfig[]>>;

function getAccountPermissions(zone?: rCardZones): PropertyConfig[] {
  return AccountRegistry.getAllProtocols().map(protocol => {
    return {displayProp: "value", isMultiple: true, filterParams: {protocol}, zone};
  })
}

/**
 * Default permissions - minimal information visibility
 * Suitable for strangers, acquaintances, or public contacts
 */
export const defaultPermissions: ContactPermissions = {
  name: [
    {
      label: "full name",
      displayProp: "value",
      zone: "top",
      template: defaultTemplates.contactName,
    },
    {displayProp: "firstName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "familyName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificPrefix", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificSuffix", zone: "middle", resolveTo: defaultTemplates.contactName},
  ],
  phoneNumber: [
    {displayProp: "value", zone: "top", type: "mobile", isMultiple: true},
    {displayProp: "value", zone: "middle"},
  ],
  email: [
    {displayProp: "value", zone: "middle"},
  ],
  address: [
    {label: "full address", displayProp: "value", zone: "top", template: defaultTemplates.address},
    {displayProp: "city", zone: "top", resolveTo: defaultTemplates.address},
    {displayProp: "country", zone: "top", resolveTo: defaultTemplates.address},
  ],
  nickname: [
    {displayProp: "value", zone: "middle"},
  ],
  organization: [{displayProp: "value", zone: "top"}],
  url: [
    {displayProp: "value", zone: "middle", type: "linkedin"},
    {displayProp: "value", zone: "middle", type: "blog"},
    {displayProp: "value", zone: "middle", type: "homepage"},
  ],
  biography: [{displayProp: "value", zone: "middle"}],
  headline: [
    {displayProp: "value", zone: "top", template: defaultTemplates.headline, templateProp: "organization"},
  ],
  photo: [{displayProp: "value", zone: "middle"}],
  tag: [{template: "#{{valueIRI}}", zone: "top", isMultiple: true, separator: " "}],
  interest: [{displayProp: "value", isMultiple: true, separator: ", ", zone: "middle"}],
  account: getAccountPermissions("middle"),
};

/**
 * Friends permissions - high visibility
 * Share most personal information with friends
 */
export const friendsPermissions: ContactPermissions = {
  name: [
    {
      label: "full name",
      displayProp: "value",
      zone: "top",
      template: defaultTemplates.contactName,
    },
    {displayProp: "firstName", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "familyName", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificSuffix", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "maidenName", zone: "middle"},
  ],
  phoneNumber: [
    {displayProp: "value", zone: "top"},
    {displayProp: "value", zone: "top", type: "mobile"},//TODO type (multiple?)
  ],
  email: [
    {displayProp: "value", zone: "top"},
    {displayProp: "value", zone: "bottom", type: "home"},
    {displayProp: "value", zone: "bottom", type: "work"}
  ],
  address: [
    {label: "full address", displayProp: "value", zone: "bottom", template: defaultTemplates.address},
    {displayProp: "extendedAddress", zone: "bottom", resolveTo: defaultTemplates.address},
    {displayProp: "city", zone: "bottom", resolveTo: defaultTemplates.address},
    {displayProp: "postalCode", zone: "bottom", resolveTo: defaultTemplates.address},
  ],
  nickname: [
    {displayProp: "value", zone: "top"},
  ],
  url: [
    {displayProp: "value", zone: "bottom", type: "homepage"},
    {displayProp: "value", zone: "middle", type: "blog"},
    {displayProp: "value", zone: "middle", type: "other"},
  ],
  birthday: [
    {displayProp: "value", zone: "top"},
  ],
  headline: [
    {displayProp: "value", zone: "middle", template: defaultTemplates.headline, templateProp: "organization"},
  ],
  photo: [{displayProp: "value", zone: "top"}],
  interest: [{displayProp: "value", isMultiple: true, separator: ", ", zone: "middle"}],
  account: getAccountPermissions("top"),
};

/**
 * Family permissions - highest visibility
 * Share all personal information with family members
 */
export const familyPermissions: ContactPermissions = {
  name: [
    {
      label: "full name",
      displayProp: "value",
      zone: "top",
      template: defaultTemplates.contactName,
    },
    {displayProp: "firstName", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "familyName", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificSuffix", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "maidenName", zone: "middle"},
  ],
  phoneNumber: [
    {displayProp: "value", zone: "top"},
    {displayProp: "value", zone: "top", type: "mobile"},//TODO type (multiple?)
  ],
  email: [
    {displayProp: "value", zone: "top"},
    {displayProp: "value", zone: "top", type: "home"},
    {displayProp: "value", zone: "middle", type: "work"}
  ],
  address: [
    {displayProp: "value", zone: "middle", template: defaultTemplates.address},
    {displayProp: "extendedAddress", zone: "middle", resolveTo: defaultTemplates.address},
    {displayProp: "city", zone: "middle", resolveTo: defaultTemplates.address},
    {displayProp: "postalCode", zone: "middle", resolveTo: defaultTemplates.address},
  ],
  headline: [
    {displayProp: "value", zone: "middle", template: defaultTemplates.headline, templateProp: "organization"},
  ],
  nickname: [
    {displayProp: "value", zone: "top"},
  ],
  birthday: [
    {displayProp: "value", zone: "top"},
  ],
  url: [
    {displayProp: "value", zone: "middle", type: "homepage"},
    {displayProp: "value", zone: "bottom", type: "blog"},
    {displayProp: "value", zone: "middle", type: "other"},
  ],
  photo: [{displayProp: "value", zone: "top"}],
  interest: [{displayProp: "value", isMultiple: true, separator: ", ", zone: "middle"}],
  account: getAccountPermissions("top"),
};

/**
 * Community permissions - moderate visibility
 * Share basic contact information for community interactions
 */
export const communityPermissions: ContactPermissions = {
  name: [
    {
      label: "full name",
      displayProp: "value",
      zone: "top",
      template: defaultTemplates.contactName,
    },
    {displayProp: "firstName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "familyName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificSuffix", zone: "middle", resolveTo: defaultTemplates.contactName},
  ],
  email: [
    {displayProp: "value", zone: "top"},
    //{displayProp: "value", zone: "top"},//TODO value other [e.g. community email] what's that?
  ],
  nickname: [
    {displayProp: "value", zone: "middle"},
  ],
  phoneNumber: [
    {displayProp: "value", zone: "top"},
  ],
  url: [
    {displayProp: "value", zone: "bottom", type: "linkedin"},
  ],
  headline: [
    {displayProp: "value", zone: "top", template: defaultTemplates.headline, templateProp: "organization"},
  ],
  education: [
    {template: "{{value}}: {{degreeName}}, {{activities}}", zone: "middle"},
  ],
  language: [
    {template: "{{valueIRI}} ({{proficiency}})", isMultiple: true, separator: ", ", zone: "middle"}
  ],
  publication: [
    {
      displayProp: "",
      template: "{{value}}: {{publishDate}}, {{description}}, {{publisher}}, {{url}}",
      zone: "middle",
    }
  ],
  interest: [{displayProp: "value", isMultiple: true, separator: ", ", zone: "middle"}],
  account: getAccountPermissions("bottom"),
};

/**
 * Business permissions - professional visibility
 * Share work-related information with business contacts
 */
export const businessPermissions: ContactPermissions = {
  name: [
    {
      label: "full name",
      displayProp: "value",
      zone: "top",
      template: defaultTemplates.contactName,
    },
    {displayProp: "firstName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "familyName", zone: "top", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificPrefix", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "honorificSuffix", zone: "middle", resolveTo: defaultTemplates.contactName},
    {displayProp: "phoneticfull name", zone: "middle", resolveTo: defaultTemplates.contactName},
  ],
  phoneNumber: [
    {displayProp: "value", zone: "top", type: "other"},
    {displayProp: "value", zone: "middle", type: "work"},
  ],
  email: [
    {displayProp: "value", zone: "top", type: "other"},
    {displayProp: "value", zone: "top", type: "work"},
  ],
  organization: [
    {displayProp: "domain", zone: "top"},
    {displayProp: "location", zone: "bottom"}
  ],
  address: [
    {label: "full address", displayProp: "value", zone: "bottom", template: defaultTemplates.address},
    {displayProp: "extendedAddress", zone: "bottom", resolveTo: defaultTemplates.address},
    {displayProp: "city", zone: "bottom", resolveTo: defaultTemplates.address},
    {displayProp: "postalCode", zone: "bottom", resolveTo: defaultTemplates.address},
    {displayProp: "country", zone: "bottom", resolveTo: defaultTemplates.address},
  ],
  url: [
    {displayProp: "value", zone: "top", type: "linkedin"},
    {displayProp: "value", zone: "bottom", type: "work"},
  ],
  headline: [{displayProp: "value", zone: "top", template: defaultTemplates.headline, templateProp: "organization"}],
  industry: [{displayProp: "value", zone: "middle"}],
  education: [
    {template: "{{value}}: {{degreeName}}, {{activities}}", zone: "middle"},
  ],
  project: [
    {template: "{{value}} {{description}} {{url}}", zone: "middle"},
  ],
  publication: [
    {template: "{{value}} {{publishDate}} {{description}} {{publisher}} {{url}}", zone: "middle"}
  ],
  account: getAccountPermissions("bottom"),
};