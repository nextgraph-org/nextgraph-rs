import type { TestData } from "./testData.js";

/**
 * OR SIMPLE
 */
export const orSimple: TestData = {
  name: "orSimple",
  shexc: `
  PREFIX ex: <https://example.com/>

  ex:MediaContainerShape {
    a [ ex:MediaContainer ];
    ex:primaryMedia (@ex:VideoShape OR @ex:ImageShape) ;
    ex:media (@ex:VideoShape OR @ex:ImageShape) * ;
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
        primaryMedia: {
          "@id": "https://example.com/primaryMedia",
          "@type": "@id",
        },
        media: {
          "@id": "https://example.com/media",
          "@type": "@id",
          "@isCollection": true,
        },
      },
    },
    primaryMedia: {
      "@id": "https://example.com/primaryMedia",
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
    media: {
      "@id": "https://example.com/media",
      "@type": "@id",
      "@isCollection": true,
    },
  },
  successfulTypings:
    'import { LdSet, LdoJsonldContext } from "@ldo/ldo"\n\nexport interface MediaContainer {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "MediaContainer";\n    }>;\n    primaryMedia: Video | Image;\n    media?: LdSet<Video | Image>;\n}\n\nexport interface Video {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Video";\n    }>;\n}\n\nexport interface Image {\n    "@id"?: string;\n    "@context"?: LdoJsonldContext;\n    type: LdSet<{\n        "@id": "Image";\n    }>;\n}\n\n',
};
