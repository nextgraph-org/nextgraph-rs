/**
 * SPARQL utility functions for contact operations
 * These utilities generate SPARQL query fragments that can be combined
 */

// Common namespace prefixes
export const SPARQL_PREFIXES = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX ngrcard: <did:ng:x:social:rcard#>
  PREFIX ngpermission: <did:ng:x:social:rcard:permission#>
`;

const PREFIXES_DATA: Record<string, string[]> = {
  "ngcore": [
    'value', 'source', 'selected', 'hidden', 'type',
    'valueDate', 'valueDateTime', 'valueIRI',
    'startDate', 'endDate', 'description', 'url', 'publishDate'
  ],
  "ngrcard": [
    'order', 'cardId'
  ],
  "ngpermission": [
    'node', 'firstLevel', 'secondLevel', 'zone', 'isPermissionGiven', 'isMultiple', 'selector', 'permission'
  ],
}

const BNODE_PREFIX = 'bn';

function getPrefix(propertyKey: string): string {
  for (const prefix in PREFIXES_DATA) {
    if (PREFIXES_DATA[prefix].includes(propertyKey)) return prefix;
  }
  return "ngcontact";
}

/**
 * Format a node identifier so blank nodes stay blank and IRIs are wrapped.
 * Generates a stable blank node if no identifier was provided.
 */
function formatNodeIdentifier(entryUri?: string, fallback?: string): string {
  if (entryUri && entryUri.trim()) {
    return entryUri.startsWith('_:') ? entryUri : `<${entryUri}>`;
  }
  if (fallback) {
    return fallback;
  }
  const uniqueSuffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `_:${BNODE_PREFIX}_${uniqueSuffix}`;
}

/**
 * Escape SPARQL string values
 */
export function escapeSparqlString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Determine the correct predicate namespace based on property name
 */
export function getPredicateForProperty(propertyKey: string): string {
  return `${getPrefix(propertyKey)}:${propertyKey}`;
}

/**
 * Update a property value on a specific entry
 * Generates SPARQL to DELETE old value and INSERT new value
 *
 * @param entryUri - The URI of the entry to update
 * @param propertyKey - The property key (e.g., 'value', 'type', 'firstName')
 * @param newValue - The new value to set
 * @param valueType - Type of value: 'string' | 'boolean' | 'number' | 'date' | 'uri'
 * @returns SPARQL query string
 */
export function sparqlUpdateProperty(
  entryUri: string,
  propertyKey: string,
  newValue: any,
  valueType: 'string' | 'boolean' | 'number' | 'date' | 'uri' = 'string'
): string {
  const predicate = getPredicateForProperty(propertyKey);
  const subject = formatNodeIdentifier(entryUri);

  let formattedValue: string;
  switch (valueType) {
    case 'boolean':
      formattedValue = newValue ? 'true' : 'false';
      break;
    case 'number':
      formattedValue = String(newValue);
      break;
    case 'uri':
      formattedValue = `<${newValue}>`;
      break;
    case 'date':
      formattedValue = `"${newValue}"^^xsd:dateTime`;
      break;
    case 'string':
    default:
      formattedValue = `"${escapeSparqlString(String(newValue))}"`;
  }

  return `
    DELETE {
      ${subject} ${predicate} ?oldValue .
    }
    WHERE {
      OPTIONAL { ${subject} ${predicate} ?oldValue . }
    };

    INSERT DATA {
      ${subject} ${predicate} ${formattedValue} .
    }
  `;
}

/**
 * Update a flag (selected/hidden/preferred) on property entries
 *
 * @param contactUri - The contact URI
 * @param propertyKey - The property key (e.g., 'emails', 'phones')
 * @param itemId - The specific item to flag (for single mode) or toggle
 * @param flag - The flag name ('selected', 'hidden', 'preferred')
 * @param mode - 'single' (only one can be true) or 'toggle' (toggle this item's flag)
 * @returns SPARQL query string
 */
export function sparqlUpdatePropertyFlag(
  contactUri: string,
  propertyKey: string,
  itemId: string,
  flag: string = 'selected',
  mode: 'single' | 'toggle' = 'single'
): string {
  const flagPredicate = getPredicateForProperty(flag);

  if (mode === 'single') {
    // Clear all flags for this property, then set the specified item's flag to true
    return `
      DELETE {
        ?entry ${flagPredicate} ?oldValue .
      }
      WHERE {
        <${contactUri}> ngcontact:${propertyKey} ?entry .
        OPTIONAL { ?entry ${flagPredicate} ?oldValue . }
      };

      INSERT DATA {
        <${itemId}> ${flagPredicate} true .
      }
    `;
  } else {
    // Toggle mode: flip the flag value for this specific item
    return `
      DELETE {
        <${itemId}> ${flagPredicate} ?oldValue .
      }
      WHERE {
        OPTIONAL { <${itemId}> ${flagPredicate} ?oldValue . }
      };

      INSERT {
        <${itemId}> ${flagPredicate} ?newValue .
      }
      WHERE {
        BIND(IF(BOUND(?oldValue) && ?oldValue = true, false, true) AS ?newValue)
        OPTIONAL { <${itemId}> ${flagPredicate} ?oldValue . }
      }
    `;
  }
}

/**
 * Update the updatedAt timestamp on a contact
 *
 * @param contactUri - The contact URI
 * @param timestamp - ISO timestamp (defaults to now)
 * @returns SPARQL query string
 */
export function sparqlSetUpdatedTime(
  contactUri: string,
  timestamp?: string
): string {
  const now = timestamp || new Date().toISOString();

  return `
    DELETE {
      <${contactUri}> ngcontact:updatedAt ?oldUpdatedNode .
      ?oldUpdatedNode ?p ?o .
    }
    WHERE {
      OPTIONAL {
        <${contactUri}> ngcontact:updatedAt ?oldUpdatedNode .
        ?oldUpdatedNode ?p ?o .
      }
    };

    INSERT DATA {
      <${contactUri}> ngcontact:updatedAt <${contactUri}#updatedAt> .
      <${contactUri}#updatedAt> ngcore:valueDateTime "${now}" .
      <${contactUri}#updatedAt> ngcore:source "user" .
    }
  `;
}

/**
 * Create a new property entry with user source
 *
 * @param contactUri - The contact URI
 * @param propertyKey - The property key (e.g., 'emails', 'phones')
 * @param subKey - The value property key (e.g., 'value', 'firstName')
 * @param value - The value to set
 * @param options - Additional options (selected flag, custom entry URI)
 * @returns SPARQL query string
 */
export function sparqlCreatePropertyEntry(
  contactUri: string,
  propertyKey: string,
  subKey: string,
  value: string,
  options: {
    selected?: boolean;
    entryUri?: string;
    clearOtherSelected?: boolean;
  } = {}
): string {
  const {
    selected = false,
    entryUri,
    clearOtherSelected = false
  } = options;

  const entryNode = formatNodeIdentifier(entryUri);
  const predicate = getPredicateForProperty(subKey);

  let sparql = '';

  // If single-select, clear all selected flags first
  if (clearOtherSelected) {
    sparql += `
      DELETE {
        ?entry ngcore:selected ?oldSelected .
      }
      WHERE {
        <${contactUri}> ngcontact:${propertyKey} ?entry .
        OPTIONAL { ?entry ngcore:selected ?oldSelected . }
      };
    `;
  }

  // Insert new entry
  sparql += `
    INSERT DATA {
      <${contactUri}> ${getPredicateForProperty(propertyKey)} ${entryNode} .
      ${entryNode} ${predicate} "${escapeSparqlString(value)}" .
    }
  `;

  return sparql;
}

export function sparqlUpdatePermissionEntry(
  entryUri: string,
  permissionData: {
    node?: string;
    isPermissionGiven?: boolean;
    zone?: string;
    order?: number;
  },
) {
  const permissionNode = formatNodeIdentifier(entryUri);

  // Build DELETE/INSERT for update
  let deletePart = 'DELETE WHERE {\n';
  let insertPart = 'INSERT {\n';
  let wherePart = 'WHERE {\n';


  if (permissionData.node !== undefined) {
    deletePart += `  ${permissionNode} ngpermission:node ?node .\n`;
    insertPart += `  ${permissionNode} ngpermission:node <${permissionData.node}> .\n`;
    wherePart += `  OPTIONAL { ${permissionNode} ngpermission:node ?node . }\n`;
  }

  if (permissionData.isPermissionGiven !== undefined) {
    deletePart += `  ${permissionNode} ngpermission:isPermissionGiven ?isPermissionGiven .\n`;
    insertPart += `  ${permissionNode} ngpermission:isPermissionGiven ${permissionData.isPermissionGiven} .\n`;
    wherePart += `  OPTIONAL { ${permissionNode} ngpermission:isPermissionGiven ?isPermissionGiven . }\n`;
  }

  if (permissionData.zone !== undefined) {
    deletePart += `  ${permissionNode} ngpermission:zone ?zone .\n`;
    insertPart += `  ${permissionNode} ngpermission:zone <did:ng:k:social:rcard:permission:zone#${permissionData.zone}> .\n`;
    wherePart += `  OPTIONAL { ${permissionNode} ngpermission:zone ?zone . }\n`;
  }

  if (permissionData.order !== undefined) {
    deletePart += `  ${permissionNode} ngrcard:order ?order .\n`;
    insertPart += `  ${permissionNode} ngrcard:order ${permissionData.order} .\n`;
    wherePart += `  OPTIONAL { ${permissionNode} ngrcard:order ?order . }\n`;
  }

  deletePart += '};\n';
  insertPart += '}\n';
  wherePart += '}\n';

  return [deletePart, insertPart + wherePart];
}

