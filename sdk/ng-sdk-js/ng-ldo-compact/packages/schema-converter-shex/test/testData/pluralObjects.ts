import type { TestData } from "./testData.js";

export const pluralObjects: TestData = {
  name: "plural objects",
  shexc: `
  PREFIX ex: <http://ex/>
  ex:FooShape { ex:bars @ex:BarShape* }
  ex:BarShape { ex:name . }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/foo1",
  successfulContext: {},
  successfulTypings: "", // not used in this test context
  successfulCompactTypings: `export type IRI = string;\n\nexport interface Foo {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/bars\n     */\n    bars?: Record<IRI, Bar>;\n}\n\nexport interface Bar {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/name\n     */\n    name: any;\n}\n\n`,
};
