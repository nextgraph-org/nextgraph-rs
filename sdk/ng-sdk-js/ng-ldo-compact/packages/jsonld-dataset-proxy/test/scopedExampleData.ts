import type { ContextDefinition } from "jsonld";
import type { LdoJsonldContext } from "../src/LdoJsonldContext.js";

export interface Bender {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: "Bender";
  name: string;
  element: Element;
  friend: (Bender | NonBender | Avatar)[];
}

export interface Avatar {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: "Avatar";
  name: string;
  element: Element[];
  friend: (Bender | NonBender | Avatar)[];
}

export interface NonBender {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: "Avatar";
  name: string;
  friend: (Bender | NonBender | Avatar)[];
}

export type Element =
  | {
      "@id": "VideoObject";
    }
  | {
      "@id": "ImageObject";
    }
  | {
      "@id": "MediaObject";
    }
  | {
      "@id": "CreativeWork";
    };

export const scopedContext: LdoJsonldContext = {
  Bender: {
    "@id": "http://example.com/Bender",
    "@context": {
      type: {
        "@id": "@type",
      },
      name: {
        "@id": "http://example.com/name",
      },
      element: {
        "@id": "http://example.com/element",
      },
      friend: {
        "@id": "http://example.com/friend",
        "@isCollection": true,
      },
    },
  },
  Avatar: {
    "@id": "http://example.com/Avatar",
    "@context": {
      type: {
        "@id": "@type",
      },
      name: {
        "@id": "http://example.com/name",
      },
      element: {
        "@id": "http://example.com/element",
        "@isCollection": true,
      },
      friend: {
        "@id": "http://example.com/friend",
        "@isCollection": true,
      },
    },
  },
  NonBender: {
    "@id": "http://example.com/NonBender",
    "@context": {
      type: {
        "@id": "@type",
      },
      name: {
        "@id": "http://example.com/name",
      },
      friend: {
        "@id": "http://example.com/friend",
        "@isCollection": true,
      },
    },
  },
};

export const scopedData = `
@prefix example: <http://example.com/> .
@prefix fhir: <http://hl7.org/fhir/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

example:Aang a example:Avatar ;
  example:name "Aang" ;
  example:element example:Air, example:Water ;
  example:friend example:Sokka, example:Katara .

example:Katara a example:Bender ;
  example:name "Katara" ;
  example:element example:Water ;
  example:friend example:Sokka, example:Aang .

example:Sokka a example:NonBender ;
  example:name "Sokka" ;
  example:element example:Water ;
  example:friend example:Sokka, example:Aang .
`;
