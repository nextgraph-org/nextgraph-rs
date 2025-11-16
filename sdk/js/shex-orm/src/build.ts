// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Copyright (c) 2023 Jackson Morgan
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "fs-extra";
import path from "path";
import type { Schema } from "./ShexJTypes.ts";
import parser from "@shexjs/parser";
import { shexJConverter } from "./schema-converter/converter.ts";
import { renderFile } from "ejs";
import prettier from "prettier";
import loading from "loading-cli";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { forAllShapes } from "./util/forAllShapes.ts";
import annotateReadablePredicates from "./schema-converter/util/annotateReadablePredicates.ts";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

interface BuildOptions {
    input: string;
    output: string;
    baseIRI?: string;
}

export async function build({
    input: inputFile,
    output: outputFile,
    baseIRI = "https://nextgraph.org/shapes#",
}: BuildOptions) {
    const load = loading("Preparing Environment");
    load.start();
    // Prepare new folder by clearing/and/or creating it
    if (fs.existsSync(outputFile)) {
        await fs.promises.rm(outputFile, { recursive: true });
    }
    await fs.promises.mkdir(outputFile);

    const fileTemplates: string[] = [];

    // Pre-annotate schema with readablePredicate to unify naming across outputs
    fileTemplates.push("schema", "typings", "shapeTypes");

    load.text = "Generating Schema Documents";
    await forAllShapes(inputFile, async (fileName, shexC) => {
        // Convert to ShexJ
        let schema: Schema;
        try {
            // Prase Shex schema to JSON.
            // TODO: Do we need the base IRI?
            //  @ts-ignore ...
            schema = parser.construct(baseIRI).parse(shexC);
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
        //  @ts-ignore ...
        annotateReadablePredicates(schema);

        const [typings, compactSchema] = await shexJConverter(schema);

        await Promise.all(
            fileTemplates.map(async (templateName) => {
                const finalContent = await renderFile(
                    path.join(
                        __dirname,
                        "schema-converter",
                        "templates",
                        `${templateName}.ejs`
                    ),
                    {
                        typings: typings.typings,
                        fileName,
                        schema: JSON.stringify(schema, null, 2),
                        compactSchema: JSON.stringify(compactSchema, null, 2),
                    }
                );
                await fs.promises.writeFile(
                    path.join(outputFile, `${fileName}.${templateName}.ts`),
                    await prettier.format(finalContent, {
                        parser: "typescript",
                    })
                );
            })
        );
    });

    load.stop();
}
