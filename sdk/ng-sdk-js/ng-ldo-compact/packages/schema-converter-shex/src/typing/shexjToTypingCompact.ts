import type { Schema } from "@ldo/traverser-shexj";
import { jsonld2graphobject } from "jsonld2graphobject";
import {
  ShexJTypingTransformerCompact,
  additionalCompactEnumAliases,
} from "./ShexJTypingTransformerCompact.js";
import * as dom from "dts-dom";
import type { TypeingReturn } from "./shexjToTypingLdo.js";
import type { CompactShape } from "../schema/ShexJSchemaTransformerCompact.js";
import { ShexJSchemaTransformerCompact } from "../schema/ShexJSchemaTransformerCompact.js";

type IRI = string;
export type CompactSchema = { [shapeId: IRI]: CompactShape };

export async function shexjToTypingCompact(
  shexj: Schema,
): Promise<[TypeingReturn, undefined, CompactSchema]> {
  // Prepare processed schema (names still rely on context visitor)
  const processedShexj: Schema = (await jsonld2graphobject(
    {
      ...shexj,
      "@id": "SCHEMA",
      "@context": "http://www.w3.org/ns/shex.jsonld",
    },
    "SCHEMA",
  )) as unknown as Schema;

  additionalCompactEnumAliases.clear();
  const declarations = await ShexJTypingTransformerCompact.transform(
    processedShexj,
    "Schema",
    null,
  );

  const compactSchemaShapesUnflattened =
    await ShexJSchemaTransformerCompact.transform(
      processedShexj,
      "Schema",
      null,
    );
  const compactSchema = flattenSchema(compactSchemaShapesUnflattened);

  // Append only enum aliases (no interface Id aliases in compact format now)
  const hasName = (d: unknown): d is { name: string } =>
    typeof (d as { name?: unknown }).name === "string";
  additionalCompactEnumAliases.forEach((alias) => {
    const exists = declarations.some((d) => hasName(d) && d.name === alias);
    if (!exists)
      declarations.push(
        dom.create.alias(alias, dom.create.namedTypeReference("IRI")),
      );
  });

  const typings = declarations.map((declaration) => ({
    typingString: dom
      .emit(declaration, { rootFlags: dom.ContextFlags.InAmbientNamespace })
      .replace(/\r\n/g, "\n"),
    dts: declaration,
  }));
  const header = `export type IRI = string;\n\n`;
  const typingsString =
    header + typings.map((t) => `export ${t.typingString}`).join("");

  return [{ typingsString, typings }, undefined, compactSchema];
}

/** Shapes may be nested. Put all to their root and give nested ones ids. */
function flattenSchema(shapes: CompactShape[]): CompactSchema {
  let schema: CompactSchema = {};

  for (const shape of shapes) {
    schema[shape.iri] = shape;

    // Find nested, unflattened (i.e. anonymous) schemas in properties.
    const nestedSchemaPredicates = shape.predicates.filter(
      (pred) => pred.type === "nested" && typeof pred.nestedSchema === "object",
    );

    for (const pred of nestedSchemaPredicates) {
      const newId = shape.iri + "||" + pred.predicateUri;

      // Recurse
      const flattened = flattenSchema([
        {
          ...(pred.nestedSchema as CompactShape),
          iri: newId,
        },
      ]);
      // Replace the nested schema with its new id.
      pred.nestedSchema = newId;

      schema = { ...schema, ...flattened };
    }
    // Flatten / Recurse
  }

  return schema;
}
