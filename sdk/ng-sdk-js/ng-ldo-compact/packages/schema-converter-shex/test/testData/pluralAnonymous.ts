import type { TestData } from "./testData.js";

export const pluralAnonymous: TestData = {
  name: "plural anonymous",
  shexc: `
  PREFIX ex: <http://ex.org/>
  ex:ConfigHolderShape { ex:configs { ex:key . ; ex:val . }* }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/cfg1",
  successfulContext: {},
  successfulTypings: "",
  successfulCompactTypings: `export type IRI = string;

export interface ConfigHolder {
  id: IRI;
  /**
   * Original IRI: http://ex.org/configs
   */
  configs?: Record<IRI, {
    id: IRI;
    /**
     * Original IRI: http://ex.org/key
     */
    key: any;
    /**
     * Original IRI: http://ex.org/val
     */
    val: any;
  }>;
}
`,
};
