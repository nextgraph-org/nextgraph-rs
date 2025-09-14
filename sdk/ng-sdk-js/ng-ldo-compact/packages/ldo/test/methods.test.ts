import { namedNode } from "@ldo/rdf-utils";
import type { SubjectProxy } from "@ldo/jsonld-dataset-proxy";
import {
  getProxyFromObject,
  graphOf,
  _getUnderlyingDataset,
  _proxyContext,
} from "@ldo/jsonld-dataset-proxy";
import { createDataset } from "@ldo/dataset";
import type { SolidProfileShape } from "./profileData.js";
import { ProfileShapeType } from "./profileData.js";
import {
  commitTransaction,
  createLdoDataset,
  getDataset,
  serialize,
  startTransaction,
  toJsonLd,
  toNTriples,
  toSparqlUpdate,
  toTurtle,
  transactionChanges,
  write,
  setLanguagePreferences,
  languagesOf,
} from "../src/index.js";
import type { ILdoDataset } from "../src/types.js";

describe("methods", () => {
  let dataset: ILdoDataset;
  let profile: SolidProfileShape;
  beforeEach(() => {
    dataset = createLdoDataset();
    profile = dataset
      .usingType(ProfileShapeType)
      .fromSubject(namedNode("https://example.com/item"));
  });

  it("Records changes in a transaction", () => {
    startTransaction(profile);
    profile.name = "Beeboo";
    const changes = transactionChanges(profile);
    expect(changes.added?.size).toBe(1);
    expect(changes.removed).toBe(undefined);
  });

  it("throws when called with startTransaction if an underlying dataset is not a subscribable dataset", () => {
    const proxy = getProxyFromObject(profile);
    proxy[_proxyContext] = proxy[_proxyContext].duplicate({
      dataset: createDataset(),
    });
    expect(() => startTransaction(profile)).toThrow(
      "Object is not transactable.",
    );
  });

  it("Commits changes", () => {
    startTransaction(profile);
    profile.name = "Joey";
    expect(dataset.size).toBe(0);
    commitTransaction(profile);
    expect(dataset.size).toBe(1);
    expect(profile.name).toBe("Joey");
  });

  it("throws an error if transaction dependent functions are called without a transaction", async () => {
    expect(() => transactionChanges(profile)).toThrow(
      "Object is not currently in a transaction",
    );
    expect(() => commitTransaction(profile)).toThrow(
      "Object is not currently in a transaction",
    );
    await expect(async () => toSparqlUpdate(profile)).rejects.toThrow(
      "Object is not currently in a transaction",
    );
  });

  it("provides the correct sparql update", async () => {
    profile.name = "Mr. Cool Dude";
    startTransaction(profile);
    profile.name = "Captain of Coolness";
    expect(await toSparqlUpdate(profile)).toBe(
      `DELETE DATA { <https://example.com/item> <http://xmlns.com/foaf/0.1/name> "Mr. Cool Dude" .  }; INSERT DATA { <https://example.com/item> <http://xmlns.com/foaf/0.1/name> "Captain of Coolness" .  }`,
    );
  });

  it("provides a sparql update when nothing has been changed", async () => {
    startTransaction(profile);
    expect(await toSparqlUpdate(profile)).toBe("");
  });

  it("translates into turtle", async () => {
    profile.name = "Captain of Coolness";
    expect(await toTurtle(profile)).toBe(
      '<https://example.com/item> <http://xmlns.com/foaf/0.1/name> "Captain of Coolness" .\n',
    );
  });

  it("translates into n-triples", async () => {
    profile.name = "Captain of Coolness";
    expect(await toNTriples(profile)).toBe(
      '<https://example.com/item> <http://xmlns.com/foaf/0.1/name> "Captain of Coolness" .\n',
    );
  });

  it("uses the serialize method", async () => {
    profile.name = "Captain of Coolness";
    expect(await serialize(profile, { format: "Turtle" })).toBe(
      '<https://example.com/item> <http://xmlns.com/foaf/0.1/name> "Captain of Coolness" .\n',
    );
  });

  it.skip("translates into jsonld", async () => {
    profile.name = "Captain of Coolness";
    expect(await toJsonLd(profile)).toEqual([
      {
        "@id": "https://example.com/item",
        "http://xmlns.com/foaf/0.1/name": "Captain of Coolness",
      },
    ]);
  });

  it("errors when asked to convert to JsonLd", async () => {
    await expect(async () => toJsonLd(profile)).rejects.toThrow(
      "Not Implemented",
    );
  });

  it("returns the underlying dataset", () => {
    const underlyingDataset = getDataset(profile);
    expect(typeof underlyingDataset.add).toBe("function");
  });

  it("sets a write graph", () => {
    write("https://graphname.com").using(profile);
    profile.name = "Jackson";
    expect(graphOf(profile, "name")[0].value).toBe("https://graphname.com");
  });

  it("sets the language preferences", () => {
    setLanguagePreferences("@none", "en").using(profile);
    expect(
      (profile as unknown as SubjectProxy)[_proxyContext].languageOrdering,
    ).toEqual(["@none", "en"]);
  });

  it("uses languagesOf", () => {
    const result = languagesOf(profile, "name");
    expect(result).toEqual({});
  });
});
