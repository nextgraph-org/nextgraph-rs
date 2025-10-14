import fs from "fs";
import path from "node:path";
export async function forAllShapes(shapePath, callback) {
    const shapeDir = await fs.promises.readdir(shapePath, {
        withFileTypes: true,
    });
    // Filter out non-shex documents
    const shexFiles = shapeDir.filter((file) => file.isFile() && file.name.endsWith(".shex"));
    const shexPromise = Promise.all(shexFiles.map(async (file) => {
        const fileName = path.parse(file.name).name;
        // Get the content of each document
        const shexC = await fs.promises.readFile(path.join(shapePath, file.name), "utf8");
        await callback(fileName, shexC);
    }));
    // Note: SHACL conversion omitted here.
    await Promise.all([shexPromise]);
}
