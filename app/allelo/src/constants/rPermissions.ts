import {ContactLdSetProperties} from "@/utils/socialContact/contactUtils";
import {AccountRegistry} from "@/utils/accountRegistry.tsx";
import {defaultTemplates, extractTemplateProps} from "@/utils/templateRenderer.ts";
import {RCardPermission} from "@/.ldo/rcard.typings.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";

export type rCardZones = "top" | "bottom" | "middle";

export type PropertyConfig = {
  label?: string;
  displayProp?: string;
  template?: string;
  templateProp?: keyof ContactLdSetProperties;
  resolveTo?: string;
  type?: string;
  shareAll?: boolean;
  isMultiple?: boolean;
  separator?: string;
  filterParams?: any;
}
type ContactPermissionsConfig = Partial<Record<keyof ContactLdSetProperties, Record<string, PropertyConfig>>>;

export const rCardPermissionConfig: ContactPermissionsConfig = {
  name: {
    value: {
      label: "full name",
      displayProp: "value",
      template: defaultTemplates.contactName,
    },
    firstName: {displayProp: "firstName", resolveTo: defaultTemplates.contactName},
    familyName: {displayProp: "familyName", resolveTo: defaultTemplates.contactName},
    honorificPrefix: {displayProp: "honorificPrefix", resolveTo: defaultTemplates.contactName},
    honorificSuffix: {displayProp: "honorificSuffix", resolveTo: defaultTemplates.contactName},
    maidenName: {displayProp: "maidenName"},
    phoneticFullName: {displayProp: "phoneticFullName"},
  },
  phoneNumber: {
    value: {displayProp: "value", isMultiple: true},
    "value^mobile": {displayProp: "value", type: "mobile", isMultiple: true},
    "value^work": {displayProp: "value", type: "work", isMultiple: true},
    "value^other": {displayProp: "value", type: "other", isMultiple: true},
  },
  email: {
    value: {displayProp: "value", isMultiple: true},
    "value^home": {displayProp: "value", type: "home", isMultiple: true},
    "value^work": {displayProp: "value", type: "work", isMultiple: true},
    "value^other": {displayProp: "value", type: "other", isMultiple: true},
  },
  address: {
    value: {
      label: "full address",
      displayProp: "value",
      template: defaultTemplates.address,
    },
    city: {displayProp: "city", resolveTo: defaultTemplates.address},
    country: {displayProp: "country", resolveTo: defaultTemplates.address},
    extendedAddress: {displayProp: "extendedAddress", resolveTo: defaultTemplates.address},
    postalCode: {displayProp: "postalCode", resolveTo: defaultTemplates.address},
  },
  nickname: {
    value: {displayProp: "value"},
  },
  organization: {
    value: {displayProp: "value"},
    domain: {displayProp: "domain"},
    location: {displayProp: "location"},
  },
  url: {
    value: {displayProp: "value", isMultiple: true},
    "value^linkedin": {displayProp: "value", type: "linkedin", isMultiple: true},
    "value^blog": {displayProp: "value", type: "blog", isMultiple: true},
    "value^homepage": {displayProp: "value", type: "homepage", isMultiple: true},
    "value^work": {displayProp: "value", type: "work", isMultiple: true},
    "value^other": {displayProp: "value", type: "other", isMultiple: true},
  },
  biography: {
    value: {displayProp: "value"},
  },
  headline: {
    value: {
      displayProp: "value",
      template: defaultTemplates.headline,
      templateProp: "organization",
    },
  },
  photo: {
    value: {displayProp: "value"},
  },
  tag: {
    valueIRI: {template: "#{{valueIRI}}", isMultiple: true, separator: " "},
  },
  interest: {
    value: {displayProp: "value", isMultiple: true, separator: ", "},
  },
  account: Object.fromEntries(
    AccountRegistry.getAllProtocols().map(protocol => [
      `value^${protocol}`,
      {displayProp: "value", isMultiple: true, filterParams: {protocol}}
    ])
  ),
  birthday: {
    valueDate: {displayProp: "valueDate"},
  },
  education: {
    value: {template: "{{value}}: {{degreeName}}, {{activities}}"},
  },
  language: {
    valueIRI: {template: "{{valueIRI}} ({{proficiency}})", isMultiple: true, separator: ", "},
  },
  publication: {
    value: {template: "{{value}}: {{publishDate}}, {{description}}, {{publisher}}, {{url}}"},
  },
  industry: {
    value: {displayProp: "value"},
  },
  project: {
    value: {template: "{{value}} {{description}} {{url}}"},
  },
};

export function getPermissionConfig(permission: RCardPermission): PropertyConfig {
  const firstLevel = permission.firstLevel as keyof ContactLdSetProperties;
  let secondLevel = permission.secondLevel ?? "*";
  if (permission.selector) {
    secondLevel += "^" + permission.selector;
  }

  const config = (rCardPermissionConfig[firstLevel] ?? {})[secondLevel];
  if (!config) {
    console.log(`Missing permission config for ${firstLevel}: ${secondLevel}`);
  }

  return config ?? {};
}

export function getPermissionId (permission: RCardPermission) {
  return `${permission.firstLevel}-${permission.secondLevel}-${permission.selector ?? ""}`;
}

function getPermission(firstLevel: keyof ContactLdSetProperties, secondLevel: string, zone?: rCardZones, selector?: string): RCardPermission {
  const permission: RCardPermission = {firstLevel, secondLevel,  selector, zone: {"@id": zone ?? "middle"}};
  const config = getPermissionConfig(permission);

  if (config.template) {
    const firstLevel = config.templateProp ?? permission.firstLevel;
    permission.triple = new BasicLdSet(extractTemplateProps(config.template).map(secondLevel => {
      return {firstLevel, secondLevel};
    }));
  }
  return permission;
}

