#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const shexDir = path.join(__dirname, "../src/.orm/shex");
const outputDir = path.join(__dirname, "../src/.orm/utils");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Extract PREFIX declarations from ShEx content
 * @param {string} content - The ShEx file content
 * @returns {Object} Map of prefix names to URIs
 */
function extractPrefixes(content) {
  const prefixes = {};
  const prefixRegex = /PREFIX\s+(\w+):\s+<([^>]+)>/g;

  let match;
  while ((match = prefixRegex.exec(content)) !== null) {
    prefixes[match[1]] = match[2];
  }

  return prefixes;
}

/**
 * Parse a ShEx shape body to extract dictionary information
 * @param {string} shapeBody - The shape body content
 * @param {Object} prefixes - Map of prefix names to URIs
 * @returns {Object} Map of property names to {prefix: string, values: string[]}
 */
function extractDictionaries(shapeBody, prefixes) {
  const dictionaries = {};

  // Match properties with enumerated values: propName [ prefix:value1 prefix:value2 ... ]
  const enumRegex = /(\w+):(\w+)\s+\[\s*([^\]]+)\]/g;

  let match;
  while ((match = enumRegex.exec(shapeBody)) !== null) {
    const [, , propName, enumValues] = match;

    // Skip the 'a' property
    if (propName === "a") {
      continue;
    }

    // Extract individual values from the enumeration
    const valueMatches = enumValues.matchAll(/(\w+):(\w+)/g);
    const prefixCounts = {};
    const valuesByPrefix = {};

    for (const valueMatch of valueMatches) {
      const [, prefixName, value] = valueMatch;
      prefixCounts[prefixName] = (prefixCounts[prefixName] || 0) + 1;
      if (!valuesByPrefix[prefixName]) {
        valuesByPrefix[prefixName] = [];
      }
      valuesByPrefix[prefixName].push(value);
    }

    // Use the most common prefix for this property
    const dominantPrefix = Object.keys(prefixCounts).reduce((a, b) =>
      prefixCounts[a] > prefixCounts[b] ? a : b
    );

    if (prefixes[dominantPrefix]) {
      dictionaries[propName] = {
        prefix: prefixes[dominantPrefix],
        values: valuesByPrefix[dominantPrefix] || []
      };
    }
  }

  return dictionaries;
}

/**
 * Extract shape body from ShEx content
 * @param {string} content - The ShEx file content
 * @param {string} shapeName - The shape name
 * @returns {string|null} The shape body or null if not found
 */
function getShapeBody(content, shapeName) {
  const shapeRegex = new RegExp(
    `\\w+:${shapeName}\\s+(?:EXTRA\\s+a\\s*)?\\{([^}]+)\\}`,
    "s"
  );
  const match = content.match(shapeRegex);
  return match ? match[1] : null;
}

/**
 * Resolve dictionaries from nested shapes
 * For shapes with "EXTRA a", collect dictionaries from referenced nested shapes
 * @param {string} content - The ShEx file content
 * @param {string} shapeBody - The shape body
 * @param {Object} prefixes - Map of prefix names to URIs
 * @param {boolean} isMainShape - Whether this is a main shape (EXTRA a)
 * @returns {Object} Map of property names to {prefix: string, values: string[]}
 */
function resolveNestedDictionaries(content, shapeBody, prefixes, isMainShape) {
  const dictionaries = {};

  if (!isMainShape) {
    // For nested shapes, just extract their own dictionaries
    return extractDictionaries(shapeBody, prefixes);
  }

  // For main shapes (EXTRA a), find properties that reference other shapes
  // Pattern: propName @prefix:ShapeName
  const shapeRefRegex = /(\w+):(\w+)\s+@(\w+):(\w+)/g;

  let match;
  while ((match = shapeRefRegex.exec(shapeBody)) !== null) {
    const [, , propName, , referencedShapeName] = match;

    // Skip the 'a' property
    if (propName === "a") {
      continue;
    }

    // Get the referenced shape's body
    const referencedShapeBody = getShapeBody(content, referencedShapeName);
    if (referencedShapeBody) {
      // Extract dictionaries from the referenced shape
      const nestedDicts = extractDictionaries(referencedShapeBody, prefixes);

      // For each dictionary in the nested shape, use dotted notation
      for (const [nestedPropName, dictData] of Object.entries(nestedDicts)) {
        // Use dotted notation: "parentProp.nestedProp" (e.g., "phoneNumber.type")
        const dottedKey = `${propName}.${nestedPropName}`;
        dictionaries[dottedKey] = dictData;
      }
    }
  }

  return dictionaries;
}

