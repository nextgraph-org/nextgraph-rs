import { createDataset, serializedToDataset } from "@ldo/dataset";
import type {
  JsonldDatasetProxyBuilder,
  LanguageSet,
  LdSet,
} from "../src/index.js";
import {
  graphOf,
  jsonldDatasetProxy,
  languagesOf,
  setLanguagePreferences,
  write,
  _getUnderlyingDataset,
  _getUnderlyingMatch,
  _getUnderlyingNode,
  _isSubjectOriented,
  _proxyContext,
  _writeGraphs,
  set,
  SetProxy,
} from "../src/index.js";
import type { ObservationShape, PatientShape } from "./patientExampleData.js";
import {
  patientData,
  tinyPatientData,
  tinyArrayPatientData,
  patientDataWithBlankNodes,
  tinyPatientDataWithBlankNodes,
  tinyPatientDataWithLanguageTags,
  patientUnnestedContext,
  patientNestedContext,
} from "./patientExampleData.js";
import {
  namedNode,
  quad,
  literal,
  defaultGraph,
  blankNode,
} from "@ldo/rdf-utils";
import type { Dataset, NamedNode } from "@rdfjs/types";
import type { ContextDefinition } from "jsonld";
import type { LdoJsonldContext } from "../src/LdoJsonldContext.js";
import {
  scopedContext,
  scopedData,
  type Avatar,
  type Bender,
} from "./scopedExampleData.js";
import { WildcardSubjectSetProxy } from "../src/setProxy/WildcardSubjectSetProxy.js";

global.console.warn = () => {};

