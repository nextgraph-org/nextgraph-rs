/**
 * VCF (vCard) Parser Utility
 * Parses VCF/vCard files and converts them to contact JSON format
 */
import {contactDictMapper} from "@/utils/dictMappers.ts";

interface VCardProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

/**
 * Parse a VCF file content into an array of contact objects
 */
export function parseVCF(vcfContent: string): any[] {
  const contacts: any[] = [];
  const vCards = vcfContent.split(/BEGIN:VCARD/i).slice(1);

  for (const vCardText of vCards) {
    const vCard = parseVCard(vCardText);
    if (vCard) {
      contacts.push(vCard);
    }
  }

  return contacts;
}

/**
 * Parse a single vCard into a contact object
 */
function parseVCard(vCardText: string): any | null {
  const lines = unfoldLines(vCardText);
  const properties = lines.map(parseProperty).filter(Boolean) as VCardProperty[];

  const contact: any = {};

  for (const prop of properties) {
    switch (prop.name.toUpperCase()) {
      case 'FN':
        // Full name
        if (!contact.name) contact.name = [];
        contact.name.push({
          value: prop.value,
          source: 'vcf'
        });
        break;

      case 'N':
        // Structured name: Family;Given;Middle;Prefix;Suffix
      {
        const nameParts = prop.value.split(';');
        if (!contact.name) contact.name = [];
        const nameObj: any = {
          source: 'vcf'
        };
        if (nameParts[0]) nameObj.familyName = nameParts[0];
        if (nameParts[1]) nameObj.firstName = nameParts[1];
        if (nameParts[2]) nameObj.middleName = nameParts[2];
        if (nameParts[3]) nameObj.honorificPrefix = nameParts[3];
        if (nameParts[4]) nameObj.honorificSuffix = nameParts[4];

        // Construct display name
        const displayParts = [
          nameParts[3], // prefix
          nameParts[1], // first
          nameParts[2], // middle
          nameParts[0], // family
          nameParts[4]  // suffix
        ].filter(Boolean);
        if (displayParts.length > 0) {
          nameObj.value = displayParts.join(' ');
        }

        contact.name.push(nameObj);
        break;
      }

      case 'EMAIL': {
        if (!contact.email) contact.email = [];
        const emailType = getParamValue(prop.params, 'TYPE');
        contact.email.push({
          value: prop.value,
          type2: emailType ? {'@id': normalizeEmailType(emailType)} : undefined,
          source: 'vcf',
          preferred: hasParam(prop.params, 'PREF')
        });
        break;
      }

      case 'TEL': {
        if (!contact.phoneNumber) contact.phoneNumber = [];
        const phoneType = getParamValue(prop.params, 'TYPE');
        contact.phoneNumber.push({
          value: prop.value.replace(/[^+\d]/g, ''), // Clean phone number
          type2: phoneType ? {'@id': normalizePhoneType(phoneType)} : undefined,
          source: 'vcf',
          preferred: hasParam(prop.params, 'PREF')
        });
        break;
      }

      case 'ADR':
        // Address: POBox;Extended;Street;City;Region;PostalCode;Country
      {
        if (!contact.address) contact.address = [];
        const adrParts = prop.value.split(';');
        const addressType = getParamValue(prop.params, 'TYPE');
        const addressObj: any = {
          source: 'vcf',
          type2: addressType ? {'@id': normalizeAddressType(addressType)} : undefined
        };
        if (adrParts[0]) addressObj.poBox = adrParts[0];
        if (adrParts[1]) addressObj.extendedAddress = adrParts[1];
        if (adrParts[2]) addressObj.streetAddress = adrParts[2];
        if (adrParts[3]) addressObj.city = adrParts[3];
        if (adrParts[4]) addressObj.region = adrParts[4];
        if (adrParts[5]) addressObj.postalCode = adrParts[5];
        if (adrParts[6]) addressObj.country = adrParts[6];

        // Construct unstructured value
        const addrDisplay = [adrParts[2], adrParts[3], adrParts[4], adrParts[5], adrParts[6]]
          .filter(Boolean)
          .join(', ');
        if (addrDisplay) addressObj.value = addrDisplay;

        contact.address.push(addressObj);
        break;
      }

      case 'ORG': {
        if (!contact.organization) contact.organization = [];
        const orgParts = prop.value.split(';');
        contact.organization.push({
          value: orgParts[0],
          department: orgParts[1] || undefined,
          source: 'vcf',
          current: true
        });
        break;
      }

      case 'TITLE':
        if (!contact.organization) contact.organization = [];
        if (contact.organization.length === 0) {
          contact.organization.push({
            position: prop.value,
            source: 'vcf',
            current: true
          });
        } else {
          contact.organization[contact.organization.length - 1].position = prop.value;
        }
        break;

      case 'URL': {
        if (!contact.url) contact.url = [];
        const urlType = getParamValue(prop.params, 'TYPE');
        contact.url.push({
          value: prop.value,
          type2: urlType ? {'@id': urlType.toLowerCase()} : undefined,
          source: 'vcf'
        });
        break;
      }

      case 'NOTE':
        if (!contact.biography) contact.biography = [];
        contact.biography.push({
          value: prop.value,
          source: 'vcf'
        });
        break;

      case 'BDAY':
        if (!contact.birthday) contact.birthday = [];
        contact.birthday.push({
          value: prop.value,
          source: 'vcf'
        });
        break;

      case 'NICKNAME':
        if (!contact.nickname) contact.nickname = [];
        contact.nickname.push({
          value: prop.value,
          source: 'vcf'
        });
        break;

      case 'PHOTO': {
        if (!contact.photo) contact.photo = [];
        // Handle base64 encoded photos or URLs
        const photoValue = prop.value.includes('http') ? prop.value : `data:image/jpeg;base64,${prop.value}`;
        contact.photo.push({
          value: photoValue,
          source: 'vcf'
        });
        break;
      }

      case 'CATEGORIES': {
        if (!contact.tag) contact.tag = [];
        const categories = prop.value.split(',').map(c => c.trim());
        categories.forEach(cat => {
          contact.tag.push({
            value: cat,
            source: 'vcf'
          });
        });
        break;
      }

      case 'X-SOCIALPROFILE': {
        if (!contact.account) contact.account = [];
        const accountType = getParamValue(prop.params, 'TYPE');
        contact.account.push({
          type: accountType || 'other',
          value: prop.value,
          source: 'vcf'
        });
        break;
      }
    }
  }

  // Ensure we have at least a name
  if (!contact.name || contact.name.length === 0) {
    return null;
  }

  // Add metadata
  contact.createdAt = new Date().toISOString();
  contact.type = [{'@id': 'Individual'}];

  return contact;
}

