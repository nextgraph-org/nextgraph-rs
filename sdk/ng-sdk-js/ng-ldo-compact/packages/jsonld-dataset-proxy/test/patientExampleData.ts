import type { ContextDefinition } from "jsonld";
import type { Schema } from "shexj";
import type { LdoJsonldContext } from "../src/LdoJsonldContext.js";
import type { LdSet } from "../src/index.js";

export interface ObservationShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: { "@id": "Observation" };
  subject?: PatientShape;
  notes?: string;
  langNotes?: string;
}

export type PatientShape = {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: { "@id": "Patient" };
  name?: LdSet<string>;
  langName?: LdSet<string>;
  birthdate?: string;
  age?: number;
  isHappy?: boolean;
  roommate?: LdSet<PatientShape>;
};

// No need to fully define the schema because this library doesn't use it
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export const patientSchema: Schema = {};

export const patientUnnestedContext: ContextDefinition = {
  type: {
    "@id": "@type",
  },
  Patient: "http://hl7.org/fhir/Patient",
  Observation: "http://hl7.org/fhir/Observation",
  subject: { "@id": "http://hl7.org/fhir/subject", "@type": "@id" },
  name: {
    "@id": "http://hl7.org/fhir/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
    "@container": "@set",
  },
  langName: {
    "@id": "http://hl7.org/fhir/langName",
    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
    "@container": "@set",
  },
  birthdate: {
    "@id": "http://hl7.org/fhir/birthdate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  age: {
    "@id": "http://hl7.org/fhir/age",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  isHappy: {
    "@id": "http://hl7.org/fhir/isHappy",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  roommate: {
    "@id": "http://hl7.org/fhir/roommate",
    "@type": "@id",
    "@container": "@set",
  },
  notes: {
    "@id": "http://hl7.org/fhir/notes",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  langNotes: {
    "@id": "http://hl7.org/fhir/langNotes",
    "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
  },
};

export const patientNestedContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
  },
  Observation: {
    "@id": "http://hl7.org/fhir/Observation",
    "@context": {
      notes: {
        "@id": "http://hl7.org/fhir/notes",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      langNotes: {
        "@id": "http://hl7.org/fhir/langNotes",
        "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
      },
      subject: { "@id": "http://hl7.org/fhir/subject", "@type": "@id" },
    },
  },
  Patient: {
    "@id": "http://hl7.org/fhir/Patient",
    "@context": {
      name: {
        "@id": "http://hl7.org/fhir/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
        "@isCollection": true,
      },
      langName: {
        "@id": "http://hl7.org/fhir/langName",
        "@type": "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString",
        "@isCollection": true,
      },
      birthdate: {
        "@id": "http://hl7.org/fhir/birthdate",
        "@type": "http://www.w3.org/2001/XMLSchema#date",
      },
      age: {
        "@id": "http://hl7.org/fhir/age",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
      isHappy: {
        "@id": "http://hl7.org/fhir/isHappy",
        "@type": "http://www.w3.org/2001/XMLSchema#boolean",
      },
      roommate: {
        "@id": "http://hl7.org/fhir/roommate",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
};

export const patientData = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

example:Observation1 a fhir:Observation ;
  fhir:notes "Cool Notes"^^xsd:string ;
  fhir:subject example:Patient1 .

example:Patient1 a fhir:Patient ;
  rdf:type fhir:Patient ; 
  fhir:name "Garrett"^^xsd:string,  "Bobby"^^xsd:string, "Ferguson"^^xsd:string ;
  fhir:birthdate "1986-01-01"^^xsd:date ;
  fhir:age "35"^^xsd:integer ;
  fhir:isHappy "true"^^xsd:boolean ;
  fhir:roommate example:Patient2, example:Patient3 .

example:Patient2 a fhir:Patient ;
  rdf:type fhir:Patient ; 
  fhir:name "Rob"^^xsd:string ;
  fhir:birthdate "1987-01-01"^^xsd:date ;
  fhir:age "34"^^xsd:integer ;
  fhir:isHappy "false"^^xsd:boolean ;
  fhir:roommate example:Patient1, example:Patient3 .

example:Patient3 a fhir:Patient ;
  rdf:type fhir:Patient ; 
  fhir:name "Amy"^^xsd:string ;
  fhir:birthdate "1988-01-01"^^xsd:date ;
  fhir:age "33"^^xsd:integer ;
  fhir:isHappy "true"^^xsd:boolean .
`;

export const patientDataWithBlankNodes = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

example:Observation1 a fhir:Observation ;
  fhir:notes "Cool Notes"^^xsd:string ;
  fhir:subject _:Patient1 .

_:Patient1 a fhir:Patient ;
  fhir:name "Garrett"^^xsd:string,  "Bobby"^^xsd:string, "Ferguson"^^xsd:string ;
  fhir:birthdate "1986-01-01"^^xsd:date ;
  fhir:age "35"^^xsd:integer ;
  fhir:isHappy "true"^^xsd:boolean ;
  fhir:roommate _:Patient2, _:Patient3 .

_:Patient2 a fhir:Patient ;
  fhir:name "Rob"^^xsd:string ;
  fhir:birthdate "1987-01-01"^^xsd:date ;
  fhir:age "34"^^xsd:integer ;
  fhir:isHappy "false"^^xsd:boolean ;
  fhir:roommate _:Patient1, _:Patient3 .

_:Patient3 a fhir:Patient ;
  fhir:name "Amy"^^xsd:string ;
  fhir:birthdate "1988-01-01"^^xsd:date ;
  fhir:age "33"^^xsd:integer ;
  fhir:isHappy "true"^^xsd:boolean .
`;

export const tinyPatientData = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

example:Observation1 a fhir:Observation ;
  fhir:subject example:Patient1 .

example:Patient1 a fhir:Patient ;
  fhir:name "Garrett"^^xsd:string ;
  fhir:roommate example:Patient2 .

example:Patient2 a fhir:Patient ;
  fhir:name "Rob"^^xsd:string ;
  fhir:roommate example:Patient1 .
`;

export const tinyArrayPatientData = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

example:Patient1 a fhir:Patient ;
  fhir:name "Garrett"^^xsd:string,  "Bobby"^^xsd:string, "Ferguson"^^xsd:string .
`;

export const tinyPatientDataWithBlankNodes = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

example:Observation1 a fhir:Observation ;
  fhir:subject _:Patient1 .

_:Patient1 a fhir:Patient ;
  fhir:name "Garrett"^^xsd:string ;
  fhir:roommate _:Patient2 .

_:Patient2 a fhir:Patient ;
  fhir:name "Rob"^^xsd:string ;
  fhir:roommate _:Patient1 .
`;

export const tinyPatientDataWithLanguageTags = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

example:Observation1 a fhir:Observation ;
  fhir:subject example:Patient1 ;
  fhir:langNotes "Cool Notes" ;
  fhir:langNotes "Cooler Notes"@en ;
  fhir:langNotes "Notas Geniales"@es ;
  fhir:langNotes "Notes Sympas"@fr .

example:Patient1 a fhir:Patient ;
  fhir:langName "Jon" ;
  fhir:langName "John"@en ;
  fhir:langName "Juan"@es ;
  fhir:langName "Jean"@fr .
`;
