import {
  ContactKeysWithType,
  ContactLdSetProperties,
  getPropByType, getPropsByFilter, getPropsByType, ItemOf,
  resolveFrom
} from "@/utils/socialContact/contactUtils.ts";
import {dataService} from "@/services/dataService.ts";
import {useCallback, useMemo} from "react";
import {RelationshipCategory} from "@/constants/relationshipCategories.ts";
import {PropertyConfig} from "@/constants/rPermissions.ts";
import {extractTemplateProps, renderTemplate} from "@/utils/templateRenderer.ts";
import {camelCaseToWords} from "@/utils/stringHelpers.ts";
import {Contact} from "@/types/contact.ts";
import {languageNameByCode} from "@/utils/bcp47map.ts";
import {useContactData} from "../contacts/useContactData.ts";

export class ContentItem {
  label: keyof ContactLdSetProperties;
  propertyConfig: PropertyConfig;
  value: string = "";
  valueList: string[] = [];
  isPermissionGiven: boolean = false;
  isValueMissing: boolean = false;
  profile: Contact;
  isEditing: boolean = false;
  template?: string;
  templateData?: Record<string, any>;
  labelToShow?: string;

  get id(): string {
    return `${this.propertyConfig.zone}-${this.label}-`
      + `${this.propertyConfig.displayProp}-${this.propertyConfig.type}-${JSON.stringify(this.propertyConfig.filterParams)}`;
  };

  get isEmptyValue(): boolean {
    return !this.value?.length && !this.valueList.length && !this.templateData;
  }

  constructor(label: keyof ContactLdSetProperties, propertyConfig: PropertyConfig, profile: Contact, isEditing: boolean) {
    this.label = label;
    this.propertyConfig = propertyConfig;
    this.isEditing = isEditing;
    this.profile = profile;
  }

  getTemplateValue(templateData: any): string {
    const template = this.propertyConfig.template!;
    let label = this.label;
    if (this.propertyConfig.templateProp) {
      label = this.propertyConfig.templateProp;
      templateData = resolveFrom(this.profile, label) ?? {};
    }
    let value = "";
    if (this.isEditing) {
      const props = extractTemplateProps(template);
      props.forEach(prop => {
        if (!templateData[prop]) {
          this.isValueMissing = true;
          let placeholderValue = prop;
          if (prop === "value" || prop === "valueIRI") {
            placeholderValue = label;
          }
          templateData[prop] ??= camelCaseToWords(placeholderValue);
        }
      })
      if (this.isValueMissing) {
        value += (this.propertyConfig.type ?? "") + " ";
      }
    }
    if (Object.values(templateData).length > 0) {
      value += renderTemplate(template, templateData);
    }

    return value;
  }

  getPropertyValue = (resolved: any): string => {
    const data = {...resolved ?? {}};
    if (data) {
      Object.keys(data).forEach(key => {
        if (data[key] && data[key]["@id"]) {
          data[key] = data[key]["@id"];
        }
      })
    }
    if (this.label === "language" && data.valueIRI) {
      data.valueIRI = languageNameByCode(data.valueIRI.toArray()[0]);
    }
    if (this.propertyConfig.displayProp && data && data[this.propertyConfig.displayProp]) {
      return data[this.propertyConfig.displayProp];
    }
    if (this.propertyConfig.template) {
      return this.getTemplateValue(data);
    }

    return "";
  }

  getLabelToShow(): string | undefined {
    if (this.label === "photo") return this.label;
    if (this.propertyConfig.label) {
      return this.propertyConfig.label;
    } else {
      let labelToShow = this.propertyConfig.type ?? "";
      labelToShow += " ";
      const propLabel = camelCaseToWords(this.label);
      const displayProp = camelCaseToWords(this.propertyConfig.displayProp ?? "");
      if (!displayProp || displayProp.includes("value")) {
        labelToShow += propLabel;
      } else if (displayProp.includes(propLabel)) {
        labelToShow += displayProp;
      } else {
        labelToShow += displayProp;
      }
      return labelToShow.trim();
    }
  }

  getProperties(): ItemOf<keyof ContactLdSetProperties>[] {
    if (this.propertyConfig.type) {
      return getPropsByType(this.profile, this.label as ContactKeysWithType, this.propertyConfig.type);
    } else if (this.propertyConfig.filterParams) {
      return getPropsByFilter(this.profile, this.label, this.propertyConfig.filterParams);
    } else {
      const properties: ItemOf<keyof ContactLdSetProperties>[] = this.profile[this.label]?.toArray() ?? [];
      if (!properties.length) {
        properties.push({});
      }
      return properties;
    }
  }

