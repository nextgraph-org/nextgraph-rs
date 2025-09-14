import type { TestData } from "./testData.js";

export const mixedPluralUnionError: TestData = {
  name: "mixed plural union error",
  shexc: `
  PREFIX ex: <http://ex/>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  ex:FooShape { ex:mixed ( @ex:BarShape OR @ex:BazShape )* }
  ex:BarShape { ex:label . }
  ex:BazShape { ex:other . }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/foo2",
  successfulContext: {},
  successfulTypings: "",
  successfulCompactTypings: `export type IRI = string;\n\nexport interface Foo {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/mixed\n     */\n    mixed?: Record<IRI, Bar | Baz>;\n}\n\nexport interface Bar {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/label\n     */\n    label: any;\n}\n\nexport interface Baz {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/other\n     */\n    other: any;\n}\n\n`,
};
