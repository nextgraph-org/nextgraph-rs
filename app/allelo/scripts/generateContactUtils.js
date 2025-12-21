#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const typingsPath = path.join(
  __dirname,
  "../src/.orm/shapes/contact.typings.ts"
);
const outputPath = path.join(
  __dirname,
  "../src/.orm/shapes/contact.utils.ts"
);

// Read the typings file
const content = fs.readFileSync(typingsPath, "utf-8");

// Extract SocialContact interface
const interfaceMatch = content.match(
  /export interface SocialContact\s*\{([\s\S]*?)\n\}/
);

if (!interfaceMatch) {
  console.error("Could not find SocialContact interface");
  process.exit(1);
}

const interfaceBody = interfaceMatch[1];

// Parse properties
const propertyRegex = /^\s*(?:readonly\s+)?["']?([^"':?\s]+)["']?\??:\s*(.+?);/gm;
const setProperties = [];
const otherProperties = [];

let match;
while ((match = propertyRegex.exec(interfaceBody)) !== null) {
  const [, propName, propType] = match;

  // Skip readonly properties like @graph and @id
  if (propName === "@graph" || propName === "@id") {
    continue;
  }

  // Check if it's a Set type
  if (propType.trim().startsWith("Set<")) {
    setProperties.push(propName);
  } else {
    otherProperties.push(propName);
  }
}

// Generate the output file
const output = `/**
 * Auto-generated file - DO NOT EDIT
 * Generated from contact.typings.ts
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All SocialContact properties that are Set<T> types
 */
export const contactSetProperties = [
${setProperties.map((prop) => `  "${prop}",`).join("\n")}
] as const;

/**
 * All SocialContact properties that are NOT Set<T> types
 * (excluding readonly @graph and @id)
 */
export const contactNonSetProperties = [
${otherProperties.map((prop) => `  "${prop}",`).join("\n")}
] as const;

export type ContactSetPropertyName = (typeof contactSetProperties)[number];
export type ContactNonSetPropertyName = (typeof contactNonSetProperties)[number];
`;

// Write the output file
fs.writeFileSync(outputPath, output, "utf-8");

console.log(`✓ Generated ${outputPath}`);
console.log(`  - ${setProperties.length} Set properties`);
console.log(`  - ${otherProperties.length} non-Set properties`);