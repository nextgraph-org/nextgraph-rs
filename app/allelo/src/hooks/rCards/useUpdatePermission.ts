import {dataset, useLdo, useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {SocialContact} from "@/.ldo/contact.typings.ts";
import {useCallback, useMemo} from "react";
import {ContactLdSetProperties} from "@/utils/socialContact/contactUtils.ts";
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {getPermissionConfig, getPermissionId, rCardPermissionConfig} from "@/constants/rPermissions.ts";
import {RCard, RCardPermission} from "@/.ldo/rcard.typings.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {
  sparqlCreatePermissionEntry,
  chainSparqlOperations,
  SPARQL_PREFIXES,
  sparqlUpdatePermissionEntry
} from "@/utils/sparqlHelpers.ts";

interface UpdatePermissionReturn {
  updatePermissionsNode: (propertyKey: keyof ContactLdSetProperties, propertyNuri?: string) => void;
  updatePermission: (permission: RCardPermission, propertyKey: keyof RCardPermission, value: any) => void;
  isProfile: boolean;
  updateProfilePermissionNodes: () => void
}

export const useUpdatePermission = (profile?: SocialContact, isNewProfile: boolean = false): UpdatePermissionReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const {commitData, changeData} = useLdo();
  const {getRCards} = useGetRCards();

  const isProfile: boolean = useMemo<boolean>(() => isNewProfile || nextgraphDataService.isContactProfile(session, profile),
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
          zone: permission.zone["@id"],
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


  const updatePermission = useCallback(<K extends keyof RCardPermission>(
    permission: RCardPermission, propertyKey: K, value: any) => {
    const resource = dataset.getResource(permission["@id"]!.substring(0, 53));
    // @ts-expect-error InvalidIdentifierResouce
    if (resource.isError || resource.type === "InvalidIdentifierResouce" || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to create resource`);
    }
    const changePermissionObj = changeData(permission, resource);
    changePermissionObj[propertyKey] = value;
    commitData(changePermissionObj).then(result => {
      if (result.isError) {
        throw new Error(`Failed to commit: ${result.message}`);
      }
    })
  }, [changeData, commitData]);

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
    const nuri = nextgraphDataService.getProfileNuri(session);
    if (!session.sessionId || !nuri) return;

    return await nextgraphDataService.getContactPropertiesList(session, nuri, property);
  }, [session])

  const updatePermissionsNode = useCallback(async (
    propertyKey: keyof ContactLdSetProperties,
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
      const permissions = rCard.permission.filter(permission =>
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
              .map(p => getPermissionId(p) === permissionId && p.node ? p.node["@id"] : undefined)
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
    const propertyKeys = Object.keys(rCardPermissionConfig) as Array<keyof ContactLdSetProperties>;
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
