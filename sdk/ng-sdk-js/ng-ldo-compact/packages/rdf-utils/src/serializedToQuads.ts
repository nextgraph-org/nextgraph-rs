import type { Quad } from "@rdfjs/types";
import type { ParserOptions as ParserOptionsImport } from "n3";
import { Parser } from "n3";

export type ParserOptions = ParserOptionsImport;

export async function serializedToQuads(
  data: string,
  options?: ParserOptions,
): Promise<Quad[]> {
  // JSON-LD Parsing
  if (options && options.format === "application/ld+json") {
    throw new Error("Not Implemented");
    // return new Promise((resolve, reject) => {
    //   JSON.parse(data);
    //   const parserJsonld = new ParserJsonld();

    //   const input = new Readable({
    //     read: () => {
    //       input.push(data);
    //       input.push(null);
    //     },
    //   });

    //   const output = parserJsonld.import(input);
    //   const quads: Quad[] = [];
    //   output.on("data", (quad) => {
    //     quads.push(quad);
    //   });
    //   output.on("end", () => {
    //     resolve((datasetFactory.dataset(quads) as unknown) as ReturnDataset);
    //   });
    //   /* istanbul ignore next */
    //   output.on("error", (err) => {
    //     /* istanbul ignore next */
    //     reject(err);
    //   });
    // });
  }
  // N3 Parsing
  const parser = new Parser(options as ParserOptions);
  return parser.parse(data);
}
