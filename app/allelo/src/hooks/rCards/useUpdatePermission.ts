import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ContactSetProperties} from "@/utils/socialContact/contactUtilsOrm.ts";
import {getPermissionConfig, getPermissionId, rCardPermissionConfig} from "@/constants/rPermissions.ts";
import {RCard, RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {
  sparqlCreatePermissionEntry,
  chainSparqlOperations,
  SPARQL_PREFIXES,
  sparqlUpdatePermissionEntry
} from "@/utils/sparqlHelpers.ts";
import {profileService} from "@/services/profileService.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {contactService} from "@/services/contactService.ts";
import {useShape} from "@ng-org/orm/react";
import {RCardPermissionShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";

interface UpdatePermissionReturn {
  updatePermissionsNode: (propertyKey: ContactSetProperties, propertyNuri?: string) => void;
  updatePermission: (permission: RCardPermission, propertyKey: keyof RCardPermission, value: string) => void;
  isProfile: boolean;
  updateProfilePermissionNodes: () => void
}

export const useUpdatePermission = (profile?: SocialContact, isNewProfile: boolean = false): UpdatePermissionReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {getRCards} = useGetRCards();
  const [rCardPermissionId, setRCardPermissionId] = useState<string>();
  const currentChangesRef = useRef<Record<any, any> | undefined>(undefined);
  const rCardPermissionSet = useShape(RCardPermissionShapeType, rCardPermissionId);
  const rCardPermission = [...rCardPermissionSet][0] as RCardPermission;

  const isProfile: boolean = useMemo<boolean>(() => isNewProfile || profileService.isContactProfile(session, profile),
    [profile, session, isNewProfile]);

  const addPermissionsWithNodes = useCallback(async (rCard: RCard, permission: RCardPermission, nuris: string[]) => {
    if (!nuris.length) return;

    // Create all permission entries using SPARQL
    const sparqlOperations = nuris.map(propertyNuri => {
      return sparqlCreatePermissionEntry(
        rCard["@id"]!,
        {
          node: propertyNuri,
          firstLevel: permission.firstLevel,
          secondLevel: permission.secondLevel,
          selector: permission.selector,
          isPermissionGiven: false,
          zone: permission.zone,
          order: permission.order,
          isMultiple: permission.isMultiple,
        }
      );
    });

    // Combine all operations and execute
    const combinedSparql = chainSparqlOperations(...sparqlOperations);
    try {
      await session.ng!.sparql_update(session.sessionId, combinedSparql, rCard["@id"]!);
    } catch (error) {
      console.error('Failed to add permissions with nodes:', error);
      throw new Error(`Failed to add permissions: ${error}`);
    }
  }, [session]);

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

  const updatePermissionByID = useCallback(async <K extends keyof RCardPermission>(
    permissionId: string, propertyKey: K, value: any) => {
    if (!session || !permissionId) {
      throw new Error('Invalid session or permission ID');
    }

    const permissionData: any = {};
    permissionData[propertyKey] = value;

    const [deleteQuery, insertQuery] = sparqlUpdatePermissionEntry(
      permissionId,
      permissionData,
    )

    const resourceNuri = permissionId.substring(0, 53);

    try {
      await session.ng!.sparql_update(session.sessionId, SPARQL_PREFIXES + '\n' + deleteQuery, resourceNuri);
      await session.ng!.sparql_update(session.sessionId, SPARQL_PREFIXES + '\n' + insertQuery, resourceNuri);
    } catch (error) {
      console.error('Failed to update permission:', error);
      throw new Error(`Failed to update permission: ${error}`);
    }
  }, [session]);

  const getContact = useCallback(async (property: string) => {
    const nuri = profileService.getProfileNuri(session);
    if (!session.sessionId || !nuri) return;

    return await contactService.getContactPropertiesList(session, nuri, property);
  }, [session])

  const updatePermissionsNode = useCallback(async (
    propertyKey: ContactSetProperties,
    propertyNuri?: string
  ) => {
    if (!isProfile) return;
    let allNuris: string[] = [];
    if (!propertyNuri) {
      const contact = await getContact(propertyKey);
      if (!contact) return;
      allNuris = Object.values(contact[propertyKey] ?? {}).map(r => r.id);
      if (!allNuris.length) return;
    }

    const rCards = await getRCards();

    rCards.forEach(rCard => {
      if (!rCard.permission) return;
      const permissions = [...rCard.permission ?? []].filter(permission =>
        permission.firstLevel === propertyKey && permission["@id"]);

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
            updatePermissionByID(permission["@id"]!, "node", allNuris[0]);
          }
        } else {
          updatePermissionByID(permission["@id"]!, "node", propertyNuri ?? allNuris[0]);
        }
      });
    })
  }, [addPermissionsWithNodes, getContact, getRCards, isProfile, updatePermissionByID]);

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