/**
 * Parse a ShEx file and extract property information for a given shape
 * @param {string} content - The ShEx file content
 * @param {string} shapeName - The shape name to extract (e.g., "SocialContact")
 * @param {Object} prefixes - Map of prefix names to URIs
 * @param {boolean} isMainShape - Whether this is a main shape (has EXTRA a)
 * @returns {{setProperties: string[], nonSetProperties: string[], dictionaries: Object}}
 */
function parseShExShape(content, shapeName, prefixes, isMainShape = false) {
  const setProperties = [];
  const nonSetProperties = [];

  const shapeBody = getShapeBody(content, shapeName);

  if (!shapeBody) {
    console.warn(`Could not find shape ${shapeName} in file`);
    return { setProperties, nonSetProperties, dictionaries: {} };
  }

  // Extract dictionaries (with nested resolution for main shapes)
  const dictionaries = resolveNestedDictionaries(content, shapeBody, prefixes, isMainShape);

  // Parse properties
  // Pattern: prefix:propertyName ... cardinality ;
  // Cardinality can be: * (0 or more), + (1 or more), ? (0 or 1), or nothing (exactly 1)
  const propertyRegex = /(\w+):(\w+)\s+(?:@\w+:\w+|IRI|\[\s*[^\]]+\]|\w+:\w+)\s*([*+?]?)\s*(?:\/\/[^\n]*)?;/g;

  let match;
  while ((match = propertyRegex.exec(shapeBody)) !== null) {
    const [, , propName, cardinality] = match;

    // Skip the 'a' property (rdf:type)
    if (propName === "a") {
      continue;
    }

    // Properties with * or + cardinality are Set types
    if (cardinality === "*" || cardinality === "+") {
      setProperties.push(propName);
    } else {
      // Properties with ? or no cardinality are non-Set types
      nonSetProperties.push(propName);
    }
  }

  return { setProperties, nonSetProperties, dictionaries };
}

/**
 * Extract the main shape name(s) from a ShEx file
 * @param {string} content - The ShEx file content
 * @returns {Array<{name: string, isMainShape: boolean}>} Array of shape info
 */