/**
 * Unfold continuation lines in vCard
 */
function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n /g, '')
    .replace(/\n\t/g, '')
    .split('\n')
    .filter(line => line.trim() && !line.match(/^END:VCARD/i));
}

/**
 * Parse a vCard property line
 */
function parseProperty(line: string): VCardProperty | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const nameAndParams = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);

  const semicolonIndex = nameAndParams.indexOf(';');
  let name: string;
  let paramsStr: string = '';

  if (semicolonIndex === -1) {
    name = nameAndParams;
  } else {
    name = nameAndParams.substring(0, semicolonIndex);
    paramsStr = nameAndParams.substring(semicolonIndex + 1);
  }

  const params: Record<string, string> = {};
  if (paramsStr) {
    const paramPairs = paramsStr.split(';');
    for (const pair of paramPairs) {
      const eqIndex = pair.indexOf('=');
      if (eqIndex !== -1) {
        const key = pair.substring(0, eqIndex);
        const val = pair.substring(eqIndex + 1).replace(/^"(.*)"$/, '$1');
        params[key.toUpperCase()] = val;
      }
    }
  }

  return {name, params, value: decodeValue(value)};
}

/**
 * Decode vCard value (handle quoted-printable, etc.)
 */
function decodeValue(value: string): string {
  // Basic decoding - extend as needed
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * Get parameter value from params object
 */
function getParamValue(params: Record<string, string>, key: string): string | undefined {
  return params[key.toUpperCase()];
}

/**
 * Check if parameter exists
 */
function hasParam(params: Record<string, string>, key: string): boolean {
  return key.toUpperCase() in params;
}

/**
 * Normalize email type to our schema
 */
function normalizeEmailType(type: string): string {
  const typeMap: Record<string, string> = {
    'HOME': contactDictMapper.appendPrefixToDictValue('email', 'type', 'home'),
    'WORK': contactDictMapper.appendPrefixToDictValue('email', 'type', 'work'),
  };
  return typeMap[type.toUpperCase()] || contactDictMapper.appendPrefixToDictValue('email', 'type', 'other');
}

/**
 * Normalize phone type to our schema
 */
function normalizePhoneType(type: string): string {
  const typeMap: Record<string, string> = {
    'HOME': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'home'),
    'WORK': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'work'),
    'CELL': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'mobile'),
    'MOBILE': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'mobile'),
    'FAX': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'homeFax'),
    'PAGER': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'pager'),
    'CAR': contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'car'),
  };
  return typeMap[type.toUpperCase()] || contactDictMapper.appendPrefixToDictValue('phoneNumber', 'type', 'other');
}

/**
 * Normalize address type to our schema
 */
function normalizeAddressType(type: string): string {
  const typeMap: Record<string, string> = {
    'HOME': contactDictMapper.appendPrefixToDictValue('address', 'type', 'home'),
    'WORK': contactDictMapper.appendPrefixToDictValue('address', 'type', 'work')
  };
  return typeMap[type.toUpperCase()] || 'other2';
}
