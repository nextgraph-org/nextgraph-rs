import type { TestData } from "./testData.js";

/**
 * Reused Predicate
 */
export const reusedPredicates: TestData = {
  name: "reused predicates",
  shexc: `
  PREFIX app:   <https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#>
  PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>

  app:DocumentShape {
    rdf:type [ app:Document ] ;
    app:vocabulary @app:VocabularyShape* ;
    app:law @app:LawShape ;
  }

  app:LawShape {
    rdf:type [ app:Law ] ;
    app:name xsd:string *;
    app:path IRI ;
  }

  app:VocabularyShape {
    rdf:type [ app:Vocabulary ] ;
    app:name xsd:string ;
    app:path IRI *;
  }
  `,
  sampleTurtle: ``,
  baseNode: "http://example.com/SampleParent",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Document: {
      "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Document",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        vocabulary: {
          "@id":
            "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#vocabulary",
          "@type": "@id",
          "@isCollection": true,
        },
        law: {
          "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#law",
          "@type": "@id",
        },
      },
    },
    vocabulary: {
      "@id":
        "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#vocabulary",
      "@type": "@id",
      "@isCollection": true,
    },
    Vocabulary: {
      "@id":
        "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Vocabulary",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
        },
        path: {
          "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#path",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    name: {
      "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#name",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    path: {
      "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#path",
      "@type": "@id",
      "@isCollection": true,
    },
    law: {
      "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#law",
      "@type": "@id",
    },
    Law: {
      "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Law",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        name: {
          "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#name",
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@isCollection": true,
        },
        path: {
          "@id": "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#path",
          "@type": "@id",
        },
      },
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface Document {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Document";\n    }>;\n    vocabulary?: LdSet<Vocabulary>;\n    law: Law;\n}\n\nexport interface Law {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Law";\n    }>;\n    name?: LdSet<string>;\n    path: {\n        "@id": string;\n    };\n}\n\nexport interface Vocabulary {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Vocabulary";\n    }>;\n    name: string;\n    path?: LdSet<{\n        "@id": string;\n    }>;\n}\n\n',
  successfulCompactTypings: `export type IRI = string;\n\nexport interface Document {\n    id: IRI;\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Document";\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#vocabulary\n     */\n    vocabulary?: Record<IRI, Vocabulary>;\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#law\n     */\n    law: Law;\n}\n\nexport interface Law {\n    id: IRI;\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Law";\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#name\n     */\n    name?: Set<string>;\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#path\n     */\n    path: IRI;\n}\n\nexport interface Vocabulary {\n    id: IRI;\n    /**\n     * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type\n     */\n    type: "https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#Vocabulary";\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#name\n     */\n    name: string;\n    /**\n     * Original IRI: https://www.forsakringskassan.se/vocabs/fk-sem-poc.ttl#path\n     */\n    path?: Set<IRI>;\n}\n\n`,
};
