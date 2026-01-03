import {
  ContactSetProperties, getPropByNuri,
  getPropsByFilter, getPropsByType, ContactSetItem,
  resolveFrom
} from "@/utils/socialContact/contactUtilsOrm.ts";
import {getPermissionConfig, getPermissionId, PropertyConfig} from "@/constants/rPermissions.ts";
import {extractTemplateProps, renderTemplate} from "@/utils/templateRenderer.ts";
import {camelCaseToWords} from "@/utils/stringHelpers.ts";
import {languageNameByCode} from "@/utils/bcp47map.ts";
import {RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export class ContentItem {
  label: ContactSetProperties;
  permission: RCardPermission;
  propertyConfig: PropertyConfig;
  value: string = "";
  valueList: string[] = [];
  isValueMissing: boolean = false;
  profile: SocialContact;
  isEditing: boolean = false;
  template?: string;
  templateData?: Record<string, any>;
  labelToShow?: string;

  get id(): string {
    return `${this.permission.zone}-${getPermissionId(this.permission)}-${this.permission.node ?? ""}`;
  };

  get isEmptyValue(): boolean {
    return !this.value?.length && !this.valueList.length && !this.templateData;
  }

  constructor(permission: RCardPermission, profile: SocialContact, isEditing: boolean) {
    this.label = permission.firstLevel as ContactSetProperties;
    this.permission = permission;
    this.isEditing = isEditing;
    this.profile = profile;
    this.propertyConfig = getPermissionConfig(permission)!;
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
      data.valueIRI = languageNameByCode(data.valueIRI);
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

  getProperties(): ContactSetItem<ContactSetProperties>[] {
    if (this.propertyConfig.type) {
      return getPropsByType(this.profile, this.label, this.propertyConfig.type);
    } else if (this.propertyConfig.filterParams) {
      return getPropsByFilter(this.profile, this.label, this.propertyConfig.filterParams);
    } else {
      return [...this.profile[this.label] ?? []]
        .filter(prop => prop["@id"]) ?? [];
    }
  }

  //TODO: this seems to be wrong method?
  getProperty(): ContactSetItem<ContactSetProperties> | undefined {
    if (this.permission.node) {
      return getPropByNuri(this.profile, this.label, this.permission.node);
      // } else if (this.propertyConfig.type) {
      //   return getPropByType(this.profile, this.label as ContactKeysWithType, this.propertyConfig.type);
      // } else if (this.propertyConfig.filterParams) {
      //   return getPropsByFilter(this.profile, this.label, this.propertyConfig.filterParams)[0];
      // } else {
      //   return resolveFrom(this.profile, this.label);
    }
  }

  initialize() {
    this.permission.isPermissionGiven ??= false;
    if (!this.isEditing) {
      this.template = this.propertyConfig.resolveTo;
    }

    if (this.propertyConfig.shareAll) {
      const properties = this.getProperties();
      this.valueList = properties.map(this.getPropertyValue).filter(value => value?.length);
    } else {
      const property = this.getProperty();

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