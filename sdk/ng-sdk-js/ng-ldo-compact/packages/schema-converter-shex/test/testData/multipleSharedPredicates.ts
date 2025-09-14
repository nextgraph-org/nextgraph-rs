import type { TestData } from "./testData.js";

/**
 * MULTIPLE CONSTRAINTS
 */
export const multipleSharedPredicates: TestData = {
  name: "multipleSharedPredicates",
  shexc: `
  PREFIX ex: <https://example.com/>

  ex:MediaContainerShape {
    a [ ex:Media ];
    a [ ex:Video ];
    ex:something [ ex:OtherThing ];
    ex:something [ ex:Thing3 ];
  }
  `,
  sampleTurtle: "",
  baseNode: "",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    Media: {
      "@id": "https://example.com/Media",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        something: {
          "@id": "https://example.com/something",
          "@isCollection": true,
        },
      },
    },
    Video: {
      "@id": "https://example.com/Video",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
        something: {
          "@id": "https://example.com/something",
          "@isCollection": true,
        },
      },
    },
    something: {
      "@id": "https://example.com/something",
      "@isCollection": true,
    },
    OtherThing: "https://example.com/OtherThing",
    Thing3: "https://example.com/Thing3",
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface MediaContainer {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Media";\n    } | {\n        "@id": "Video";\n    }>;\n    something: LdSet<{\n        "@id": "OtherThing";\n    } | {\n        "@id": "Thing3";\n    }>;\n}\n\n',
};
