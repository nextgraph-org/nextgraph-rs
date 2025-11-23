import {useCallback, useEffect, useMemo, useState} from "react";
import {rCardZones} from "@/constants/rPermissions.ts";
import {useContactData} from "../contacts/useContactData.ts";
import {RCard, RCardPermission} from "@/.ldo/rcard.typings.ts";
import {useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph.ts";
import {ContentItem} from "@/models/rcards";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {RCardShapeType} from "@/.ldo/rcard.shapeTypes.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {useUpdatePermission} from "@/hooks/rCards/useUpdatePermission.ts";

export type ZoneContent = Record<rCardZones, Array<ContentItem>>;

// function comparePermissionPropertyConfig(config1: PropertyConfig, config2: PropertyConfig): boolean {
//   return config1.displayProp === config2.displayProp
//     && (config1.type ?? "") === (config2.type ?? "")
//     && JSON.stringify(config1.filterParams) === JSON.stringify(config2.filterParams)
// }
// function copyPropertyConfig(propertyConfig: PropertyConfig): PropertyConfig {
//   return {
//     displayProp: propertyConfig.displayProp,
//     isTemplate: propertyConfig.isTemplate,
//     zone: propertyConfig.zone,
//     type: propertyConfig.type,
//     isMultiple: propertyConfig.isMultiple,
//     separator: propertyConfig.separator,
//     filterParams: {...propertyConfig.filterParams},
//   }
// }

interface RCardsReturn {
  rCard?: RCard;
  zoneContent: ZoneContent;
  changeLocation: (item: ContentItem, targetZone: keyof ZoneContent, index: number) => void;
}

export const useRCards = (nuri: string, isEditing: boolean = false): RCardsReturn => {
  const {contact} = useContactData(null, true);

  const [rCard,  setRCard] = useState<RCard>();
  const {getCategoryById} = useRCardsConfigs();

  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  const {updatePermission} = useUpdatePermission();

  useResource(sessionId && nuri ? nuri : undefined, {subscribe: true});

  const rCardSubject: RCard | undefined = useSubject(
    RCardShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  useEffect(() => {
    if (!nuri) {
      setRCard(undefined);
      return;
    }

    if (!isNextGraph) {
      const category = getCategoryById(nuri);
      if (category) {
        const mockRCard: RCard = {
          cardId: category.id,
          permission: new BasicLdSet(category.permissions),
          // @ts-expect-error ldo
          type: {"@id": "Card"}
        };
        setRCard(mockRCard);
      }
    } else {
      if (rCardSubject) {
        setRCard(rCardSubject as RCard);
      }
    }
  }, [getCategoryById, isNextGraph, nuri, rCardSubject]);

  const addContentItem = useCallback((
    permission: RCardPermission,
    content: ZoneContent
  ) => {
    const contentItem = new ContentItem(permission, contact!, isEditing);
    contentItem.initialize();
    if (contentItem.isEmptyValue && !isEditing) {
      return;
    }

    // @ts-expect-error ldo issue
    const zone = permission.zone.toArray()[0]["@id"] as rCardZones;
    if (!isEditing && contentItem.propertyConfig.resolveTo) {
      const existingContentItem = content[zone]
        .find(item => item.label === permission.firstLevel && item.propertyConfig.resolveTo === contentItem.propertyConfig.resolveTo);
      if (existingContentItem) {
        existingContentItem.templateData = {...existingContentItem.templateData, ...contentItem.templateData}
        return;
      }
    }
    content[zone].push(contentItem);
  }, [contact, isEditing]);

  // Group content by zone
  const zoneContent = useMemo(() => {

    const content: ZoneContent = {top: [], middle: [], bottom: [] };
    if (!contact) return content;
    const permissions = rCard?.permission?.toArray() ?? [];

    permissions.forEach((permission) => {
      if (!permission["@id"]) return;
      if (!isEditing && !permission.isPermissionGiven) return;
      addContentItem(permission, content);
    });

    const allItems = (Object.values(content) as ContentItem[][]);
    allItems.forEach((items) => {
      items.sort((a, b) =>
        (a.permission.order ?? Infinity) - (b.permission.order ?? Infinity));
    });

    return content;
  }, [addContentItem, contact, isEditing, rCard?.permission]);

  const recalculateOrder = useCallback((zone: keyof ZoneContent) => {
    zoneContent[zone].forEach(async (item, index) => {
      updatePermission(item.permission, "order", index);
    });
  }, [zoneContent, updatePermission]);

  const changeLocation = useCallback(async (item: ContentItem, targetZone: keyof ZoneContent, index: number) => {
    // @ts-expect-error ldo issue
    const sourceZone = item.permission.zone.toArray()[0]["@id"] as rCardZones;
    zoneContent[sourceZone].splice(zoneContent[sourceZone].indexOf(item), 1);
    zoneContent[targetZone].splice(index, 0, item);
    if (sourceZone !== targetZone) {
      updatePermission(item.permission, "zone", {"@id": targetZone});
    }

    recalculateOrder(targetZone);
  }, [zoneContent, recalculateOrder, updatePermission]);

  return {
    rCard,
    zoneContent,
    changeLocation
  };
}