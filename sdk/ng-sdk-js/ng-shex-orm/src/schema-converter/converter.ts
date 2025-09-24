import type { Schema } from "@ldo/traverser-shexj";
import { jsonld2graphobject } from "jsonld2graphobject";
import * as dom from "dts-dom";
import {
    ShexJTypingTransformerCompact,
    additionalCompactEnumAliases,
} from "./transformers/ShexJTypingTransformer.ts";
import { ShexJSchemaTransformerCompact } from "./transformers/ShexJSchemaTransformer.ts";
import type { Schema as ShapeSchema, Shape } from "../types.ts";

export interface TypingReturn {
    typingsString: string;
    typings: {
        typingString: string;
        dts: dom.TopLevelDeclaration;
    }[];
}

export async function shexJConverter(
    shexj: Schema
): Promise<[TypingReturn, ShapeSchema]> {
    // Prepare processed schema (names still rely on context visitor)
    const processedShexj: Schema = (await jsonld2graphobject(
        {
            ...shexj,
            "@id": "SCHEMA",
            "@context": "http://www.w3.org/ns/shex.jsonld",
        },
        "SCHEMA"
    )) as unknown as Schema;

    additionalCompactEnumAliases.clear();
    const declarations = await ShexJTypingTransformerCompact.transform(
        processedShexj,
        "Schema",
        null
    );

    const compactSchemaShapesUnflattened =
        await ShexJSchemaTransformerCompact.transform(
            processedShexj,
            "Schema",
            null
        );
    const compactSchema = flattenSchema(compactSchemaShapesUnflattened);

    // Append only enum aliases (no interface Id aliases in compact format now)
    const hasName = (d: unknown): d is { name: string } =>
        typeof (d as { name?: unknown }).name === "string";
    additionalCompactEnumAliases.forEach((alias) => {
        const exists = declarations.some((d) => hasName(d) && d.name === alias);
        if (!exists)
            declarations.push(
                dom.create.alias(alias, dom.create.namedTypeReference("IRI"))
            );
    });

    const typings = declarations.map((declaration) => ({
        typingString: dom
            .emit(declaration, {
                rootFlags: dom.ContextFlags.InAmbientNamespace,
            })
            .replace(/\r\n/g, "\n"),
        dts: declaration,
    }));
    const header = `export type IRI = string;\n\n`;
    const typingsString =
        header + typings.map((t) => `export ${t.typingString}`).join("");

    return [{ typingsString, typings }, compactSchema];
}

/** Shapes may be nested. Put all to their root and give nested ones ids. */
function flattenSchema(shapes: Shape[]): ShapeSchema {
    let schema: ShapeSchema = {};

    for (const shape of shapes) {
        schema[shape.iri] = shape;

        // Find nested, unflattened (i.e. anonymous) schemas in properties.
        const nestedSchemaPredicates = shape.predicates.filter(
            (pred) =>
                pred.valType === "nested" &&
                typeof pred.nestedShape === "object"
        );

        for (const pred of nestedSchemaPredicates) {
            const newId = shape.iri + "||" + pred.iri;

            // Recurse
            const flattened = flattenSchema([
                {
                    ...(pred.nestedShape as Shape),
                    iri: newId,
                },
            ]);
            // Replace the nested schema with its new id.
            pred.nestedShape = newId;

            schema = { ...schema, ...flattened };
        }
        // Flatten / Recurse
    }

    return schema;
}
