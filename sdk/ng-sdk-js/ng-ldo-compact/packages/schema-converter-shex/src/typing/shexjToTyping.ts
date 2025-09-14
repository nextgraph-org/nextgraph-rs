import type { ContextDefinition } from "jsonld";
import type { Schema } from "@ldo/traverser-shexj";
import type { TypeingReturn } from "./shexjToTypingLdo.js";
import { shexjToTypingLdo } from "./shexjToTypingLdo.js";
import type { CompactSchema } from "./shexjToTypingCompact.js";
import { shexjToTypingCompact } from "./shexjToTypingCompact.js";

export interface TypingsOptions {
  format?: "ldo" | "compact";
}

export async function shexjToTyping(
  shexj: Schema,
  options: TypingsOptions = {},
): Promise<
  [TypeingReturn, ContextDefinition] | [TypeingReturn, undefined, CompactSchema]
> {
  const format = options.format || "ldo";
  if (format === "compact") return shexjToTypingCompact(shexj);
  return shexjToTypingLdo(shexj);
}
