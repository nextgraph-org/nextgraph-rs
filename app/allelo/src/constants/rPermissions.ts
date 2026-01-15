import {AccountRegistry} from "@/utils/accountRegistry.tsx";
import {defaultTemplates, extractTemplateProps} from "@/utils/templateRenderer.ts";
import {RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {rCardDictMapper} from "@/utils/dictMappers.ts";
import {ContactSetProperties} from "@/utils/socialContact/contactUtilsOrm.ts";

export type rCardZones = "top" | "bottom" | "middle";

export type PropertyConfig = {
  label?: string;
  displayProp?: string;
  template?: string;
  templateProp?: ContactSetProperties;
  resolveTo?: string;
  shareAll?: boolean;
  isMultiple?: boolean;
  separator?: string;
  filterParams?: Record<string, any>;
}
type ContactPermissionsConfig = Partial<Record<ContactSetProperties, Record<string, PropertyConfig>>>;

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
    value: {displayProp: "value", isMultiple: true, filterParams: {type: {notIn: ["mobile", "work", "other"]}}},
    "value^mobile": {displayProp: "value", filterParams: {type: "mobile"}, isMultiple: true},
    "value^work": {displayProp: "value", filterParams: {type: "work"}, isMultiple: true},
    "value^other": {displayProp: "value", filterParams: {type: "other"}, isMultiple: true},
  },
  email: {
    value: {displayProp: "value", isMultiple: true, filterParams: {type: {notIn: ["home", "work", "other"]}}},
    "value^home": {displayProp: "value", filterParams: {type: "home"}, isMultiple: true},
    "value^work": {displayProp: "value", filterParams: {type: "work"}, isMultiple: true},
    "value^other": {displayProp: "value", filterParams: {type: "other"}, isMultiple: true},
  },
  address: {
    value: {
      label: "full address",
      displayProp: "value",
      template: defaultTemplates.address,
      isMultiple: true
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
    location: {
      label: "organization location",
      displayProp: "location"
    },
  },
  url: {
    value: {
      displayProp: "value",
      isMultiple: true,
      filterParams: {type: {notIn: ["linkedin", "blog", "homepage", "work", "other"]}}
    },
    "value^linkedin": {displayProp: "value", filterParams: {type: "linkedin"}, isMultiple: true},
    "value^blog": {displayProp: "value", filterParams: {type: "blog"}, isMultiple: true},
    "value^homepage": {displayProp: "value", filterParams: {type: "homepage"}, isMultiple: true},
    "value^work": {displayProp: "value", filterParams: {type: "work"}, isMultiple: true},
    "value^other": {displayProp: "value", filterParams: {type: "other"}, isMultiple: true},
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
    valueIRI: {template: "#{{valueIRI}}", isMultiple: true, separator: " ", shareAll: true},
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
  const firstLevel = permission.firstLevel as ContactSetProperties;
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

export function getPermissionId(permission: RCardPermission) {
  return `${permission.firstLevel}-${permission.secondLevel}-${permission.selector ?? ""}`;
}

function getPermission(firstLevel: ContactSetProperties, secondLevel: string, zone: rCardZones, isPermissionGiven: boolean = true, selector?: string): RCardPermission {
  const permission: RCardPermission = {
    "@graph": "",
    "@id": "",
    firstLevel,
    secondLevel,
    selector,
    isPermissionGiven,
    zone: rCardDictMapper.appendPrefixToDictValue("permission", "zone", zone)!
  };
  const config = getPermissionConfig(permission);

  if (config.template) {
    const firstLevel = config.templateProp ?? permission.firstLevel;
    permission.triple = new Set(extractTemplateProps(config.template).map(secondLevel => {
      return {"@graph": "", "@id": "", firstLevel, secondLevel};
    }));
  }
  return permission;
}

function getAccountPermissions(zone: rCardZones): RCardPermission[] {
  return AccountRegistry.getAllProtocols().map(protocol =>
    getPermission("account", "value", zone, true,  protocol)
  );
}

/**
 * Default permissions - minimal information visibility
 * Suitable for strangers, acquaintances, or public contacts
 */
export const defaultPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "top", false),
  getPermission("name", "familyName", "top", false),
  getPermission("name", "honorificPrefix", "middle", false),
  getPermission("name", "honorificSuffix", "middle", false),
  getPermission("phoneNumber", "value", "top", true, "mobile"),
  getPermission("phoneNumber", "value", "middle"),
  getPermission("email", "value", "middle"),
  getPermission("address", "value", "top"),
  getPermission("address", "city", "top", false),
  getPermission("address", "country", "top", false),
  getPermission("nickname", "value", "middle", false),
  getPermission("organization", "value", "top", false),
  getPermission("url", "value", "middle"),
  getPermission("url", "value", "middle", true, "linkedin"),
  getPermission("url", "value", "middle", true, "blog"),
  getPermission("url", "value", "middle", true, "homepage"),
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
  getPermission("name", "firstName", "middle", false),
  getPermission("name", "familyName", "middle", false),
  getPermission("name", "honorificSuffix", "middle", false),
  getPermission("name", "maidenName", "middle", false),
  getPermission("phoneNumber", "value", "top"),
  getPermission("phoneNumber", "value", "top", true, "mobile"),
  getPermission("email", "value", "top"),
  getPermission("email", "value", "bottom", true, "home"),
  getPermission("email", "value", "bottom", true, "work"),
  getPermission("address", "value", "bottom"),
  getPermission("address", "extendedAddress", "bottom", false),
  getPermission("address", "city", "bottom", false),
  getPermission("address", "postalCode", "bottom", false),
  getPermission("nickname", "value", "top"),
  getPermission("url", "value", "bottom"),
  getPermission("url", "value", "bottom", true, "homepage"),
  getPermission("url", "value", "middle", true, "blog"),
  getPermission("url", "value", "middle", true, "other"),
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
  getPermission("name", "firstName", "middle", false),
  getPermission("name", "familyName", "middle", false),
  getPermission("name", "honorificSuffix", "middle", false),
  getPermission("name", "maidenName", "middle", false),
  getPermission("phoneNumber", "value", "top"),
  getPermission("phoneNumber", "value", "top", true, "mobile"),
  getPermission("email", "value", "top"),
  getPermission("email", "value", "top", true, "home"),
  getPermission("email", "value", "middle", true, "work"),
  getPermission("address", "value", "middle"),
  getPermission("address", "extendedAddress", "middle", false),
  getPermission("address", "city", "middle", false),
  getPermission("address", "postalCode", "middle", false),
  getPermission("headline", "value", "middle"),
  getPermission("nickname", "value", "top"),
  getPermission("birthday", "valueDate", "top"),
  getPermission("url", "value", "middle"),
  getPermission("url", "value", "middle", true, "homepage"),
  getPermission("url", "value", "bottom", true, "blog"),
  getPermission("url", "value", "middle", true, "other"),
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
  getPermission("name", "firstName", "top", false),
  getPermission("name", "familyName", "top", false),
  getPermission("name", "honorificSuffix", "middle", false),
  getPermission("email", "value", "top"),
  getPermission("nickname", "value", "middle"),
  getPermission("phoneNumber", "value", "top"),
  getPermission("url", "value", "bottom"),
  getPermission("url", "value", "bottom", true, "linkedin"),
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
  getPermission("name", "firstName", "top", false),
  getPermission("name", "familyName", "top", false),
  getPermission("name", "honorificPrefix", "middle", false),
  getPermission("name", "honorificSuffix", "middle", false),
  getPermission("name", "phoneticFullName", "middle", false),
  getPermission("phoneNumber", "value", "top"),
  getPermission("phoneNumber", "value", "top", true, "other"),
  getPermission("phoneNumber", "value", "middle", true, "work"),
  getPermission("email", "value", "top"),
  getPermission("email", "value", "top", true, "other"),
  getPermission("email", "value", "top", true, "work"),
  getPermission("organization", "domain", "top"),
  getPermission("organization", "location", "bottom"),
  getPermission("address", "value", "bottom", false),
  getPermission("address", "extendedAddress", "bottom", false),
  getPermission("address", "city", "bottom", false),
  getPermission("address", "postalCode", "bottom", false),
  getPermission("address", "country", "bottom", false),
  getPermission("url", "value", "top"),
  getPermission("url", "value", "top", true, "linkedin"),
  getPermission("url", "value", "bottom", true, "work"),
  getPermission("headline", "value", "top"),
  getPermission("industry", "value", "middle"),
  getPermission("education", "value", "middle"),
  getPermission("project", "value", "middle"),
  getPermission("publication", "value", "middle"),
  ...getAccountPermissions("bottom"),
];