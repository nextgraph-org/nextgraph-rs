import type { ContextDefinition } from "jsonld";
import type { Schema } from "@ldo/traverser-shexj";
import { JsonLdContextBuilder } from "../context/JsonLdContextBuilder.js";
import { ShexJNameVisitor } from "../context/ShexJContextVisitor.js";
import { jsonld2graphobject } from "jsonld2graphobject";
import { ShexJTypingTransformer } from "./ShexJTypingTransformer.js";
import * as dom from "dts-dom";

export interface TypeingReturn {
  typingsString: string;
  typings: {
    typingString: string;
    dts: dom.TopLevelDeclaration;
  }[];
}

export async function shexjToTypingLdo(
  shexj: Schema,
): Promise<[TypeingReturn, ContextDefinition]> {
  const processedShexj: Schema = (await jsonld2graphobject(
    {
      ...shexj,
      "@id": "SCHEMA",
      "@context": "http://www.w3.org/ns/shex.jsonld",
    },
    "SCHEMA",
  )) as unknown as Schema;
  const jsonLdContextBuilder = new JsonLdContextBuilder();
  await ShexJNameVisitor.visit(processedShexj, "Schema", jsonLdContextBuilder);

  const declarations = await ShexJTypingTransformer.transform(
    processedShexj,
    "Schema",
    {
      getNameFromIri:
        jsonLdContextBuilder.getNameFromIri.bind(jsonLdContextBuilder),
    },
  );

  const typings = declarations.map((declaration) => {
    return {
      typingString: dom
        .emit(declaration, {
          rootFlags: dom.ContextFlags.InAmbientNamespace,
        })
        .replace(/\r\n/g, "\n"),
      dts: declaration,
    };
  });

  const header = `import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\n`;
  const typingsString =
    header + typings.map((t) => `export ${t.typingString}`).join("");

  const typeingReturn: TypeingReturn = { typingsString, typings };

  return [typeingReturn, jsonLdContextBuilder.generateJsonldContext()];
}
