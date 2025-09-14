import type { TestData } from "./testData.js";

/**
 * EACH OF AND SIMPLE
 */
export const eachOfAndSimple: TestData = {
  name: "eachOfAndSimple",
  shexc: `
  PREFIX ex: <https://example.com/>

  ex:MediaContainerShape {
    a [ ex:MediaContainer ];
  }

  ex:VideoShape {
    a [ ex:Video ];
  }

  ex:ImageShape {
    a [ ex:Image ];
  }
  `,
  sampleTurtle: "",
  baseNode: "",
  successfulContext: {
    type: {
      "@id": "@type",
      "@isCollection": true,
    },
    MediaContainer: {
      "@id": "https://example.com/MediaContainer",
      "@context": {
        type: {
          "@id": "@type",
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
      },
    },
    Image: {
      "@id": "https://example.com/Image",
      "@context": {
        type: {
          "@id": "@type",
          "@isCollection": true,
        },
      },
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface MediaContainer {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "MediaContainer";\n    }>;\n}\n\nexport interface Video {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Video";\n    }>;\n}\n\nexport interface Image {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Image";\n    }>;\n}\n\n',
};
