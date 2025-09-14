import type { DatasetCore, Quad } from "@rdfjs/types";
import type { ContextDefinition, JsonLdDocument } from "jsonld";
import type { WriterOptions as WriterOptionsImport } from "n3";
import { Writer } from "n3";
// import SerializerJsonld from "@rdfjs/serializer-jsonld";
// import { Readable } from "readable-stream";

export type WriterOptions = WriterOptionsImport;

export function datasetToString(
  dataset: DatasetCore<Quad>,
  options: WriterOptions,
): string {
  const writer = new Writer(options);
  const quadArr: Quad[] = [];
  for (const quad of dataset) {
    quadArr.push(quad);
  }
  return writer.quadsToString(quadArr);
}

export async function datasetToJsonLd(
  _dataset: DatasetCore,
  _context: ContextDefinition,
): Promise<JsonLdDocument> {
  throw new Error("JSONLD serialization is not omplemented");
}

// export async function datasetToJsonLd(
//   dataset: Dataset,
//   context: ContextDefinition
// ): Promise<JsonLdDocument> {
//   return new Promise((resolve, reject) => {
//     const serializerJsonld = new SerializerJsonld();
//     const input = new Readable({
//       objectMode: true,
//       read: () => {
//         dataset.forEach((quad) => {
//           input.push(quad);
//         });
//         input.push(null);
//       },
//     });
//     const output = serializerJsonld.import(input);

//     output.on("data", (jsonld) => {
//       resolve(jsonld);
//     });
//     /* istanbul ignore next */
//     output.on("error", (err) => {
//       /* istanbul ignore next */
//       reject(err);
//     });
//   });
// }
