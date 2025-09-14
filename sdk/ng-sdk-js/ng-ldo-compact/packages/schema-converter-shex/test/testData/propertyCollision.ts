import type { TestData } from "./testData.js";

export const propertyCollision: TestData = {
  name: "property collision",
  shexc: `
  PREFIX ex: <http://ex/>
  PREFIX ex2: <http://ex2/>
  PREFIX foaf: <http://xmlns.com/foaf/0.1/>
  PREFIX v1: <http://example.com/v1#>
  PREFIX ver: <http://api.example.com/v2.1:>
  ex:C { ex:label . ; ex2:label . ; foaf:label . ; v1:label . ; ver:label . }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/c1",
  successfulContext: {} as any,
  successfulTypings: "",
  successfulCompactTypings: `export type IRI = string;

export interface C {
    id: IRI;
    /**
     * Original IRI: http://ex/label
     */
    ex_label: any;
    /**
     * Original IRI: http://ex2/label
     */
    ex2_label: any;
    /**
     * Original IRI: http://xmlns.com/foaf/0.1/label
     */
    "0.1_label": any;
    /**
     * Original IRI: http://example.com/v1#label
     */
    v1_label: any;
    /**
     * Original IRI: http://api.example.com/v2.1:label
     */
    "v2.1_label": any;
}
`,
};
