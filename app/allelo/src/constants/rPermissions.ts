import {ContactLdSetProperties} from "@/utils/socialContact/contactUtils";
// import {AccountRegistry} from "@/utils/accountRegistry.tsx";
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
  },
  phoneNumber: {
    value: {displayProp: "value", isMultiple: true},
    "value^mobile": {displayProp: "value", type: "mobile", isMultiple: true},
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
    console.log(`Missing perrmission config for ${firstLevel}: ${secondLevel}`);
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

/**
 * Default permissions - minimal information visibility
 * Suitable for strangers, acquaintances, or public contacts
 */
export const defaultPermissions: RCardPermission[] = [
  getPermission("name", "value", "top"),
  getPermission("name", "firstName", "top"),
  getPermission("name", "familyName", "middle"),
  // getPermission("name", "honorificPrefix", "middle"),
  // getPermission("name", "honorificSuffix", "middle"),
  getPermission("phoneNumber", "value", "top"),
  // getPermission("phoneNumber", "value", "middle", "mobile"),
]


/**
 * Friends permissions - high visibility
 * Share most personal information with friends
 */
export const friendsPermissions: RCardPermission[] = [
  // getPermission("name", "value", "top"),
  // getPermission("name", "firstName", "middle"),
  // getPermission("name", "familyName", "middle"),
  // getPermission("phoneNumber", "value", "top"),
]

// function getAccountPermissions(zone?: rCardZones): PropertyConfig[] {
//   return AccountRegistry.getAllProtocols().map(protocol => {
//     return {displayProp: "value", isMultiple: true, filterParams: {protocol}, zone};
//   })
// }