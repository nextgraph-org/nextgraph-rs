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

interface UpdatePermissionReturn {
  updatePermissionsNode: (propertyKey: ContactSetProperties, propertyNuri?: string) => void;
  updatePermission: <K extends keyof RCardPermission>(permission: RCardPermission, propertyKey: K, value: RCardPermission[K]) => void;
  isProfile: boolean;
  updateProfilePermissionNodes: (newProfile?: SocialContact) => void
}

export const useUpdatePermission = (profile?: SocialContact, isNewProfile: boolean = false): UpdatePermissionReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {rCards} = useGetRCards();

  console.log(rCards);

  const {ormContact: contact} = useContactOrm(null, true);

  const isProfile: boolean = useMemo<boolean>(() => isNewProfile || profileService.isContactProfile(session, profile),
    [profile, session, isNewProfile]);

  const addPermissionsWithNodes = useCallback(async (rCard: RCard, permission: RCardPermission, nuris: string[]) => {
    if (!nuris.length) return;

    nuris.forEach(propertyNuri => {
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
    })
  }, []);


  const updatePermission = useCallback(<K extends keyof RCardPermission>(
    permission: RCardPermission, propertyKey: K, value: RCardPermission[K]) => {
    permission[propertyKey] = value;
  }, []);

  const updatePermissionsNode = useCallback(async (
    propertyKey: ContactSetProperties,
    propertyNuri?: string,
    newProfile?: SocialContact
  ) => {
    if (!isProfile) return;
    let allNuris: string[] = [];
    if (!propertyNuri) {
      if (!contact && (!isNewProfile || !newProfile)) return;
      const properties = (contact ?? newProfile)[propertyKey];
      allNuris = [...properties ?? []].map(r => r["@id"]);
      if (!allNuris.length) return;
    }

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
        if (permissionConfig.isMultiple) {
          if (permission.node) {
            const allNodes = permissions
              .map(p => getPermissionId(p) === permissionId && p.node)
              .filter(Boolean);
            const missingNuris = allNuris.filter(nuri => !allNodes.includes(nuri)) as string[];
            addPermissionsWithNodes(rCard, permission, missingNuris);
          } else {
            permission.node = propertyNuri ?? allNuris[0];
          }
        } else {
          permission.node = propertyNuri ?? allNuris[0];
        }
      });
    })
  }, [isProfile, rCards, contact, isNewProfile, addPermissionsWithNodes]);

  const updateProfilePermissionNodes = useCallback(async (newProfile?: SocialContact) => {
    const propertyKeys = Object.keys(rCardPermissionConfig) as ContactSetProperties[];
    propertyKeys.forEach(propertyKey => {
      updatePermissionsNode(propertyKey, undefined, newProfile);
    });
  }, [updatePermissionsNode]);

  return {
    updatePermissionsNode,
    updatePermission,
    isProfile,
    updateProfilePermissionNodes
  }
}
