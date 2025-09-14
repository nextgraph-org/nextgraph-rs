import type { TestData } from "./testData.js";

export const singleAnonymous: TestData = {
  name: "single anonymous",
  shexc: `
  PREFIX ex: <http://ex/>
  ex:ConfigHolderShape { ex:config { ex:key . ; ex:val . } }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/cfg1",
  successfulContext: {},
  successfulTypings: "",
  successfulCompactTypings: `export type IRI = string;

export interface ConfigHolder {
  id: IRI;
  /**
   * Original IRI: http://ex/config
   */
  config: {
    id: IRI;
    /**
     * Original IRI: http://ex/key
     */
    key: any;
    /**
     * Original IRI: http://ex/val
     */
    val: any;
  };
}
`,
};
