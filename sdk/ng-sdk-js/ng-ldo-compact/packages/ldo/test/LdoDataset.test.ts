import { namedNode, quad, literal } from "@ldo/rdf-utils";
import { createDataset } from "@ldo/dataset";
import type { SolidProfileShape } from "./profileData.js";
import { ProfileShapeType } from "./profileData.js";
import type { LdoBuilder, LdoDataset } from "../src/index.js";
import {
  createLdoDataset,
  graphOf,
  parseRdf,
  toTurtle,
  set,
} from "../src/index.js";
import { sampleJsonld, sampleTurtle } from "./sampleData.js";
import type { SubjectProxy } from "@ldo/jsonld-dataset-proxy";
import { _proxyContext } from "@ldo/jsonld-dataset-proxy";

describe("LdoDataset", () => {
  let ldoDataset: LdoDataset;
  let profileBuilder: LdoBuilder<SolidProfileShape>;

  beforeEach(async () => {
    ldoDataset = await parseRdf(sampleTurtle, {
      baseIRI: "https://solidweb.org/jackson/profile/card",
    });
    profileBuilder = ldoDataset.usingType(ProfileShapeType);
  });

  it("Creates a blank profile", async () => {
    ldoDataset = createLdoDataset();
    profileBuilder = ldoDataset.usingType(ProfileShapeType);
    const profile = profileBuilder.fromSubject(
      "https://example.com/person1#me",
    );
    profile.fn = "Diplo";
    expect(await toTurtle(profile)).toBe(
      '<https://example.com/person1#me> <http://www.w3.org/2006/vcard/ns#fn> "Diplo" .\n',
    );
  });

  it("initializes a profile using the fromJson method", () => {
    const profile = profileBuilder.fromJson({
      type: set({ "@id": "Person" }, { "@id": "Person2" }),
      inbox: { "@id": "https://inbox.com" },
      fn: "Diplo",
    });
    expect(profile.inbox).toEqual({ "@id": "https://inbox.com" });
    expect(profile.fn).toBe("Diplo");
    expect(profile["@id"]).toBe(undefined);
  });

  it("initializes a profile with an id using the fromJson method", () => {
    const profile = profileBuilder.fromJson({
      "@id": "https://example.com/person1",
      type: set({ "@id": "Person" }, { "@id": "Person2" }),
      inbox: { "@id": "https://inbox.com" },
      fn: "Diplo",
    });
    expect(profile.inbox).toEqual({ "@id": "https://inbox.com" });
    expect(profile.fn).toBe("Diplo");
    expect(profile["@id"]).toBe("https://example.com/person1");
  });

  it("retrieves a subject with a named node", async () => {
    const profile = await profileBuilder.fromSubject(
      namedNode("https://solidweb.org/jackson/profile/card#me"),
    );
    expect(profile.fn).toBe("Jackson Morgan");
  });

  it("retrieves a subject with a string id", async () => {
    const profile = profileBuilder.fromSubject(
      "https://solidweb.org/jackson/profile/card#me",
    );
    expect(profile.fn).toBe("Jackson Morgan");
  });

  it("uses an existing dataset as the basis for the ldo", async () => {
    const dataset = createDataset();
    dataset.add(
      quad(
        namedNode("https://example.com/person1"),
        namedNode("http://xmlns.com/foaf/0.1/name"),
        literal("Captain cool"),
      ),
    );
    const profile = createLdoDataset(dataset)
      .usingType(ProfileShapeType)
      .fromSubject("https://example.com/person1");
    expect(profile.name).toBe("Captain cool");
  });

  it("uses an existing array of quads as the basis for the ldo", async () => {
    const quads = [
      quad(
        namedNode("https://example.com/person1"),
        namedNode("http://xmlns.com/foaf/0.1/name"),
        literal("Captain cool"),
      ),
    ];
    const profile = createLdoDataset(quads)
      .usingType(ProfileShapeType)
      .fromSubject("https://example.com/person1");
    expect(profile.name).toBe("Captain cool");
  });

  it("parses JsonLD", async () => {
    await expect(async () => parseRdf(sampleJsonld)).rejects.toThrow(
      "Not Implemented",
    );
    // ldoDataset = await parseRdf(sampleJsonld);
    // const profile = ldoDataset
    //   .usingType(ProfileShapeType)
    //   .fromSubject("https://example.com/item");
    // expect(profile.name).toBe("Captain of Coolness");
  });

  it("parses an existing dataset", async () => {
    const ldoDataset = await parseRdf(createDataset());
    expect(typeof ldoDataset.usingType).toBe("function");
  });

  it("Sets the proper write graphs", () => {
    const profile = profileBuilder
      .write("https://example.com/exampleGraph")
      .fromSubject("https://example.com/person1");
    profile.name = "Jackson";
    expect(graphOf(profile, "name")[0].value).toBe(
      "https://example.com/exampleGraph",
    );
  });

  it("Lets a match query retrieve subjects", () => {
    const profiles = profileBuilder.matchSubject(
      "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
      "http://xmlns.com/foaf/0.1/Person",
    );
    expect(profiles.toArray()[0].fn).toBe("Jackson Morgan");
  });

  it("Handles alternate optionality for subject match", () => {
    const profiles = profileBuilder.matchSubject(
      undefined,
      undefined,
      "https://someGraph.com",
    );
    expect(profiles.size).toBe(0);
  });

  it("Lets a match query retrieve objects", () => {
    const profiles = profileBuilder.matchObject(
      null,
      "http://xmlns.com/foaf/0.1/primaryTopic",
    );
    expect(profiles.toArray()[0].fn).toBe("Jackson Morgan");
  });

  it("Handles alternate optionality for object match", () => {
    const profiles = profileBuilder.matchObject(
      "https://someSubject",
      undefined,
      "https://someGraph.com",
    );
    expect(profiles.size).toBe(0);
  });

  it("Sets language preferences", () => {
    const profile = profileBuilder
      .setLanguagePreferences("@none", "en")
      .fromSubject("https://solidweb.org/jackson/profile/card#me");
    expect(
      (profile as unknown as SubjectProxy)[_proxyContext].languageOrdering,
    ).toEqual(["@none", "en"]);
  });
});
