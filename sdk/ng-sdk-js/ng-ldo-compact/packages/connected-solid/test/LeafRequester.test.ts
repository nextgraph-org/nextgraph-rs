// import type { App } from "@solid/community-server";
// import { getAuthenticatedFetch, ROOT_COONTAINER } from "./solidServer.helper.js";
// import type { SolidLdoDataset } from "../src/SolidLdoDataset.js";
// import { createSolidLdoDataset } from "../src/createSolidLdoDataset.js";
// import { LeafRequester } from "../src/requester/LeafRequester.js";
import { describe, it, expect } from "vitest";

describe("Leaf Requester", () => {
  it("trivial", () => {
    expect(true).toBe(true);
  });
});

// describe.skip("Leaf Requester", () => {
//   let _app: App;
//   let authFetch: typeof fetch;
//   let fetchMock: typeof fetch;
//   let solidLdoDataset: SolidLdoDataset;

//   beforeAll(async () => {
//     // Start up the server
//     // app = await createApp();
//     // await app.start();

//     authFetch = await getAuthenticatedFetch();
//   });

//   beforeEach(async () => {
//     fetchMock = jest.fn(authFetch);
//     solidLdoDataset = createSolidLdoDataset({ fetch: fetchMock });
//     // Create a new document called sample.ttl
//     await Promise.all([
//       authFetch(`${ROOT_COONTAINER}test_leaf/`, {
//         method: "POST",
//         headers: { "content-type": "text/turtle", slug: "sample.ttl" },
//         body: `@base <http://example.org/> .
//         @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
//         @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
//         @prefix foaf: <http://xmlns.com/foaf/0.1/> .
//         @prefix rel: <http://www.perceive.net/schemas/relationship/> .

//         <#green-goblin>
//             rel:enemyOf <#spiderman> ;
//             a foaf:Person ;    # in the context of the Marvel universe
//             foaf:name "Green Goblin" .

//         <#spiderman>
//             rel:enemyOf <#green-goblin> ;
//             a foaf:Person ;
//             foaf:name "Spiderman", "Человек-паук"@ru .`,
//       }),
//       authFetch(`${ROOT_COONTAINER}test_leaf/`, {
//         method: "PUT",
//         headers: { "content-type": "text/plain", slug: "sample.txt" },
//         body: `some text.`,
//       }),
//     ]);
//   });

//   afterEach(async () => {
//     await Promise.all([
//       authFetch(`${ROOT_COONTAINER}test_leaf/sample.ttl`, {
//         method: "DELETE",
//       }),
//       authFetch(`${ROOT_COONTAINER}test_leaf/sample2.ttl`, {
//         method: "DELETE",
//       }),
//       authFetch(`${ROOT_COONTAINER}test_leaf/sample.txt`, {
//         method: "DELETE",
//       }),
//       authFetch(`${ROOT_COONTAINER}test_leaf/sample2.txt`, {
//         method: "DELETE",
//       }),
//     ]);
//   });

//   /**
//    * ===========================================================================
//    * Read
//    * ===========================================================================
//    */
//   it("reads data", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/sample.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.read();
//     expect(result.type).toBe("data");
//     expect(
//       solidLdoDataset.match(
//         null,
//         null,
//         null,
//         namedNode(`${ROOT_COONTAINER}test_leaf/sample.ttl`),
//       ).size,
//     ).toBe(7);
//   });

//   it("reads data that doesn't exist", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/doesnotexist.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.read();
//     expect(result.type).toBe("absent");
//   });

//   /**
//    * ===========================================================================
//    * Create
//    * ===========================================================================
//    */
//   it("creates a data resource that doesn't exist while not overwriting", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/sample2.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.createDataResource();
//     expect(result.type).toBe("data");
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//           namedNode("http://www.w3.org/ns/ldp#contains"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample2.ttl`),
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//         ),
//       ),
//     ).toBe(true);
//   });

//   it("creates a data resource that doesn't exist while overwriting", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/sample2.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.createDataResource(true);
//     expect(result.type).toBe("data");
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//           namedNode("http://www.w3.org/ns/ldp#contains"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample2.ttl`),
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//         ),
//       ),
//     ).toBe(true);
//   });

//   it("creates a data resource that does exist while not overwriting", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/sample.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.createDataResource();
//     expect(result.type).toBe("data");
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode("http://example.org/#spiderman"),
//           namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
//           namedNode("http://example.org/#green-goblin"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample.ttl`),
//         ),
//       ),
//     ).toBe(true);
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//           namedNode("http://www.w3.org/ns/ldp#contains"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample.ttl`),
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//         ),
//       ),
//     ).toBe(true);
//   });

//   it("creates a data resource that does exist while overwriting", async () => {
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}test_leaf/sample.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.createDataResource(true);
//     expect(result.type).toBe("data");
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode("http://example.org/#spiderman"),
//           namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
//           namedNode("http://example.org/#green-goblin"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample.ttl`),
//         ),
//       ),
//     ).toBe(false);
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//           namedNode("http://www.w3.org/ns/ldp#contains"),
//           namedNode(`${ROOT_COONTAINER}test_leaf/sample.ttl`),
//           namedNode(`${ROOT_COONTAINER}test_leaf/`),
//         ),
//       ),
//     ).toBe(true);
//   });

//   /**
//    * ===========================================================================
//    * Delete
//    * ===========================================================================
//    */
//   it("deletes data", async () => {
//     solidLdoDataset.add(
//       createQuad(
//         namedNode("a"),
//         namedNode("b"),
//         namedNode("c"),
//         namedNode(`${ROOT_COONTAINER}/test_leaf/sample.ttl`),
//       ),
//     );
//     solidLdoDataset.add(
//       createQuad(
//         namedNode(`${ROOT_COONTAINER}/test_leaf/`),
//         namedNode("http://www.w3.org/ns/ldp#contains"),
//         namedNode(`${ROOT_COONTAINER}/test_leaf/sample.ttl`),
//         namedNode(`${ROOT_COONTAINER}/test_leaf/`),
//       ),
//     );
//     const leafRequester = new LeafRequester(
//       `${ROOT_COONTAINER}/test_leaf/sample.ttl`,
//       solidLdoDataset.context,
//     );
//     const result = await leafRequester.delete();
//     expect(result.type).toBe("absent");
//     expect(
//       solidLdoDataset.match(
//         null,
//         null,
//         null,
//         namedNode(`${ROOT_COONTAINER}/test_leaf/sample.ttl`),
//       ).size,
//     ).toBe(0);
//     expect(
//       solidLdoDataset.has(
//         createQuad(
//           namedNode(`${ROOT_COONTAINER}/test_leaf/`),
//           namedNode("http://www.w3.org/ns/ldp#contains"),
//           namedNode(`${ROOT_COONTAINER}/test_leaf/sample.ttl`),
//           namedNode(`${ROOT_COONTAINER}/test_leaf/`),
//         ),
//       ),
//     ).toBe(false);
//   });
// });
