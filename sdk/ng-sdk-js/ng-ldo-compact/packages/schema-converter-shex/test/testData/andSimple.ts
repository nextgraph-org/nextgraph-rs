import type { TestData } from "./testData.js";

/**
 * AND SIMPLE
 */
export const andSimple: TestData = {
  name: "andSimple",
  shexc: `
  PREFIX ex: <https://example.com/>

  ex:MediaContainerShape {
    a [ ex:MediaContainer ];
    ex:videoImage (@ex:VideoShape AND @ex:ImageShape) ;
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
        videoImage: {
          "@id": "https://example.com/videoImage",
          "@type": "@id",
        },
      },
    },
    videoImage: {
      "@id": "https://example.com/videoImage",
      "@type": "@id",
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
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface MediaContainer {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "MediaContainer";\n    }>;\n    videoImage: Video & Image;\n}\n\nexport interface Video {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Video";\n    }>;\n}\n\nexport interface Image {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Image";\n    }>;\n}\n\n',
};
