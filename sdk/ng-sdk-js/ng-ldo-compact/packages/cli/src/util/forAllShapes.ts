import fs from "fs";
import path from "path";
import { shaclStoreToShexSchema, writeShexSchema } from "@jeswr/shacl2shex";
import { dereferenceToStore } from "rdf-dereference-store";
import type { Store } from "n3";
import { DataFactory as DF } from "n3";
import { rdf } from "rdf-namespaces";

function hasMatch(store: Store, predicate: string, object: string) {
  for (const _ in store.match(
    null,
    DF.namedNode(predicate),
    DF.namedNode(object),
    DF.defaultGraph(),
  )) {
    return true;
  }
  return false;
}

export async function forAllShapes(
  shapePath: string,
  callback: (filename: string, shape: string) => Promise<void>,
): Promise<void> {
  const shapeDir = await fs.promises.readdir(shapePath, {
    withFileTypes: true,
  });
  // Filter out non-shex documents
  const shexFiles = shapeDir.filter(
    (file) => file.isFile() && file.name.endsWith(".shex"),
  );
  const shexPromise = Promise.all(
    shexFiles.map(async (file) => {
      const fileName = path.parse(file.name).name;
      // Get the content of each document
      const shexC = await fs.promises.readFile(
        path.join(shapePath, file.name),
        "utf8",
      );
      await callback(fileName, shexC);
    }),
  );

  const shaclPromise = Promise.all(
    shapeDir.map(async (file) => {
      if (file.isFile()) {
        let store: Awaited<ReturnType<typeof dereferenceToStore>>;
        try {
          store = await dereferenceToStore(path.join(shapePath, file.name), {
            localFiles: true,
          });
        } catch (e) {
          return;
        }
        // Make sure the RDF file contains a SHACL shape
        if (
          hasMatch(
            store.store,
            rdf.type,
            "http://www.w3.org/ns/shacl#NodeShape",
          ) ||
          hasMatch(
            store.store,
            rdf.type,
            "http://www.w3.org/ns/shacl#PropertyShape",
          )
        ) {
          const shex = await writeShexSchema(
            await shaclStoreToShexSchema(store.store),
            store.prefixes,
          );
          await callback(path.parse(file.name).name, shex);
        }
      }
    }),
  );
  await Promise.all([shexPromise, shaclPromise]);
}
