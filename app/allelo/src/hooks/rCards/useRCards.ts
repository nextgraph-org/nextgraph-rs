import {useCallback, useEffect, useMemo, useState} from "react";
import {rCardZones} from "@/constants/rPermissions.ts";
import {RCard, RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {ContentItem} from "@/models/rcards";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {RCardShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {useShape} from "@ng-org/orm/react";
import {rCardDictMapper} from "@/utils/dictMappers.ts";

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
  const {ormContact: contact} = useContactOrm(null, true);

  const [rCard, setRCard] = useState<RCard>();
  const {getCategoryById} = useRCardsConfigs();

  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  const rCardsSet = useShape(
    RCardShapeType,
    sessionId && nuri
  );

  const rCardSubject = [...rCardsSet][0] as RCard;

  useEffect(() => {
    if (!nuri) {
      setRCard(undefined);
      return;
    }

    if (rCardSubject) {
      setRCard(rCardSubject);
    }
  }, [getCategoryById, nuri, rCardSubject]);

  const addContentItem = useCallback((
    permission: RCardPermission,
    content: ZoneContent
  ) => {
    const contentItem = new ContentItem(permission, contact!, isEditing);
    contentItem.initialize();
    if (contentItem.isEmptyValue && !isEditing) {
      return;
    }

    const zone = rCardDictMapper.removePrefix(permission.zone) as rCardZones;
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

    const content: ZoneContent = {top: [], middle: [], bottom: []};
    if (!contact) return content;
    const permissions = [...rCard?.permission ?? []] ;

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
      item.permission.order = index;
    });
  }, [zoneContent]);

  const changeLocation = useCallback(async (item: ContentItem, targetZone: keyof ZoneContent, index: number) => {
    const sourceZone = rCardDictMapper.removePrefix(item.permission.zone) as rCardZones;
    zoneContent[sourceZone].splice(zoneContent[sourceZone].indexOf(item), 1);
    zoneContent[targetZone].splice(index, 0, item);
    if (sourceZone !== targetZone) {
      item.permission.zone = rCardDictMapper.appendPrefixToDictValue("permission",  "zone", targetZone);
    }

    recalculateOrder(targetZone);
  }, [zoneContent, recalculateOrder]);

  return {
    rCard,
    zoneContent,
    changeLocation
  };
}