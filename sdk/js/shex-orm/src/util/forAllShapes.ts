// Copyright (c) 2023 Jackson Morgan
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import fs from "fs";
import path from "node:path";

export async function forAllShapes(
    shapePath: string,
    callback: (filename: string, shape: string) => Promise<void>
): Promise<void> {
    const shapeDir = await fs.promises.readdir(shapePath, {
        withFileTypes: true,
    });
    // Filter out non-shex documents
    const shexFiles = shapeDir.filter(
        (file) => file.isFile() && file.name.endsWith(".shex")
    );
    const shexPromise = Promise.all(
        shexFiles.map(async (file) => {
            const fileName = path.parse(file.name).name;
            // Get the content of each document
            const shexC = await fs.promises.readFile(
                path.join(shapePath, file.name),
                "utf8"
            );
            await callback(fileName, shexC);
        })
    );

    // Note: SHACL conversion omitted here.

    await Promise.all([shexPromise]);
}