const testJsonldDatasetProxy = (patientContext: LdoJsonldContext) => () => {
  async function getLoadedDataset(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(patientData);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getLoadedDatasetWithBlankNodes(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(patientDataWithBlankNodes);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getTinyLoadedDataset(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(tinyPatientData);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getGraphLoadedDataset(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const tempDataset = await serializedToDataset(patientData);
    const dataset = createDataset();
    const subjectGraphMap: Record<string, NamedNode> = {
      "http://example.com/Observation1": namedNode(
        "http://example.com/Observation1Doc",
      ),
      "http://example.com/Patient1": namedNode(
        "http://example.com/Patient1Doc",
      ),
      "http://example.com/Patient2": namedNode(
        "http://example.com/Patient2Doc",
      ),
      "http://example.com/Patient3": namedNode(
        "http://example.com/Patient3Doc",
      ),
    };
    tempDataset.forEach((tempQuad) => {
      dataset.add(
        quad(
          tempQuad.subject,
          tempQuad.predicate,
          tempQuad.object,
          subjectGraphMap[tempQuad.subject.value],
        ),
      );
    });
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getTinyLoadedDatasetWithBlankNodes(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(tinyPatientDataWithBlankNodes);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getTinyLoadedDatasetWithLanguageTags(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(tinyPatientDataWithLanguageTags);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getArrayLoadedDataset(): Promise<
    [Dataset, PatientShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(tinyArrayPatientData);
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Patient1")),
      builder,
    ];
  }

  async function getEmptyObservationDataset(): Promise<
    [Dataset, ObservationShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await createDataset();
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Observation1")),
      builder,
    ];
  }

  async function getEmptyPatientDataset(): Promise<
    [Dataset, PatientShape, JsonldDatasetProxyBuilder]
  > {
    const dataset = await createDataset();
    const builder = await jsonldDatasetProxy(dataset, patientContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Patient1")),
      builder,
    ];
  }

  async function getScopedDataset(): Promise<
    [Dataset, Bender, Avatar, JsonldDatasetProxyBuilder]
  > {
    const dataset = await serializedToDataset(scopedData);
    const builder = await jsonldDatasetProxy(dataset, scopedContext);
    return [
      dataset,
      builder.fromSubject(namedNode("http://example.com/Katara")),
      builder.fromSubject(namedNode("http://example.com/Aang")),
      builder,
    ];
  }

  describe("read", () => {
    it("retreives a primitive", async () => {
      const [, observation] = await getLoadedDataset();
      expect(observation["@id"]).toBe("http://example.com/Observation1");
      expect(observation.notes).toBe("Cool Notes");
    });

    it("retreives a primitive with blank nodes", async () => {
      const [, observation] = await getLoadedDatasetWithBlankNodes();
      expect(observation.subject?.age).toBe(35);
    });

    it("retrieves a nested primitive", async () => {
      const [, observation] = await getLoadedDataset();
      expect(observation?.subject && observation.subject["@id"]).toBe(
        "http://example.com/Patient1",
      );
      expect(observation?.subject?.age).toBe(35);
      expect(observation?.subject?.birthdate).toBe("1986-01-01");
      expect(observation?.subject?.isHappy).toBe(true);
    });

    it("retrieves a nested primitive with a blank node", async () => {
      const [, observation] = await getLoadedDatasetWithBlankNodes();
      expect(observation?.subject?.roommate?.map((obj) => obj.age)).toContain(
        34,
      );
    });

    it("retreives a @type value as rdf:type", async () => {
      const [, observation] = await getLoadedDataset();
      expect(observation.subject?.type?.["@id"]).toBe("Patient");
    });

    it("simulates the getter behavior of an array of primitives", async () => {
      const [, observation] = await getLoadedDataset();
      const set = observation!.subject!.name!;
      expect(set.size).toBe(3);
      expect(set).toContain("Garrett");
      expect(set).toContain("Bobby");
      expect(set).toContain("Ferguson");
      const entriesIterator = set.entries();
      expect(entriesIterator.next()).toEqual({
        value: ["Garrett", "Garrett"],
        done: false,
      });
      expect(entriesIterator.next()).toEqual({
        value: ["Bobby", "Bobby"],
        done: false,
      });
      expect(entriesIterator.next()).toEqual({
        value: ["Ferguson", "Ferguson"],
        done: false,
      });
      expect(entriesIterator.next()).toEqual({
        value: undefined,
        done: true,
      });
      expect(set.every((val) => val.length > 2)).toBe(true);
      expect(set.every((val) => val.length > 6)).toBe(false);
      const filteredSet = set.filter((val) => val.length > 6);
      expect(filteredSet.size).toBe(2);
      expect(filteredSet).toContain("Garrett");
      expect(filteredSet).toContain("Ferguson");
      let concatTest = "";
      set.forEach((value) => (concatTest += value));
      expect(concatTest).toBe("GarrettBobbyFerguson");
      expect(set.has("Bobby")).toBe(true);
      const keysIterator = set.keys();
      expect(keysIterator.next()).toEqual({
        value: "Garrett",
        done: false,
      });
      expect(keysIterator.next()).toEqual({
        value: "Bobby",
        done: false,
      });
      expect(keysIterator.next()).toEqual({
        value: "Ferguson",
        done: false,
      });
      expect(keysIterator.next()).toEqual({
        value: undefined,
        done: true,
      });
      expect(set.map((val) => val.toUpperCase())).toEqual([
        "GARRETT",
        "BOBBY",
        "FERGUSON",
      ]);
      expect(set.reduce((agg, val) => agg + val, "")).toBe(
        "GarrettBobbyFerguson",
      );
      expect(set.some((val) => val.startsWith("G"))).toBe(true);
      const valuesIterator = set.values();
      expect(valuesIterator.next()).toEqual({
        value: "Garrett",
        done: false,
      });
      expect(valuesIterator.next()).toEqual({
        value: "Bobby",
        done: false,
      });
      expect(valuesIterator.next()).toEqual({
        value: "Ferguson",
        done: false,
      });
      expect(valuesIterator.next()).toEqual({
        value: undefined,
        done: true,
      });
      expect(JSON.stringify(set)).toBe(`["Garrett","Bobby","Ferguson"]`);
      expect(set.toString()).toBe("[object LdSet]");
    });

    it("can traverse a circular graph", async () => {
      const [, observation] = await getLoadedDataset();
      expect(
        observation.subject?.roommate
          ?.toArray()[0]
          .roommate?.toArray()[0]
          ?.name?.toArray()[0],
      ).toBe("Garrett");
    });

    it("simulates getter object properties", async () => {
      const [, observation] = await getLoadedDataset();
      const obj = observation.subject as PatientShape;

      expect(obj["@id"]).toEqual("http://example.com/Patient1");
      expect(obj.type).toEqual({ "@id": "Patient" });
      expect(obj.name).toContain("Garrett");
      expect(obj.name).toContain("Bobby");
      expect(obj.name).toContain("Ferguson");
      expect(obj.birthdate).toEqual("1986-01-01");
      expect(obj.age).toEqual(35);
      expect(obj.isHappy).toEqual(true);
      const entries = Object.entries(obj);
      expect(entries[0][0]).toBe("@id");
      expect(entries[0][1]).toBe("http://example.com/Patient1");
      expect(entries[1][0]).toBe("type");
      expect(entries[1][1]).toEqual({ "@id": "Patient" });
      expect(entries[2][0]).toBe("name");
      expect(entries[2][1]).toContain("Garrett");
      expect(entries[2][1]).toContain("Bobby");
      expect(entries[2][1]).toContain("Ferguson");
      expect(entries[3][0]).toBe("birthdate");
      expect(entries[3][1]).toBe("1986-01-01");
      expect(entries[4][0]).toBe("age");
      expect(entries[4][1]).toBe(35);
      expect(entries[5][0]).toBe("isHappy");
      expect(entries[5][1]).toBe(true);
      expect(entries[6][0]).toEqual("roommate");
      expect(Object.keys(obj)).toEqual([
        "@id",
        "type",
        "name",
        "birthdate",
        "age",
        "isHappy",
        "roommate",
      ]);
      const values = Object.values(obj);
      expect(values[0]).toEqual("http://example.com/Patient1");
      expect(values[1]).toEqual({ "@id": "Patient" });
      expect(values[2]).toContain("Garrett");
      expect(values[2]).toContain("Bobby");
      expect(values[2]).toContain("Ferguson");
      expect(values[3]).toEqual("1986-01-01");
      expect(values[4]).toEqual(35);
      expect(values[5]).toEqual(true);
    });

    it("handles stringification of a non circular object", async () => {
      const [, observation] = await getLoadedDataset();
      const obj = observation.subject!.roommate!.toArray()[1];
      expect(obj.toString()).toBe("[object Object]");
      expect(JSON.stringify(obj)).toBe(
        `{"@id":"http://example.com/Patient3","type":{"@id":"Patient"},"name":["Amy"],"birthdate":"1988-01-01","age":33,"isHappy":true}`,
      );
    });

    it("Returns an array for required array fields even if no data is in the dataset", async () => {
      const [, observation] = await getLoadedDataset();
      const obj = observation.subject!.roommate!.toArray()[1];
      expect(obj.roommate).toBeInstanceOf(SetProxy);
      expect(obj.roommate?.size).toBe(0);
    });

    it("updates when the dataset is updated", async () => {
      const [dataset, observation] = await getLoadedDataset();
      expect(observation.notes).toBe("Cool Notes");
      dataset.delete(
        quad(
          namedNode("http://example.com/Observation1"),
          namedNode("http://hl7.org/fhir/notes"),
          literal("Cool Notes", "http://www.w3.org/2001/XMLSchema#string"),
        ),
      );
      dataset.add(
        quad(
          namedNode("http://example.com/Observation1"),
          namedNode("http://hl7.org/fhir/notes"),
          literal("Bad Notes", "http://www.w3.org/2001/XMLSchema#string"),
        ),
      );
      expect(observation.notes).toBe("Bad Notes");
    });

    it("handles stringfication of a circular object", async () => {
      const [, observation] = await getLoadedDataset();
      const obj = observation.subject as PatientShape;
      expect(obj.toString()).toBe("[object Object]");

      expect(() => JSON.stringify(obj)).toThrow(
        "Converting circular structure to JSON",
      );
    });

    it("returns undefined if called with an unrecognized symbol", async () => {
      const [, observation] = await getLoadedDataset();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(observation[Symbol.toPrimitive]).toBe(undefined);
    });

    it("If a container is not a set, but multiple triples exist, it should still return only 1.", async () => {
      const dataset = await serializedToDataset(patientData);
      const fakePatientSContext: ContextDefinition = {
        name: {
          "@id": "http://hl7.org/fhir/name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
      };
      const builder = jsonldDatasetProxy(dataset, fakePatientSContext);
      const patient = builder.fromSubject(
        namedNode("http://example.com/Patient1"),
      );
      expect(patient.name).toBe("Garrett");
    });

    it("returns context when the @context key is called", async () => {
      const [, observation] = await getLoadedDataset();
      expect(observation["@context"]).toEqual(patientContext);
    });

    it("reads an array for collections, but a var for non collections", async () => {
      const [, bender, avatar] = await getScopedDataset();
      expect(avatar.element.map((obj) => obj["@id"])).toContain(
        "http://example.com/Air",
      );
      expect(avatar.element.map((obj) => obj["@id"])).toContain(
        "http://example.com/Water",
      );
      expect(bender.element["@id"]).toBe("http://example.com/Water");
    });
  });

  describe("write", () => {
    it("sets a primitive value that doesn't exist yet", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      observation.type = { "@id": "Observation" };
      observation.notes = "Cool Notes";
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/notes> "Cool Notes" .\n',
      );
    });

    it("sets primitive number and boolean values", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      patient.age = 35;
      patient.isHappy = true;
      expect(dataset.toString()).toBe(
        '<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/age> "35"^^<http://www.w3.org/2001/XMLSchema#integer> .\n<http://example.com/Patient1> <http://hl7.org/fhir/isHappy> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .\n',
      );
    });

    it("sets a @type value as rdf:type", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      expect(dataset.toString()).toBe(
        "<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n",
      );
    });

    it("replaces a primitive value that currently exists", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      dataset.addAll([
        quad(
          namedNode("http://example.com/Observation1"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://hl7.org/fhir/Observation"),
        ),
        quad(
          namedNode("http://example.com/Observation1"),
          namedNode("http://hl7.org/fhir/notes"),
          literal("Cool Notes"),
        ),
      ]);
      observation.notes = "Lame Notes";
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/notes> "Lame Notes" .\n',
      );
    });

    it("adds all quads from a set object", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      const patient: PatientShape = {
        "@id": "http://example.com/Patient1",
        type: { "@id": "Patient" },
        birthdate: "2001-01-01",
      };
      observation.type = { "@id": "Observation" };
      observation.subject = patient;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/birthdate> "2001-01-01"^^<http://www.w3.org/2001/XMLSchema#date> .\n',
      );
    });

    it("sets a retrieved blank node object", async () => {
      const [, observation] = await getTinyLoadedDatasetWithBlankNodes();
      const patient2 = observation.subject?.roommate?.toArray()[0];
      observation.subject = patient2;
      expect(observation.subject?.name).toContain("Rob");
      expect(observation.subject?.roommate?.toArray()[0].name).toContain(
        "Garrett",
      );
      expect(
        observation.subject?.roommate?.toArray()[0]?.roommate?.toArray()[0]
          .name,
      ).toContain("Rob");
    });

    it("only removes the connection when a value is set to undefined", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      observation.subject = undefined;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Creates a blank node if the id is blank during set", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      observation.type = { "@id": "Observation" };
      observation.subject = { type: { "@id": "Patient" }, name: set("Joe") };
      expect(observation.subject?.["@id"]).toBeUndefined();
      expect(observation.subject.name).toContain("Joe");
      expect(
        dataset
          .match(
            namedNode("http://example.com/Observation1"),
            namedNode("http://hl7.org/fhir/subject"),
          )
          .toArray()[0].object.termType,
      ).toBe("BlankNode");
    });

    it("adds all quads from a set object that includes an array", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      const patient: PatientShape = {
        "@id": "http://example.com/Patient1",
        type: { "@id": "Patient" },
        birthdate: "2001-01-01",
        name: set("Jon", "Bon", "Jovi"),
      };
      observation.type = { "@id": "Observation" };
      observation.subject = patient;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/birthdate> "2001-01-01"^^<http://www.w3.org/2001/XMLSchema#date> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Jon" .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Bon" .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Jovi" .\n',
      );
    });

    it("does not infinitely recurse if there is a loop when setting an object", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      const patient1: PatientShape = {
        "@id": "http://example.com/Patient1",
        type: { "@id": "Patient" },
        name: set("jon"),
      };
      const patient2: PatientShape = {
        "@id": "http://example.com/patient2",
        type: { "@id": "Patient" },
        name: set("jane"),
        roommate: set(patient1),
      };
      patient1.roommate = set(patient2);
      observation.type = { "@id": "Observation" };
      observation.subject = patient1;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "jon" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/patient2> .\n<http://example.com/patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/patient2> <http://hl7.org/fhir/name> "jane" .\n<http://example.com/patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("adds a proxy object to the array", async () => {
      const [, , builder] = await getTinyLoadedDataset();
      const patient3: PatientShape = builder.fromSubject(
        namedNode("http://example.com/Patient3"),
      );
      patient3.type = { "@id": "Patient" };
      const patient1: PatientShape = builder.fromSubject(
        namedNode("http://example.com/Patient1"),
      );
      patient3.roommate?.add(patient1);
    });

    it("sets an array", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      patient.name = set("Joe", "Mama");
      expect(dataset.toString()).toBe(
        '<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Joe" .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Mama" .\n',
      );
    });

    it("Does not remove the full object when it is replaced on an object", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const replacementPatient: PatientShape = {
        "@id": "http://example.com/ReplacementPatient",
        type: { "@id": "Patient" },
        name: set("Jackson"),
      };
      observation.subject = replacementPatient;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/ReplacementPatient> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n<http://example.com/ReplacementPatient> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/ReplacementPatient> <http://hl7.org/fhir/name> "Jackson" .\n',
      );
    });

    it("Does not overwrite the full object when a partial object is provided", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      observation.subject = {
        "@id": "http://example.com/Patient2",
        type: { "@id": "Patient" },
      };
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient2> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("allows instances of proxies to be set", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const patient2 = observation.subject!.roommate!.toArray()[0];
      observation.subject = patient2;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient2> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Changes the subject name if the @id is changed", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const patient = observation?.subject as PatientShape;
      patient["@id"] = "http://example.com/RenamedPatient";
      expect(patient["@id"]).toBe("http://example.com/RenamedPatient");
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/RenamedPatient> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/RenamedPatient> .\n<http://example.com/RenamedPatient> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/RenamedPatient> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/RenamedPatient> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n',
      );
    });

    it("converts a node to a blank node when @id is set to undefined", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const patient1 = observation.subject!;
      patient1["@id"] = undefined;
      const underlyingNode = patient1[_getUnderlyingNode];
      expect(underlyingNode.termType).toBe("BlankNode");
      expect(dataset.match(underlyingNode).size).toBe(3);
      expect(patient1.name).toContain("Garrett");
      expect(patient1.roommate?.toArray()[0].name).toContain("Rob");
      const roommatesRoommate = patient1
        .roommate!.toArray()[0]!
        .roommate!.toArray()[0];
      expect(roommatesRoommate.name).toContain("Garrett");
      expect(roommatesRoommate[_getUnderlyingNode].termType).toBe("BlankNode");
      expect(roommatesRoommate[_getUnderlyingNode].equals(underlyingNode)).toBe(
        true,
      );
    });

    it("treats deleting a field as setting that field to undefined", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      delete observation.subject;

      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("treats deleting a field to a collection as setting that field to undefined", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      delete observation.subject?.name;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Removes connecting triples when the delete method is called on a set", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const firstRoommate = observation.subject!.roommate!.toArray()[0];
      observation.subject!.roommate!.delete(firstRoommate);
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Removes connecting triples when the delete method is called on a set with blank nodes", async () => {
      const [dataset, observation] = await getTinyLoadedDatasetWithBlankNodes();
      const originalDatasetSize = dataset.size;
      const roommate1 = observation.subject!.roommate!.toArray()[0];
      observation.subject!.roommate!.delete(roommate1);
      expect(dataset.size).toBe(originalDatasetSize - 1);
      expect(
        dataset.match(
          observation.subject![_getUnderlyingNode],
          null,
          roommate1[_getUnderlyingNode],
        ).size,
      ).toBe(0);
    });

    it("Removes a literal in an array when using the delete method", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      observation.subject!.name!.delete("Garrett");
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("removes all literals in a set using the clear method", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      observation.subject!.name!.clear();
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Deletes itself if @id is deleted", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      delete observation["@id"];
      expect(observation).toEqual({ "@id": "http://example.com/Observation1" });
      expect(dataset.toString()).toBe(
        '<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Does nothing when deleting triples that don't exist", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      delete observation.subject;
      expect(dataset.toString()).toBe("");
    });

    it("Does nothing when deleting context", async () => {
      const [, observation] = await getTinyLoadedDataset();
      delete observation["@context"];
      expect(observation["@context"]).toEqual(patientContext);
    });

    it("Does nothing when deleting toString", async () => {
      const [, observation] = await getTinyLoadedDataset();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete observation.toString;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete observation[Symbol.toStringTag];
      expect(typeof observation.toString).toBe("function");
    });

    it("Does nothing when deleting any symbol", async () => {
      const [, observation] = await getTinyLoadedDataset();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete observation[Symbol.search];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(observation[Symbol.search]).toBe(undefined);
    });

    it("Only replaces referenced triples on a node that has the same id as the one it replaced", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      const replacementPatient: PatientShape = {
        "@id": "http://example.com/Patient1",
        type: { "@id": "Patient" },
        name: set("Mister Sneaky"),
      };
      observation.subject = replacementPatient;
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Mister Sneaky" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("handles Object.assign", async () => {
      const [dataset, observation] = await getTinyLoadedDataset();
      Object.assign(observation.subject!, {
        age: 35,
        isHappy: true,
      });
      expect(dataset.toString()).toBe(
        '<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n<http://example.com/Patient1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient1> <http://hl7.org/fhir/name> "Garrett" .\n<http://example.com/Patient1> <http://hl7.org/fhir/roommate> <http://example.com/Patient2> .\n<http://example.com/Patient1> <http://hl7.org/fhir/age> "35"^^<http://www.w3.org/2001/XMLSchema#integer> .\n<http://example.com/Patient1> <http://hl7.org/fhir/isHappy> "true"^^<http://www.w3.org/2001/XMLSchema#boolean> .\n<http://example.com/Patient2> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .\n<http://example.com/Patient2> <http://hl7.org/fhir/name> "Rob" .\n<http://example.com/Patient2> <http://hl7.org/fhir/roommate> <http://example.com/Patient1> .\n',
      );
    });

    it("Adds elements to the array even if they were modified by the datastore", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      patient.name = set("Joe", "Blow");
      dataset.add(
        quad(
          namedNode("http://example.com/Patient1"),
          namedNode("http://hl7.org/fhir/name"),
          literal("Tow"),
        ),
      );
      expect(patient.name.size).toBe(3);
      expect(patient.name).toContain("Joe");
      expect(patient.name).toContain("Blow");
      expect(patient.name).toContain("Tow");
    });

    it("Removes elements from the set even if they were modified by the datastore", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      patient.name = set("Joe", "Blow");
      dataset.delete(
        quad(
          namedNode("http://example.com/Patient1"),
          namedNode("http://hl7.org/fhir/name"),
          literal("Blow"),
        ),
      );
      expect(patient.name.size).toBe(1);
      expect(patient.name).toContain("Joe");
    });

    it("Removes and adds from the array even if they were modified by the datastore", async () => {
      const [dataset, patient] = await getEmptyPatientDataset();
      patient.type = { "@id": "Patient" };
      patient.name = set("Joe", "Blow");
      dataset.delete(
        quad(
          namedNode("http://example.com/Patient1"),
          namedNode("http://hl7.org/fhir/name"),
          literal("Blow"),
        ),
      );
      dataset.add(
        quad(
          namedNode("http://example.com/Patient1"),
          namedNode("http://hl7.org/fhir/name"),
          literal("Tow"),
        ),
      );
      expect(patient.name.size).toBe(2);
      expect(patient.name).toContain("Joe");
      expect(patient.name).toContain("Tow");
    });

    it("Prevents duplicates from being added to the array", async () => {
      const [, patient] = await getArrayLoadedDataset();
      const arr = patient.name!;
      arr.add("Garrett");
      expect(arr.size).toBe(3);
      expect(arr).toContain("Garrett");
      expect(arr).toContain("Bobby");
      expect(arr).toContain("Ferguson");
    });

    it("Prevents duplicates for Objects", async () => {
      const [, observation] = await getLoadedDataset();
      const roommates = observation.subject!.roommate!;
      roommates.add({
        "@id": "http://example.com/Patient3",
        type: { "@id": "Patient" },
      });
      expect(roommates.size).toBe(2);
      const roommateNames = roommates.reduce((s, obj) => {
        obj.name?.forEach((n) => s.add(n));
        return s;
      }, set());
      expect(roommateNames).toContain("Amy");
    });

    it("allows rdf namedNodes to be added to a set", async () => {
      const [, observation] = await getTinyLoadedDataset();
      observation.subject?.roommate?.add(
        // @ts-expect-error This isn't technically allowed by the generated types
        namedNode("http://example.com/Patient3"),
      );
      expect(observation.subject?.roommate?.map((r) => r["@id"])).toContain(
        "http://example.com/Patient3",
      );
    });

    it("allows rdf bankNodes to be added to a set", async () => {
      const [, observation] = await getTinyLoadedDataset();
      const blank = blankNode();
      observation.subject?.roommate?.add(
        // @ts-expect-error This isn't technically allowed by the generated types
        blank,
      );
      expect(
        observation.subject?.roommate?.map((r) => r[_getUnderlyingNode]),
      ).toContain(blank);
    });

    it("Can set a triple object named node with just a string", async () => {
      const [dataset, observation] = await getEmptyObservationDataset();
      observation.type = { "@id": "Observation" };
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      observation.subject = "http://example.com/Patient1";
      expect(observation.subject).toEqual({
        "@id": "http://example.com/Patient1",
      });
      expect(dataset.toString()).toBe(
        "<http://example.com/Observation1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Observation> .\n<http://example.com/Observation1> <http://hl7.org/fhir/subject> <http://example.com/Patient1> .\n",
      );
    });
  });

  describe("underlying data", () => {
    it("retrieves underlying data", async () => {
      const dataset = await serializedToDataset(patientData);
      const entryNode = namedNode("http://example.com/Observation1");
      const context = patientContext;
      const builder = jsonldDatasetProxy(dataset, context);
      const observation = builder.fromSubject(entryNode);
      expect(observation[_getUnderlyingDataset]).toBe(dataset);
      expect(observation[_getUnderlyingNode].value).toBe(
        "http://example.com/Observation1",
      );
      expect(observation[_writeGraphs][0].termType).toBe("DefaultGraph");
      expect(observation[_proxyContext].writeGraphs[0].termType).toBe(
        "DefaultGraph",
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const roommateArr = observation.subject!.roommate!;
      expect(roommateArr[_getUnderlyingDataset]).toBe(dataset);
      expect(roommateArr[_isSubjectOriented]).toBe(false);
      const match = roommateArr[_getUnderlyingMatch];
      expect(match[0].value).toBe("http://example.com/Patient1");
      expect(match[1].value).toBe("http://hl7.org/fhir/roommate");
      expect(match[2]).toBe(null);
      expect(match[3]).toBe(null);
    });
  });

  describe("matchSubject", () => {
    let patients: LdSet<PatientShape>;
    let dataset: Dataset;

    beforeEach(async () => {
      const [receivedDataset, , builder] = await getLoadedDataset();
      dataset = receivedDataset;
      patients = builder.matchSubject<PatientShape>(
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://hl7.org/fhir/Patient"),
      );
    });

    it("creates a list of subjects that match a certain pattern", async () => {
      expect(patients.toArray()[0].name?.toArray()[0]).toBe("Garrett");
      expect(patients.toArray()[1].name?.toArray()[0]).toBe("Rob");
      expect(patients.toArray()[2].name?.toArray()[0]).toBe("Amy");
    });

    it("Successfully adds a node to the list", async () => {
      patients.add({
        "@id": "http://example.com/Patient4",
        type: { "@id": "Patient" },
        name: set("Dippy"),
        age: 2,
      });
      expect(
        dataset
          .match(
            null,
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://hl7.org/fhir/Patient"),
          )
          .some((quad) => {
            return quad.subject.value === "http://example.com/Patient4";
          }),
      ).toBe(true);
      expect(patients.toArray()[3].name?.toArray()[0]).toBe("Dippy");
    });

    it("will read a new object if something has been added to the dataset after object creation", async () => {
      dataset.add(
        quad(
          namedNode("http://example.com/Patient4"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://hl7.org/fhir/Patient"),
        ),
      );
      dataset.add(
        quad(
          namedNode("http://example.com/Patient4"),
          namedNode("http://hl7.org/fhir/name"),
          literal("Dippy"),
        ),
      );

      expect(
        dataset
          .match(
            null,
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://hl7.org/fhir/Patient"),
          )
          .some((quad) => {
            return quad.subject.value === "http://example.com/Patient4";
          }),
      ).toBe(true);
      expect(patients.toArray()[3].name?.toArray()[0]).toBe("Dippy");
    });

    it("errors if an object is added without the correct parameters", async () => {
      expect(() =>
        patients.add({
          "@id": "http://example.com/Patient4",
          // @ts-expect-error This object is purposely wrong
          name: ["Dippy"],
          age: 2,
        }),
      ).toThrowError(
        `Cannot add value to collection. This must contain a quad that matches (null, namedNode(http://www.w3.org/1999/02/22-rdf-syntax-ns#type), namedNode(http://hl7.org/fhir/Patient), null)`,
      );
    });

    it("errors if a literal is added to the collection", async () => {
      // @ts-expect-error Purposely pushing an incorrect value to trigger an error
      expect(() => patients.add("some string")).toThrowError(
        `Cannot add a literal "some string"(string) to a subject-oriented collection.`,
      );
    });

    it("creates a collection that matches only collections in a certain graph", async () => {
      const [, , builder] = await getGraphLoadedDataset();
      patients = builder.matchSubject<PatientShape>(
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
        namedNode("http://hl7.org/fhir/Patient"),
        namedNode("http://example.com/Patient1Doc"),
      );
      expect(patients.size).toBe(1);
      expect(patients.map((o) => o["@id"])).toContain(
        "http://example.com/Patient1",
      );
    });

    it("creates a WildcardSubjectSetProxy when providing wildcard subject matches", async () => {
      const [, , builder] = await getLoadedDataset();
      patients = builder.matchSubject<PatientShape>(
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      );
      expect(patients).toBeInstanceOf(WildcardSubjectSetProxy);
      expect(patients[_isSubjectOriented]).toBe(true);
      expect(
        patients.has({
          "@id": "http://example.com/Patient1",
          type: { "@id": "Patient" },
        }),
      ).toBe(true);
    });

    it("does nothing when attempting to modify an abstract set", async () => {
      const [dataset, , builder] = await getLoadedDataset();
      patients = builder.matchSubject<PatientShape>(
        namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
      );
      const unmodifiedDataset = dataset.toString();
      patients.add({ "@id": "dontaddthisguy", type: { "@id": "Patient" } });
      expect(dataset.toString()).toBe(unmodifiedDataset);
      patients.delete({
        "@id": "http://example.com/Patient1",
        type: { "@id": "Patient" },
      });
      expect(dataset.toString()).toBe(unmodifiedDataset);
      patients.clear();
      expect(dataset.toString()).toBe(unmodifiedDataset);
    });
  });

  describe("matchObject", () => {
    let patients: LdSet<PatientShape>;
    let builder: JsonldDatasetProxyBuilder;
    let dataset: Dataset;

    beforeEach(async () => {
      const [recievedDataset, , receivedBuilder] = await getLoadedDataset();
      dataset = recievedDataset;
      builder = receivedBuilder;
      patients = builder.matchObject<PatientShape>(
        null,
        namedNode("http://hl7.org/fhir/roommate"),
        null,
      );
    });

    it("create a collection that matches the null, predicate, null pattern", async () => {
      expect(patients.toArray()[0].name?.toArray()[0]).toBe("Garrett");
      expect(patients.toArray()[1].name?.toArray()[0]).toBe("Amy");
      expect(patients.toArray()[2].name?.toArray()[0]).toBe("Rob");
    });

    it("cannot write to a collection that matches the null, predicate, null pattern", () => {
      patients.add({
        "@id": "http://example.com/Patient4",
        type: { "@id": "Patient" },
      });
      expect(dataset.match(namedNode("http://example.com/Patient4")).size).toBe(
        0,
      );
    });

    it("creates a collection that matches the subject, null, null pattern", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hodgePodge = builder.matchObject<any>(
        namedNode("http://example.com/Patient3"),
        null,
        null,
      );
      expect(hodgePodge.size).toBe(5);
      expect(hodgePodge.toArray()[0]["@id"]).toBe("Patient");
      expect(hodgePodge.toArray()[1]).toBe("Amy");
      expect(hodgePodge.toArray()[2]).toBe("1988-01-01");
      expect(hodgePodge.toArray()[3]).toBe(33);
      expect(hodgePodge.toArray()[4]).toBe(true);
    });

    it("can match object when the object is a literal.", () => {
      const allNames = builder.matchObject<string>(
        null,
        namedNode("http://hl7.org/fhir/name"),
        null,
      );
      expect(allNames.size).toBe(5);
      expect(allNames).toContain("Garrett");
      expect(allNames).toContain("Bobby");
      expect(allNames).toContain("Ferguson");
      expect(allNames).toContain("Rob");
      expect(allNames).toContain("Amy");
      expect(allNames.has("Bobby")).toBe(true);
      expect(allNames.has("WrongName")).toBe(false);
    });
  });

  describe("fromJson", () => {
    it("initializes a patient using the fromJSON method", async () => {
      const [, , builder] = await getEmptyPatientDataset();
      const patient = builder.fromJson<PatientShape>({
        type: { "@id": "Patient" },
        name: set("Jack", "Horner"),
        birthdate: "1725/11/03",
        age: 298,
        roommate: set({
          type: { "@id": "Patient" },
          name: set("Ethical", "Bug"),
        }),
      });
      expect(patient.name).toContain("Jack");
      expect(patient.name).toContain("Horner");
      expect(patient.birthdate).toBe("1725/11/03");
      expect(patient.age).toBe(298);
      expect(patient.roommate?.toArray()[0].name).toContain("Ethical");
      expect(patient.roommate?.toArray()[0].name).toContain("Bug");
    });

    it("initializes a patient using the fromJSON method with a named node", async () => {
      const [, , builder] = await getEmptyPatientDataset();
      const patient = builder.fromJson<PatientShape>({
        "@id": "http://example.com/Patient13",
        type: { "@id": "Patient" },
        name: set("Jack", "Horner"),
        birthdate: "1725/11/03",
        age: 298,
        roommate: set({
          type: { "@id": "Patient" },
          name: set("Ethical", "Bug"),
        }),
      });
      expect(patient["@id"]).toBe("http://example.com/Patient13");
      expect(patient.name).toContain("Jack");
      expect(patient.name).toContain("Horner");
      expect(patient.birthdate).toBe("1725/11/03");
      expect(patient.age).toBe(298);
      expect(patient.roommate?.toArray()[0].name).toContain("Ethical");
      expect(patient.roommate?.toArray()[0].name).toContain("Bug");
    });
  });

  describe("Graph Methods", () => {
    describe("builder", () => {
      it("sets write graph", async () => {
        const [dataset, , builder] = await getEmptyObservationDataset();
        const patient4 = builder
          .write(namedNode("http://example.com/Patient4Doc"))
          .fromSubject<PatientShape>(namedNode("https://example.com/Patient4"));
        patient4.type = { "@id": "Patient" };
        patient4.name = set("Jackson");
        expect(dataset.toString()).toBe(
          '<https://example.com/Patient4> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> <http://example.com/Patient4Doc> .\n<https://example.com/Patient4> <http://hl7.org/fhir/name> "Jackson" <http://example.com/Patient4Doc> .\n',
        );
      });
    });

    describe("graphOf", () => {
      it("detects the graph of a single value", async () => {
        const [, observation] = await getGraphLoadedDataset();
        expect(graphOf(observation, "subject").map((n) => n.value)).toContain(
          "http://example.com/Observation1Doc",
        );
        expect(
          graphOf(observation, "subject", observation.subject)[0].value,
        ).toBe("http://example.com/Observation1Doc");
        expect(
          graphOf(observation.subject as PatientShape, "age")[0].value,
        ).toBe("http://example.com/Patient1Doc");
      });

      it("detects the graph of an array value", async () => {
        const [, observation] = await getGraphLoadedDataset();
        const patient1 = observation.subject!;
        expect(
          graphOf(patient1, "name", "Garrett").map((n) => n.value),
        ).toContain("http://example.com/Patient1Doc");
        expect(
          graphOf(patient1, "roommate", {
            "@id": "http://example.com/Patient2",
          } as PatientShape).map((n) => n.value),
        ).toContain("http://example.com/Patient1Doc");
      });

      it("detects the graph of a value in multiple graphs", async () => {
        const [dataset, observation] = await getGraphLoadedDataset();
        dataset.add(
          quad(
            namedNode("http://example.com/Observation1"),
            namedNode("http://hl7.org/fhir/subject"),
            namedNode("http://example.com/Patient1"),
            namedNode("http://example.com/SomeOtherDoc"),
          ),
        );
        expect(graphOf(observation, "subject")[0].value).toBe(
          "http://example.com/Observation1Doc",
        );
        expect(graphOf(observation, "subject")[1].value).toBe(
          "http://example.com/SomeOtherDoc",
        );
      });
    });

    describe("write method", () => {
      it("changes the write graph", async () => {
        const [, observation] = await getGraphLoadedDataset();
        write(namedNode("http://example.com/SomeOtherDoc")).using(observation);
        observation.notes = "Cool Notes";
        expect(graphOf(observation, "notes")[0].value).toBe(
          "http://example.com/SomeOtherDoc",
        );
      });

      it("allows the write graph to be reset", async () => {
        const doc1 = namedNode("http://example.com/Doc1");
        const doc2 = namedNode("http://example.com/Doc2");
        const doc3 = namedNode("http://example.com/Doc3");

        const [, patient] = await getEmptyPatientDataset();
        patient.type = { "@id": "Patient" };
        patient.name?.add("default");
        const end1 = write(doc1).using(patient);
        patient.name?.add("1");
        const end2 = write(doc2).using(patient);
        patient.name?.add("2");
        const end3 = write(doc3).using(patient);
        patient.name?.add("3");
        end3();
        patient.name?.add("2 again");
        end2();
        patient.name?.add("1 again");
        end1();
        patient.name?.add("default again");

        expect(graphOf(patient, "name", "default")[0].value).toBe(
          defaultGraph().value,
        );
        expect(graphOf(patient, "name", "1")[0].value).toBe(doc1.value);
        expect(graphOf(patient, "name", "2")[0].value).toBe(doc2.value);
        expect(graphOf(patient, "name", "3")[0].value).toBe(doc3.value);
        expect(graphOf(patient, "name", "2 again")[0].value).toBe(doc2.value);
        expect(graphOf(patient, "name", "1 again")[0].value).toBe(doc1.value);
        expect(graphOf(patient, "name", "default again")[0].value).toBe(
          defaultGraph().value,
        );
      });

      it("copies the proxy and changes the write graphs without modifying the original", async () => {
        const doc1 = namedNode("http://example.com/Doc1");

        const [, patient] = await getEmptyPatientDataset();
        patient.type = { "@id": "Patient" };
        patient.name?.add("Default");
        const [patientOnDoc1] = write(doc1).usingCopy(patient);
        patientOnDoc1.name?.add("Doc1");
        expect(graphOf(patient, "name", "Default")[0].value).toBe(
          defaultGraph().value,
        );
        expect(graphOf(patient, "name", "Doc1")[0].value).toBe(doc1.value);
      });

      it("works with set proxies", async () => {
        const [, , builder] = await getTinyLoadedDataset();
        const allRoommates = builder.matchObject<PatientShape>(
          namedNode("http://example.com/Patient1"),
          namedNode("http://hl7.org/fhir/roommate"),
        );
        write(namedNode("http://example.com/SomeGraph")).using(allRoommates);
        const firstRoommate = allRoommates.toArray()[0];
        firstRoommate.age = 20;
        expect(graphOf(firstRoommate, "age")[0].value).toBe(
          "http://example.com/SomeGraph",
        );
      });
    });
  });

  describe("languageTag Support", () => {
    it("Retrieves the proper language given the languageOrdering", async () => {
      const [, , builder] = await getTinyLoadedDatasetWithLanguageTags();

      const observation = builder
        .setLanguagePreferences("fr", "en")
        .fromSubject<ObservationShape>(
          namedNode("http://example.com/Observation1"),
        );

      const patient = observation.subject as PatientShape;

      expect(observation.langNotes).toBe("Notes Sympas");
      expect(patient.langName?.toArray()[0]).toBe("Jean");

      setLanguagePreferences("ru", "zh").using(observation, patient);

      expect(observation.langNotes).toBeUndefined();
      expect(patient.langName?.size).toBe(0);

      setLanguagePreferences("@other", "fr").using(observation, patient);
      expect(observation.langNotes).not.toBe("Notes Sympas");
      expect(patient.langName?.toArray()[0]).not.toBe("Jean");

      setLanguagePreferences().using(observation, patient);
      expect(observation.langNotes).toBe(undefined);
      expect(patient.langName?.size).toBe(0);
    });

    it("sets language strings based on the default language", async () => {
      const [, , builder] = await getTinyLoadedDatasetWithLanguageTags();
      const observation = builder
        .setLanguagePreferences("fr", "en")
        .fromSubject<ObservationShape>(
          namedNode("http://example.com/Observation1"),
        );
      observation.langNotes = "quelques notes";
      expect(languagesOf(observation, "langNotes")).toEqual({
        fr: "quelques notes",
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "Notas Geniales",
      });
      const patient = observation.subject as PatientShape;
      patient.langName?.add("Luc");
      expect(languagesOf(patient, "langName").fr?.has("Jean")).toBe(true);
      expect(languagesOf(patient, "langName").fr?.has("Luc")).toBe(true);
      expect(languagesOf(patient, "langName")["@none"]?.has("Jon")).toBe(true);
      expect(languagesOf(patient, "langName").en?.has("John")).toBe(true);
      expect(languagesOf(patient, "langName").es?.has("Juan")).toBe(true);

      // Skips other in favor of setting the next language
      setLanguagePreferences("@other", "es").using(observation, patient);
      observation.langNotes = "algunas notas";
      expect(languagesOf(observation, "langNotes")).toEqual({
        fr: "quelques notes",
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "algunas notas",
      });

      // Does not set a language if only other
      setLanguagePreferences("@other").using(observation, patient);
      observation.langNotes = "Some Notes that will never be written";
      expect(languagesOf(observation, "langNotes")).toEqual({
        fr: "quelques notes",
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "algunas notas",
      });

      // Does not set a language if empty
      setLanguagePreferences().using(observation, patient);
      observation.langNotes = "Some Notes that will never be written";
      expect(languagesOf(observation, "langNotes")).toEqual({
        fr: "quelques notes",
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "algunas notas",
      });

      // Sets @none
      setLanguagePreferences("@none").using(observation, patient);
      observation.langNotes = "Other notes";
      expect(languagesOf(observation, "langNotes")).toEqual({
        fr: "quelques notes",
        "@none": "Other notes",
        en: "Cooler Notes",
        es: "algunas notas",
      });
    });

    it("uses languageOf to make a languageMap", async () => {
      const [, observation] = await getTinyLoadedDatasetWithLanguageTags();
      const languageMap = languagesOf(observation, "langNotes");
      expect(languageMap).toEqual({
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "Notas Geniales",
        fr: "Notes Sympas",
      });
    });

    it("uses languageOf to set values on a languageMap", async () => {
      const [dataset, observation] =
        await getTinyLoadedDatasetWithLanguageTags();
      const languageMap = languagesOf(observation, "langNotes");
      languageMap.zh = "很酷的笔记";
      languageMap.fr = "notes plus fraîches";
      expect(languageMap).toEqual({
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "Notas Geniales",
        fr: "notes plus fraîches",
        zh: "很酷的笔记",
      });
      const langNoteQuads = dataset.match(
        namedNode("http://example.com/Observation1"),
        namedNode("http://hl7.org/fhir/langNotes"),
      );
      expect(langNoteQuads.size).toBe(5);
      expect(
        langNoteQuads.some(
          (quad) =>
            quad.object.termType === "Literal" &&
            quad.object.language === "fr" &&
            quad.object.value === "notes plus fraîches",
        ),
      ).toBe(true);
      expect(
        langNoteQuads.some(
          (quad) =>
            quad.object.termType === "Literal" &&
            quad.object.language === "zh" &&
            quad.object.value === "很酷的笔记",
        ),
      ).toBe(true);
    });

    it("uses languageOf to delete values on a languageMap", async () => {
      const [dataset, observation] =
        await getTinyLoadedDatasetWithLanguageTags();
      const languageMap = languagesOf(observation, "langNotes");
      delete languageMap.fr;
      expect(languageMap).toEqual({
        "@none": "Cool Notes",
        en: "Cooler Notes",
        es: "Notas Geniales",
      });
      const langNoteQuads = dataset.match(
        namedNode("http://example.com/Observation1"),
        namedNode("http://hl7.org/fhir/langNotes"),
      );
      expect(langNoteQuads.size).toBe(3);
      expect(
        langNoteQuads.every(
          (quad) =>
            !(
              quad.object.termType === "Literal" &&
              quad.object.language === "fr"
            ),
        ),
      ).toBe(true);
    });

    it("executes the methods of the LanguageSet", async () => {
      const [dataset, observation] =
        await getTinyLoadedDatasetWithLanguageTags();

      const subject = namedNode("http://example.com/Patient1");
      const predicate = namedNode("http://hl7.org/fhir/langName");

      const patient = observation.subject as PatientShape;

      const enSet = languagesOf(patient, "langName").en as LanguageSet;

      expect(enSet.size).toBe(1);

      enSet.add("Doe");
      expect(enSet.size).toBe(2);
      expect(enSet.has("Doe")).toBe(true);
      expect(dataset.has(quad(subject, predicate, literal("Doe", "en")))).toBe(
        true,
      );

      const callbackMock = jest.fn();
      enSet.forEach(callbackMock);
      expect(callbackMock).toHaveBeenCalledTimes(2);
      expect(callbackMock).toHaveBeenCalledWith("John", "John", enSet);

      const entries = enSet.entries();
      const entriesVal1 = entries.next();
      const entriesVal2 = entries.next();
      const entriesVal3 = entries.next();
      expect(entriesVal1.value).toEqual(["John", "John"]);
      expect(entriesVal2.value).toEqual(["Doe", "Doe"]);
      expect(entriesVal3.done).toBe(true);

      const keys = enSet.keys();
      const keysVal1 = keys.next();
      const keysVal2 = keys.next();
      const keysVal3 = keys.next();
      expect(keysVal1.value).toBe("John");
      expect(keysVal2.value).toBe("Doe");
      expect(keysVal3.done).toBe(true);

      const values = enSet.values();
      const valuesVal1 = values.next();
      const valuesVal2 = values.next();
      const valuesVal3 = values.next();
      expect(valuesVal1.value).toBe("John");
      expect(valuesVal2.value).toBe("Doe");
      expect(valuesVal3.done).toBe(true);

      enSet.delete("John");
      expect(enSet.size).toBe(1);
      expect(enSet.has("John")).toBe(false);
      expect(dataset.has(quad(subject, predicate, literal("John", "en")))).toBe(
        false,
      );

      enSet.clear();
      expect(enSet.size).toBe(0);
    });
  });
};

describe(
  "jsonldDatasetProxy - unnested context",
  testJsonldDatasetProxy(patientUnnestedContext),
);

describe(
  "jsonldDatasetProxy - nested context",
  testJsonldDatasetProxy(patientNestedContext),
);
