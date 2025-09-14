import type { TestData } from "./testData.js";

/**
 * SIMPLE
 */
export const simple: TestData = {
  name: "simple",
  shexc: `
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  PREFIX ns: <https://ns.example/>
  PREFIX example: <https://example.com/>

  example:EmployeeShape {                # An <EmployeeShape> has:
    foaf:givenName  xsd:string+,   # at least one givenName.
    foaf:familyName xsd:string,    # one familyName.
    foaf:phone      IRI*,          # any number of phone numbers.
    foaf:mbox       IRI,           # one FOAF mbox.
    ns:someDouble   xsd:double     # just to test the data type.
  }
  `,
  sampleTurtle: `
    @prefix foaf: <http://xmlns.com/foaf/0.1/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
    <http://a.example/Employee7>
      foaf:givenName  "Robert"^^xsd:string, "Taylor"^^xsd:string ;
      foaf:familyName "Johnson"^^xsd:string ;
      # no phone number needed
      foaf:mbox       <mailto:rtj@example.com> ;
      ns:someDouble "1e4"^^xsd:double ;
      .
  `,
  baseNode: "http://a.example/Employee7",
  successfulContext: {
    givenName: {
      "@id": "http://xmlns.com/foaf/0.1/givenName",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
      "@isCollection": true,
    },
    familyName: {
      "@id": "http://xmlns.com/foaf/0.1/familyName",
      "@type": "http://www.w3.org/2001/XMLSchema#string",
    },
    phone: {
      "@id": "http://xmlns.com/foaf/0.1/phone",
      "@type": "@id",
      "@isCollection": true,
    },
    mbox: {
      "@id": "http://xmlns.com/foaf/0.1/mbox",
      "@type": "@id",
    },
    someDouble: {
      "@id": "https://ns.example/someDouble",
      "@type": "http://www.w3.org/2001/XMLSchema#double",
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface Employee {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    givenName: LdSet<string>;\n    familyName: string;\n    phone?: LdSet<{\n        "@id": string;\n    }>;\n    mbox: {\n        "@id": string;\n    };\n    someDouble: number;\n}\n\n',
  successfulCompactTypings: `export type IRI = string;\n\nexport interface Employee {\n    id: IRI;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/givenName\n     */\n    givenName: Set<string>;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/familyName\n     */\n    familyName: string;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/phone\n     */\n    phone?: Set<IRI>;\n    /**\n     * Original IRI: http://xmlns.com/foaf/0.1/mbox\n     */\n    mbox: IRI;\n    /**\n     * Original IRI: https://ns.example/someDouble\n     */\n    someDouble: number;\n}\n\n`,
};