function getAccountPermissions(zone?: rCardZones): RCardPermission[] {
  return AccountRegistry.getAllProtocols().map(protocol =>
    getPermission("account", "value", zone, protocol)
  );
}

/**
 * Default permissions - minimal information visibility
 * Suitable for strangers, acquaintances, or public contacts
 */
export const defaultPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "top"),
  getPermission("name", "familyName", "top"),
  getPermission("name", "honorificPrefix", "middle"),
  getPermission("name", "honorificSuffix", "middle"),
  getPermission("phoneNumber", "value", "top", "mobile"),
  getPermission("phoneNumber", "value", "middle"),
  getPermission("email", "value", "middle"),
  getPermission("address", "value", "top"),
  getPermission("address", "city", "top"),
  getPermission("address", "country", "top"),
  getPermission("nickname", "value", "middle"),
  getPermission("organization", "value", "top"),
  getPermission("url", "value", "middle", "linkedin"),
  getPermission("url", "value", "middle", "blog"),
  getPermission("url", "value", "middle", "homepage"),
  getPermission("biography", "value", "middle"),
  getPermission("headline", "value", "top"),
  getPermission("photo", "value", "middle"),
  getPermission("tag", "valueIRI", "top"),
  getPermission("interest", "value", "middle"),
  ...getAccountPermissions("middle"),
];

/**
 * Friends permissions - high visibility
 * Share most personal information with friends
 */
export const friendsPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "middle"),
  getPermission("name", "familyName", "middle"),
  getPermission("name", "honorificSuffix", "middle"),
  getPermission("name", "maidenName", "middle"),
  getPermission("phoneNumber", "value", "top"),
  getPermission("phoneNumber", "value", "top", "mobile"),
  getPermission("email", "value", "top"),
  getPermission("email", "value", "bottom", "home"),
  getPermission("email", "value", "bottom", "work"),
  getPermission("address", "value", "bottom"),
  getPermission("address", "extendedAddress", "bottom"),
  getPermission("address", "city", "bottom"),
  getPermission("address", "postalCode", "bottom"),
  getPermission("nickname", "value", "top"),
  getPermission("url", "value", "bottom", "homepage"),
  getPermission("url", "value", "middle", "blog"),
  getPermission("url", "value", "middle", "other"),
  getPermission("birthday", "valueDate", "top"),
  getPermission("headline", "value", "middle"),
  getPermission("photo", "value", "top"),
  getPermission("interest", "value", "middle"),
  ...getAccountPermissions("top"),
];

/**
 * Family permissions - highest visibility
 * Share all personal information with family members
 */
export const familyPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "middle"),
  getPermission("name", "familyName", "middle"),
  getPermission("name", "honorificSuffix", "middle"),
  getPermission("name", "maidenName", "middle"),
  getPermission("phoneNumber", "value", "top"),
  getPermission("phoneNumber", "value", "top", "mobile"),
  getPermission("email", "value", "top"),
  getPermission("email", "value", "top", "home"),
  getPermission("email", "value", "middle", "work"),
  getPermission("address", "value", "middle"),
  getPermission("address", "extendedAddress", "middle"),
  getPermission("address", "city", "middle"),
  getPermission("address", "postalCode", "middle"),
  getPermission("headline", "value", "middle"),
  getPermission("nickname", "value", "top"),
  getPermission("birthday", "valueDate", "top"),
  getPermission("url", "value", "middle", "homepage"),
  getPermission("url", "value", "bottom", "blog"),
  getPermission("url", "value", "middle", "other"),
  getPermission("photo", "value", "top"),
  getPermission("interest", "value", "middle"),
  ...getAccountPermissions("top"),
];

/**
 * Community permissions - moderate visibility
 * Share basic contact information for community interactions
 */
export const communityPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "top"),
  getPermission("name", "familyName", "top"),
  getPermission("name", "honorificSuffix", "middle"),
  getPermission("email", "value", "top"),
  getPermission("nickname", "value", "middle"),
  getPermission("phoneNumber", "value", "top"),
  getPermission("url", "value", "bottom", "linkedin"),
  getPermission("headline", "value", "top"),
  getPermission("education", "value", "middle"),
  getPermission("language", "valueIRI", "middle"),
  getPermission("publication", "value", "middle"),
  getPermission("interest", "value", "middle"),
  ...getAccountPermissions("bottom"),
];

/**
 * Business permissions - professional visibility
 * Share work-related information with business contacts
 */
export const businessPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "top"),
  getPermission("name", "familyName", "top"),
  getPermission("name", "honorificPrefix", "middle"),
  getPermission("name", "honorificSuffix", "middle"),
  getPermission("name", "phoneticFullName", "middle"),
  getPermission("phoneNumber", "value", "top", "other"),
  getPermission("phoneNumber", "value", "middle", "work"),
  getPermission("email", "value", "top", "other"),
  getPermission("email", "value", "top", "work"),
  getPermission("organization", "domain", "top"),
  getPermission("organization", "location", "bottom"),
  getPermission("address", "value", "bottom"),
  getPermission("address", "extendedAddress", "bottom"),
  getPermission("address", "city", "bottom"),
  getPermission("address", "postalCode", "bottom"),
  getPermission("address", "country", "bottom"),
  getPermission("url", "value", "top", "linkedin"),
  getPermission("url", "value", "bottom", "work"),
  getPermission("headline", "value", "top"),
  getPermission("industry", "value", "middle"),
  getPermission("education", "value", "middle"),
  getPermission("project", "value", "middle"),
  getPermission("publication", "value", "middle"),
  ...getAccountPermissions("bottom"),
];