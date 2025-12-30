import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ContactSetProperties} from "@/utils/socialContact/contactUtilsOrm.ts";
import {getPermissionConfig, getPermissionId, rCardPermissionConfig} from "@/constants/rPermissions.ts";
import {RCard, RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {profileService} from "@/services/profileService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {useShape} from "@ng-org/orm/react";
import {RCardPermissionShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";

interface UpdatePermissionReturn {
  updatePermissionsNode: (propertyKey: ContactSetProperties, propertyNuri?: string) => void;
  updatePermission: (permission: RCardPermission, propertyKey: keyof RCardPermission, value: string) => void;
  isProfile: boolean;
  updateProfilePermissionNodes: () => void
}

export const useUpdatePermission = (profile?: SocialContact, isNewProfile: boolean = false): UpdatePermissionReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {rCards} = useGetRCards();
  const [rCardPermissionId, setRCardPermissionId] = useState<string>();
  const currentChangesRef = useRef<Record<any, any> | undefined>(undefined);
  const rCardPermissionSet = useShape(RCardPermissionShapeType, rCardPermissionId);
  const rCardPermission = [...rCardPermissionSet][0] as RCardPermission;

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

  useEffect(() => {
    if (rCardPermissionId && rCardPermission && currentChangesRef.current) {
      Object.entries(currentChangesRef.current).forEach(([propertyKey, value]) => {
        rCardPermission[propertyKey] = value;
      })

      currentChangesRef.current = undefined;
      setRCardPermissionId(undefined);
    }
  }, [rCardPermissionId, rCardPermission, session]);


  const updatePermission = useCallback(<K extends keyof RCardPermission>(
    permission: RCardPermission, propertyKey: K, value: any) => {
    currentChangesRef.current = {[propertyKey]: value};
    setRCardPermissionId(permission["@id"]);
  }, []);

  const updatePermissionsNode = useCallback(async (
    propertyKey: ContactSetProperties,
    propertyNuri?: string
  ) => {
    if (!isProfile) return;
    let allNuris: string[] = [];
    if (!propertyNuri) {
      if (!contact) return;
      allNuris = Object.values(contact[propertyKey] ?? {}).map(r => r.id);
      if (!allNuris.length) return;
    }

    [...rCards].forEach(rCard => {
      if (!rCard.permission) return;
      const permissions = [...rCard.permission ?? []];

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
  }, [isProfile, rCards, contact, addPermissionsWithNodes]);

  const updateProfilePermissionNodes = useCallback(async () => {
    const propertyKeys = Object.keys(rCardPermissionConfig) as ContactSetProperties[];
    propertyKeys.forEach(propertyKey => {
      updatePermissionsNode(propertyKey);
    });
  }, [updatePermissionsNode]);

  return {
    updatePermissionsNode,
    updatePermission,
    isProfile,
    updateProfilePermissionNodes
  }
}