function extractShapeNames(content) {
  const shapes = [];
  const shapeRegex = /\w+:(\w+)\s+(EXTRA\s+a\s*)?\{/g;

  let match;
  while ((match = shapeRegex.exec(content)) !== null) {
    shapes.push({
      name: match[1],
      isMainShape: !!match[2] // Has "EXTRA a"
    });
  }

  return shapes;
}

/**
 * Convert shape name to camelCase for variable naming
 * @param {string} shapeName - Shape name (e.g., "SocialContact")
 * @returns {string} camelCase version (e.g., "socialContact")
 */
function shapeToCamelCase(shapeName) {
  return shapeName.charAt(0).toLowerCase() + shapeName.slice(1);
}

/**
 * Generate utils file for a schema with potentially multiple shapes
 * @param {string} schemaName - Name of the schema file (e.g., "contact")
 * @param {Array<{shapeName: string, setProperties: string[], nonSetProperties: string[], dictionaries: Object}>} shapes - Array of shape data
 */
function generateUtilsFile(schemaName, shapes) {
  const sections = shapes.map(({ shapeName, setProperties, nonSetProperties, dictionaries }) => {
    const camelCaseName = shapeToCamelCase(shapeName);

    let section = `/**
 * All ${shapeName} properties that are Set<T> types (cardinality * or +)
 */
export const ${camelCaseName}SetProperties = [
${setProperties.map((prop) => `  "${prop}",`).join("\n")}
] as const;

/**
 * All ${shapeName} properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const ${camelCaseName}NonSetProperties = [
${nonSetProperties.map((prop) => `  "${prop}",`).join("\n")}
] as const;

export type ${shapeName}SetPropertyName = (typeof ${camelCaseName}SetProperties)[number];
export type ${shapeName}NonSetPropertyName = (typeof ${camelCaseName}NonSetProperties)[number];`;

    // Add dictionary prefixes and values if they exist
    if (Object.keys(dictionaries).length > 0) {
      // Create the mapping from property to subproperty
      const dictMapping = {};
      for (const [dottedKey] of Object.entries(dictionaries)) {
        const [prop, subProp] = dottedKey.split('.');
        dictMapping[prop] = subProp;
      }

      section += `\n\n/**
 * Dictionary prefixes for ${shapeName} enumerated properties
 */
export const ${camelCaseName}DictPrefixes = {
${Object.entries(dictionaries).map(([prop, data]) => `  "${prop}": "${data.prefix}",`).join("\n")}
} as const;

/**
 * Dictionary values for ${shapeName} enumerated properties
 */
export const ${camelCaseName}DictValues = {
${Object.entries(dictionaries).map(([prop, data]) => `  "${prop}": [\n${data.values.map(v => `    "${v}",`).join("\n")}\n  ] as const,`).join("\n")}
} as const;

/**
 * Union type of all dictionary keys (dotted notation like "phoneNumber.type")
 */
export type ${shapeName}DictType = keyof typeof ${camelCaseName}DictPrefixes;

/**
 * Mapping of ${shapeName} properties to their enumerated subproperties
 * Based on the ORM shape definition
 */
export type ${shapeName}DictMap = {
${Object.entries(dictMapping).map(([prop, subProp]) => `  ${prop}: "${subProp}";`).join("\n")}
};

/**
 * Properties from ${shapeName} that have dictionary enumerations
 */
export type ${shapeName}DictProperty = keyof ${shapeName}DictMap;

/**
 * Get the valid subproperty for a specific ${shapeName} property
 * @example ${shapeName}SubPropertyFor<"phoneNumber"> = "type"
 * @example ${shapeName}SubPropertyFor<"tag"> = "valueIRI"
 */
export type ${shapeName}SubPropertyFor<P extends ${shapeName}DictProperty> = ${shapeName}DictMap[P];`;
    }

    return section;
  });

  const output = `/**
 * Auto-generated file - DO NOT EDIT
 * Generated from ${schemaName}.shex
 * Run: node scripts/generateContactUtils.js
 */

${sections.join("\n\n")}
`;

  const outputPath = path.join(outputDir, `${schemaName}.utils.ts`);
  fs.writeFileSync(outputPath, output, "utf-8");

  console.log(`✓ Generated ${outputPath}`);
  shapes.forEach(({ shapeName, setProperties, nonSetProperties, dictionaries }) => {
    const dictCount = Object.keys(dictionaries).length;
    console.log(`  - ${shapeName}: ${setProperties.length} Set properties, ${nonSetProperties.length} non-Set properties, ${dictCount} dictionaries`);
  });
}

// Main execution
console.log("Generating utils from ShEx files...\n");

// Read all .shex files
const shexFiles = fs.readdirSync(shexDir).filter((file) => file.endsWith(".shex"));

if (shexFiles.length === 0) {
  console.error(`No .shex files found in ${shexDir}`);
  process.exit(1);
}

let totalGenerated = 0;

for (const file of shexFiles) {
  const schemaName = path.basename(file, ".shex");
  const shexPath = path.join(shexDir, file);
  const content = fs.readFileSync(shexPath, "utf-8");

  console.log(`Processing ${file}...`);

  // Extract prefixes from the file
  const prefixes = extractPrefixes(content);

  // Extract all shape names from the file
  const shapeInfos = extractShapeNames(content);

  if (shapeInfos.length === 0) {
    console.warn(`  No shapes found in ${file}, skipping...`);
    continue;
  }

  // Process all shapes found in the file
  const shapes = [];
  for (const { name: shapeName, isMainShape } of shapeInfos) {
    const { setProperties, nonSetProperties, dictionaries } = parseShExShape(content, shapeName, prefixes, isMainShape);

    if (setProperties.length === 0 && nonSetProperties.length === 0) {
      console.warn(`  No properties found for shape ${shapeName}, skipping...`);
      continue;
    }

    //TODO: if we need all shapes properties simply remove condition below
    if (isMainShape) {
      shapes.push({ shapeName, setProperties, nonSetProperties, dictionaries });
    }
  }

  if (shapes.length === 0) {
    console.warn(`  No valid shapes with properties found in ${file}, skipping...`);
    continue;
  }

  generateUtilsFile(schemaName, shapes);
  totalGenerated++;
  console.log();
}

console.log(`\nDone! Generated utils for ${totalGenerated} schema(s).`);