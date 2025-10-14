import { jsonld2graphobject } from "jsonld2graphobject";
import * as dom from "dts-dom";
import { ShexJTypingTransformerCompact, additionalCompactEnumAliases, } from "./transformers/ShexJTypingTransformer.js";
import { ShexJSchemaTransformerCompact } from "./transformers/ShexJSchemaTransformer.js";
export async function shexJConverter(shexj) {
    // Prepare processed schema (names still rely on context visitor)
    const processedShexj = (await jsonld2graphobject({
        ...shexj,
        "@id": "SCHEMA",
        "@context": "http://www.w3.org/ns/shex.jsonld",
    }, "SCHEMA"));
    additionalCompactEnumAliases.clear();
    const declarations = await ShexJTypingTransformerCompact.transform(processedShexj, "Schema", null);
    const compactSchemaShapesUnflattened = await ShexJSchemaTransformerCompact.transform(processedShexj, "Schema", null);
    const compactSchema = flattenSchema(compactSchemaShapesUnflattened);
    // Append only enum aliases (no interface Id aliases in compact format now)
    const hasName = (d) => typeof d.name === "string";
    additionalCompactEnumAliases.forEach((alias) => {
        const exists = declarations.some((d) => hasName(d) && d.name === alias);
        if (!exists)
            declarations.push(dom.create.alias(alias, dom.create.namedTypeReference("IRI")));
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
    const typingsString = header + typings.map((t) => `export ${t.typingString}`).join("");
    return [{ typingsString, typings }, compactSchema];
}
/** Shapes may be nested. Put all to their root and give nested ones ids. */
function flattenSchema(shapes) {
    let schema = {};
    for (const shape of shapes) {
        schema[shape.iri] = shape;
        // Find nested, unflattened (i.e. anonymous) schemas in predicates' dataTypes.
        for (const pred of shape.predicates) {
            for (let i = 0; i < pred.dataTypes.length; i++) {
                const dt = pred.dataTypes[i];
                if (dt.valType === "shape" &&
                    typeof dt.shape === "object" &&
                    dt.shape !== null) {
                    // create a deterministic id for the nested shape; include index if multiple shape entries exist
                    const shapeCount = pred.dataTypes.filter((d) => d.valType === "shape").length;
                    const newId = shape.iri +
                        "||" +
                        pred.iri +
                        (shapeCount > 1 ? `||${i}` : "");
                    // Recurse
                    const flattened = flattenSchema([
                        {
                            ...dt.shape,
                            iri: newId,
                        },
                    ]);
                    // Replace the nested schema with its new id.
                    dt.shape = newId;
                    schema = { ...schema, ...flattened };
                }
            }
        }
        // Flatten / Recurse
    }
    return schema;
}