export function sparqlCreatePermissionEntry(
  rCardUri: string,
  permissionData: {
    node?: string;
    firstLevel?: string;
    secondLevel?: string;
    selector?: string;
    isPermissionGiven?: boolean;
    zone?: string;
    order?: number;
    isMultiple?: boolean;
  },
  entryUri?: string,
): string {
  const permissionNode = formatNodeIdentifier(entryUri);

  // CREATE mode - original logic
  let sparql = `
    INSERT DATA {
      <${rCardUri}> ngpermission:permission ${permissionNode} .`;

  if (permissionData.node !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:node <${permissionData.node}> .`;
  }

  if (permissionData.firstLevel !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:firstLevel "${escapeSparqlString(permissionData.firstLevel)}" .`;
  }

  if (permissionData.zone !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:zone <did:ng:k:social:rcard:permission:zone#${permissionData.zone}> .`;
  }

  if (permissionData.secondLevel !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:secondLevel "${escapeSparqlString(permissionData.secondLevel)}" .`;
  }

  if (permissionData.selector !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:selector "${escapeSparqlString(permissionData.selector)}" .`;
  }

  if (permissionData.isPermissionGiven !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:isPermissionGiven ${permissionData.isPermissionGiven} .`;
  }

  if (permissionData.order !== undefined) {
    sparql += `\n      ${permissionNode} ngrcard:order ${permissionData.order} .`;
  }

  if (permissionData.isMultiple !== undefined) {
    sparql += `\n      ${permissionNode} ngpermission:isMultiple ${permissionData.isMultiple} .`;
  }

  sparql += `\n    }
  `;

  return sparql;
}

/**
 * Chain multiple SPARQL operations together
 *
 * @param operations - Array of SPARQL query strings
 * @returns Combined SPARQL query string
 */
export function chainSparqlOperations(...operations: string[]): string {
  return SPARQL_PREFIXES + '\n' + operations.filter(op => op.trim()).join(';\n');
}
