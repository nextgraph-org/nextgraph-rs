import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useMemo} from "react";
import {ContactSetProperties} from "@/utils/socialContact/contactUtilsOrm.ts";
import {getPermissionConfig, getPermissionId, rCardPermissionConfig} from "@/constants/rPermissions.ts";
import {RCard, RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {profileService} from "@/services/profileService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {contactDictMapper} from "@/utils/dictMappers.ts";

interface UpdatePermissionReturn {
  updatePermissionsNode: (propertyKey: ContactSetProperties, propertyNuri?: string) => void;
  isProfile: boolean;
  updateProfilePermissionNodes: (newProfile?: SocialContact) => void;
  removePermissionNode: (propertyNuri?: string) => void;
}

function filterBy<T extends Record<string, any>>(
  propertyKey: ContactSetProperties,
  items: T[],
  filterParams?: Partial<T>
) {
  if (!filterParams) return items;
  return items.filter(item =>
    Object.entries(filterParams).every(
      ([key, expected]) => {
        let itemValue = item[key as keyof T] as string;
        if (contactDictMapper.isDictProperty(propertyKey, key)) {
          itemValue = contactDictMapper.removePrefix(itemValue);
        }

        if (typeof expected === "object") {
          return !expected.notIn.includes(itemValue);
        }

        return itemValue === expected
      }
    )
  );
}

export const useUpdatePermission = (profile?: SocialContact, isNewProfile: boolean = false): UpdatePermissionReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {rCards} = useGetRCards();

  const {ormContact: contact} = useContactOrm(null, true);

  const isProfile: boolean = useMemo<boolean>(() => isNewProfile || profileService.isContactProfile(session, profile),
    [profile, session, isNewProfile]);

  const addPermissionWithNode = useCallback((rCard: RCard, permission: RCardPermission, propertyNuri: string) => {
    rCard.permission!.add({
      "@graph": "",
      "@id": "",
      node: propertyNuri,
      firstLevel: permission.firstLevel,
      secondLevel: permission.secondLevel,
      selector: permission.selector,
      isPermissionGiven: false,
      zone: permission.zone,
      order: permission.order,
      isMultiple: permission.isMultiple,
    })
  }, []);

  const addPermissionsWithNodes = useCallback((rCard: RCard, permission: RCardPermission, nuris: string[]) => {
    nuris.forEach((nuri) => addPermissionWithNode(rCard, permission, nuri));
  }, [addPermissionWithNode]);

  const removePermissionNode = useCallback((
    propertyNuri?: string
  ) => {
    [...rCards].forEach(rCard => {
      if (!rCard.permission) return;
      const allPermissions = [...rCard.permission];
      const permissions = allPermissions.filter(permission => permission.node === propertyNuri);
      permissions.forEach(permission => {
        const permissionId = getPermissionId(permission);
        const similarPermission = allPermissions.find(permission =>
          getPermissionId(permission) === permissionId && permission.node !== propertyNuri);
        if (similarPermission) {
          rCard.permission!.delete(permission);
        } else {
          permission.node = "";
        }
      });
    });
  }, [rCards]);

  const updatePermissionsNode = useCallback((
    propertyKey: ContactSetProperties,
    propertyNuri?: string,
    newProfile?: SocialContact
  ) => {
    if (!isProfile) return;
    const properties = [...(contact ?? newProfile)[propertyKey] ?? []];
    if (!propertyNuri && !properties.length) return;

    [...rCards].forEach(rCard => {
      if (!rCard.permission) return;
      const permissions = [...rCard.permission ?? []]
        .filter(permission => permission.firstLevel === propertyKey);

      const foundPermissions: string[] = [];

      permissions.forEach(permission => {
        const permissionId = getPermissionId(permission);
        if (foundPermissions.includes(permissionId)) return;
        foundPermissions.push(permissionId);
        const permissionConfig = getPermissionConfig(permission);
        const filteredProperties  = filterBy(propertyKey, properties, permissionConfig.filterParams);
        const allNuris: string[] = filteredProperties.map(prop => prop["@id"]);

        if (permissionConfig.isMultiple) {
          function getMissingNuris(): string[] {
            if (propertyNuri) return [propertyNuri];
            const allNodes = permissions
              .map(p => getPermissionId(p) === permissionId && p.node)
              .filter(Boolean);
            return allNuris.filter(nuri => !allNodes.includes(nuri));
          }
          const missingNuris = getMissingNuris();
          permission.node ??= missingNuris.shift();
          addPermissionsWithNodes(rCard, permission, missingNuris);
        } else {
          permission.node = propertyNuri ?? allNuris[0];
        }
      });
    })
  }, [isProfile, rCards, contact, addPermissionsWithNodes]);

  const updateProfilePermissionNodes = useCallback((newProfile?: SocialContact) => {
    const propertyKeys = Object.keys(rCardPermissionConfig) as ContactSetProperties[];
    propertyKeys.forEach(propertyKey => {
      updatePermissionsNode(propertyKey, undefined, newProfile);
    });
  }, [updatePermissionsNode]);

  return {
    updatePermissionsNode,
    isProfile,
    updateProfilePermissionNodes,
    removePermissionNode
  }
}