  initialize() {
    this.propertyConfig.isPermissionGiven ??= false;
    this.isPermissionGiven = this.propertyConfig.isPermissionGiven;
    if (!this.isEditing) {
      this.template = this.propertyConfig.resolveTo;
    }
    const type = this.propertyConfig.type;

    if (this.propertyConfig.isMultiple) {
      const properties = this.getProperties();
      this.valueList = properties.map(this.getPropertyValue).filter(value => value?.length);
    } else {
      const property = type
        ? getPropByType(this.profile, this.label as ContactKeysWithType, type)
        : this.propertyConfig.filterParams
          ? getPropsByFilter(this.profile, this.label, this.propertyConfig.filterParams)[0]
          : resolveFrom(this.profile, this.label);

      const value = this.getPropertyValue(property);
      if (this.template) {
        this.templateData ??= {};
        this.templateData[this.propertyConfig.displayProp!] = value;
      } else {
        this.value = value;
      }
    }

    if (this.isEditing) {
      this.labelToShow = this.getLabelToShow();
      this.isValueMissing ||= this.isEmptyValue;
    }
  }
}

export interface ZoneContent {
  top: Array<ContentItem>;
  middle: Array<ContentItem>;
  bottom: Array<ContentItem>;
}

export interface UseRCardProps {
  card: RelationshipCategory;
  isEditing?: boolean;
}

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
  zoneContent: ZoneContent;
  togglePermission: (item: ContentItem) => void;
  changeLocation: (item: ContentItem, targetZone: keyof ZoneContent, index: number) => void;
}

export const useRCards = ({card, isEditing = false}: UseRCardProps): RCardsReturn => {
  const {contact} = useContactData(null, true);

  const addContentItem = useCallback((
    label: keyof ContactLdSetProperties,
    propertyConfig: PropertyConfig,
    content: ZoneContent
  ) => {
    const contentItem = new ContentItem(label, propertyConfig, contact, isEditing);
    contentItem.initialize();
    if (contentItem.isEmptyValue && !isEditing) {
      return;
    }
    if (!isEditing && contentItem.propertyConfig.resolveTo) {
      const existingContentItem = content[propertyConfig.zone!]
        .find(item => item.label === label && item.propertyConfig.resolveTo === contentItem.propertyConfig.resolveTo);
      if (existingContentItem) {
        existingContentItem.templateData = {...existingContentItem.templateData, ...contentItem.templateData}
        return;
      }
    }
    content[propertyConfig.zone!].push(contentItem);

  }, [contact, isEditing]);

  // Group content by zone
  const zoneContent = useMemo(() => {
    if (card.rerender && !card.rerender.shouldRerender) { /* force rerender */
    }

    const content: ZoneContent = {top: [], middle: [], bottom: []};
    if (!contact) return content;
    const permissions = (Object.entries(card.permissions) as [keyof ContactLdSetProperties, PropertyConfig[]][]);

    permissions.forEach(([prop, propertyConfigs]) => {
      propertyConfigs.forEach((propertyConfig) => {
        propertyConfig.isPermissionGiven ??= true;
        if (!isEditing && !propertyConfig.isPermissionGiven) return;
        propertyConfig.zone ||= 'top';
        addContentItem(prop, propertyConfig, content);
      });
    });

    const allItems = (Object.values(content) as ContentItem[][]);
    allItems.forEach((items) => {
      items.sort((a, b) =>
        (a.propertyConfig.order ?? Infinity) - (b.propertyConfig.order ?? Infinity));
    });

    return content;
  }, [card.rerender, card.permissions, isEditing, addContentItem, contact]);

  const recalculateOrder = useCallback((zone: keyof ZoneContent) => {
    zoneContent[zone].forEach((item, index) => {
      item.propertyConfig.order = index
    });
  }, [zoneContent]);

  const togglePermission = useCallback((item: ContentItem) => {
    item.isPermissionGiven = !item.isPermissionGiven;
    item.propertyConfig.isPermissionGiven = item.isPermissionGiven;
  }, []);

  const changeLocation = useCallback((item: ContentItem, targetZone: keyof ZoneContent, index: number) => {
    const sourceZone = item.propertyConfig.zone!;
    zoneContent[sourceZone].splice(zoneContent[sourceZone].indexOf(item), 1);

    item.propertyConfig.zone = targetZone;
    zoneContent[targetZone].splice(index, 0, item);

    recalculateOrder(targetZone);
  }, [zoneContent, recalculateOrder]);

  return {
    zoneContent,
    togglePermission,
    changeLocation
  };
}