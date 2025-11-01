import Mustache from 'mustache';
import {ldoToJson} from "@/services/nextgraphDataService.ts";

export const defaultTemplates = {
  contactName: "{{honorificPrefix}} {{firstName}} {{middleName}} {{familyName}} {{honorificSuffix}}",
  address: "{{streetAddress}}, {{extendedAddress}}, {{city}}, {{postalCode}}, {{region}}, {{country}}",
  headline: "{{position}} at {{value}}"
}

/**
 * Renders a mustache template with the provided data object
 * @param template - The mustache template string
 * @param data - The data object to use for rendering
 * @returns The rendered string, or empty string if template/data is invalid
 *
 * @example
 * renderTemplate("{{firstName}} {{familyName}}", {firstName: "John", familyName: "Doe"}) // "John Doe"
 */
export function renderTemplate(template: string | undefined, data: Record<string, any> | undefined): string {
  if (!template || !data) {
    return '';
  }

  const renderData = ldoToJson(data);
  Object.keys(renderData).forEach((key) => {
    if (Array.isArray(renderData[key])) {
      renderData[key] = renderData[key][0]["@id"];
    }
  })

  try {
    return Mustache.render(template, renderData).replace(/([,\s])[,\s]+/g, "$1 ").replace(/[,\s]+$|^[,\s]+/g, "");
  } catch (error) {
    console.error('Error rendering template:', error);
    return '';
  }
}

export function extractTemplateProps(template: string): string[] {
  const matches = [...template.matchAll(/{{\s*([\w.]+)\s*}}/g)];
  return matches.map(m => m[1]);
}
