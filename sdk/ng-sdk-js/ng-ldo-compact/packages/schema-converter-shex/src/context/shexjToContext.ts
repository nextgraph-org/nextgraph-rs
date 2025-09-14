import type { ContextDefinition } from "jsonld";
import type { Schema } from "@ldo/traverser-shexj";
import { JsonLdContextBuilder } from "./JsonLdContextBuilder.js";
import { ShexJNameVisitor } from "./ShexJContextVisitor.js";
import { jsonld2graphobject } from "jsonld2graphobject";

export async function shexjToContext(
  shexj: Schema,
): Promise<ContextDefinition> {
  const processedShexj: Schema = (await jsonld2graphobject(
    {
      ...shexj,
      "@id": "SCHEMA",
      "@context": "http://www.w3.org/ns/shex.jsonld",
    },
    "SCHEMA",
    { excludeContext: true },
  )) as unknown as Schema;
  const jsonLdContextBuilder = new JsonLdContextBuilder();
  await ShexJNameVisitor.visit(processedShexj, "Schema", jsonLdContextBuilder);
  return jsonLdContextBuilder.generateJsonldContext();
}
