import type { TestData } from "./testData.js";

export const pluralUnionObjects: TestData = {
  name: "plural union objects",
  shexc: `
  PREFIX ex: <http://ex/>
  ex:A { ex:items ( @ex:Foo OR @ex:Bar )* }
  ex:Foo { ex:f . }
  ex:Bar { ex:b . }
  `,
  sampleTurtle: ``,
  baseNode: "http://ex/a1",
  successfulContext: {} as any,
  successfulTypings: "",
  successfulCompactTypings: `export type IRI = string;\n\nexport interface A {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/items\n     */\n    items?: Record<IRI, Foo | Bar>;\n}\n\nexport interface Foo {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/f\n     */\n    f: any;\n}\n\nexport interface Bar {\n    id: IRI;\n    /**\n     * Original IRI: http://ex/b\n     */\n    b: any;\n}\n\n`,
};
