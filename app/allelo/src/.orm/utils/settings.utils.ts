/**
 * Auto-generated file - DO NOT EDIT
 * Generated from settings.shex
 * Run: node scripts/generateContactUtils.js
 */

/**
 * All AppSettings properties that are Set<T> types (cardinality * or +)
 */
export const appSettingsSetProperties = [

] as const;

/**
 * All AppSettings properties that are NOT Set<T> types
 * (cardinality ? or required single values)
 */
export const appSettingsNonSetProperties = [
  "onboardingStep",
  "isOnboardingFinished",
  "lnImportRequested",
  "lnImportFinished",
  "greencheckId",
  "greencheckToken",
] as const;

export type AppSettingsSetPropertyName = (typeof appSettingsSetProperties)[number];
export type AppSettingsNonSetPropertyName = (typeof appSettingsNonSetProperties)[number];
