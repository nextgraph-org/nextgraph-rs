import fs from "fs-extra";
import path from "path";
import type { Schema } from "@ldo/traverser-shexj";
import parser from "@shexjs/parser";
import schemaConverterShex from "@ldo/schema-converter-shex";
import { renderFile } from "ejs";
import prettier from "prettier";
import loading from "loading-cli";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { forAllShapes } from "./util/forAllShapes.js";
import { annotateReadablePredicates } from "@ldo/schema-converter-shex";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

interface BuildOptions {
  input: string;
  output: string;
  format?: "ldo" | "compact";
}

export async function build(options: BuildOptions) {
  const load = loading("Preparing Environment");
  load.start();
  // Prepare new folder by clearing/and/or creating it
  if (fs.existsSync(options.output)) {
    await fs.promises.rm(options.output, { recursive: true });
  }
  await fs.promises.mkdir(options.output);

  const format = options.format || "ldo";
  const fileTemplates: string[] = [];

  if (format === "compact") {
    // Pre-annotate schema with readablePredicate to unify naming across outputs
    fileTemplates.push("schema.compact", "typings", "shapeTypes.compact");
  } else {
    fileTemplates.push("schema", "typings", "shapeTypes", "context");
  }

  load.text = "Generating LDO Documents";
  await forAllShapes(options.input, async (fileName, shexC) => {
    // Convert to ShexJ
    let schema: Schema;
    try {
      // @ts-expect-error ...
      schema = parser.construct("https://ldo.js.org/").parse(shexC);
    } catch (err) {
      const errMessage =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Unknown Error";
      console.error(`Error processing ${fileName}: ${errMessage}`);
      return;
    }

    // Add readable predicates to schema as the single source of truth.
    if (format === "compact") {
      // @ts-expect-error ...
      annotateReadablePredicates(schema);
    }

    const [typings, context, compactSchema] = await schemaConverterShex(
      schema,
      {
        format,
      },
    );

    await Promise.all(
      fileTemplates.map(async (templateName) => {
        const finalContent = await renderFile(
          path.join(__dirname, "./templates", `${templateName}.ejs`),
          {
            typings: typings.typings,
            fileName,
            schema: JSON.stringify(schema, null, 2),
            context: JSON.stringify(context, null, 2),
            compactSchema: JSON.stringify(compactSchema, null, 2),
            format,
          },
        );
        await fs.promises.writeFile(
          path.join(options.output, `${fileName}.${templateName}.ts`),
          await prettier.format(finalContent, { parser: "typescript" }),
        );
      }),
    );
  });

  load.stop();
}
