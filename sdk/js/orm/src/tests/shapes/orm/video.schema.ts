import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * videoSchema: Schema for video
 * =============================================================================
 */
export const videoSchema: Schema = {
  "did:ng:z:MiruVideoDocumentShape": {
    iri: "did:ng:z:MiruVideoDocumentShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruVideoDocument"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:name",
        readablePredicate: "name",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:z:description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:createdAt",
        readablePredicate: "createdAt",
      },
      {
        dataTypes: [
          {
            iri: "did:ng:z:MiruMediaAssetShape",
            predicates: [
              {
                dataTypes: [
                  {
                    valType: "iri",
                    literals: ["did:ng:z:MiruMediaAsset"],
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "@type",
                extra: true,
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:id",
                readablePredicate: "id",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                    literals: ["asset:media:av"],
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:type",
                readablePredicate: "type",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:name",
                readablePredicate: "name",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:mimeType",
                readablePredicate: "mimeType",
              },
              {
                dataTypes: [
                  {
                    valType: "number",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:duration",
                readablePredicate: "duration",
              },
              {
                dataTypes: [
                  {
                    valType: "number",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:size",
                readablePredicate: "size",
              },
              {
                dataTypes: [
                  {
                    valType: "shape",
                    shape: "did:ng:z:MiruMediaAssetShape||did:ng:z:audio",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 0,
                iri: "did:ng:z:audio",
                readablePredicate: "audio",
              },
              {
                dataTypes: [
                  {
                    valType: "shape",
                    shape: "did:ng:z:MiruMediaAssetShape||did:ng:z:video",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 0,
                iri: "did:ng:z:video",
                readablePredicate: "video",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                  {
                    valType: "iri",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:uri",
                readablePredicate: "uri",
              },
            ],
          },
          {
            iri: "did:ng:z:MiruVideoEffectAssetShape",
            predicates: [
              {
                dataTypes: [
                  {
                    valType: "iri",
                    literals: ["did:ng:z:MiruVideoEffectAsset"],
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "@type",
                extra: true,
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:id",
                readablePredicate: "id",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                    literals: ["asset:effect:video"],
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:type",
                readablePredicate: "type",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:name",
                readablePredicate: "name",
              },
              {
                dataTypes: [
                  {
                    valType: "string",
                  },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "did:ng:z:ops",
                readablePredicate: "ops",
              },
            ],
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:z:assets",
        readablePredicate: "assets",
      },
    ],
  },
  "did:ng:z:MiruVideoEffectAssetShape": {
    iri: "did:ng:z:MiruVideoEffectAssetShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruVideoEffectAsset"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:id",
        readablePredicate: "id",
      },
      {
        dataTypes: [
          {
            valType: "string",
            literals: ["asset:effect:video"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:name",
        readablePredicate: "name",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:ops",
        readablePredicate: "ops",
      },
    ],
  },
  "did:ng:z:MiruMediaAssetShape": {
    iri: "did:ng:z:MiruMediaAssetShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruMediaAsset"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:id",
        readablePredicate: "id",
      },
      {
        dataTypes: [
          {
            valType: "string",
            literals: ["asset:media:av"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:name",
        readablePredicate: "name",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:mimeType",
        readablePredicate: "mimeType",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:duration",
        readablePredicate: "duration",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:size",
        readablePredicate: "size",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:MiruMediaAssetShape||did:ng:z:audio",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:z:audio",
        readablePredicate: "audio",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:z:MiruMediaAssetShape||did:ng:z:video",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:z:video",
        readablePredicate: "video",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:uri",
        readablePredicate: "uri",
      },
    ],
  },
  "did:ng:z:MiruMediaAssetShape||did:ng:z:audio": {
    iri: "did:ng:z:MiruMediaAssetShape||did:ng:z:audio",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruMediaAssetAudio"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:codec",
        readablePredicate: "codec",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:duration",
        readablePredicate: "duration",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:numberOfChannels",
        readablePredicate: "numberOfChannels",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:sampleRate",
        readablePredicate: "sampleRate",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:firstTimestamp",
        readablePredicate: "firstTimestamp",
      },
    ],
  },
  "did:ng:z:MiruMediaAssetShape||did:ng:z:video": {
    iri: "did:ng:z:MiruMediaAssetShape||did:ng:z:video",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruMediaAssetVideo"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:codec",
        readablePredicate: "codec",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:duration",
        readablePredicate: "duration",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:rotation",
        readablePredicate: "rotation",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:width",
        readablePredicate: "width",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:height",
        readablePredicate: "height",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:frameRate",
        readablePredicate: "frameRate",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:firstTimestamp",
        readablePredicate: "firstTimestamp",
      },
    ],
  },
  "did:ng:z:MiruMediaAssetAudioShape": {
    iri: "did:ng:z:MiruMediaAssetAudioShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruMediaAssetAudio"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:codec",
        readablePredicate: "codec",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:duration",
        readablePredicate: "duration",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:numberOfChannels",
        readablePredicate: "numberOfChannels",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:sampleRate",
        readablePredicate: "sampleRate",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:firstTimestamp",
        readablePredicate: "firstTimestamp",
      },
    ],
  },
  "did:ng:z:MiruMediaAssetVideoShape": {
    iri: "did:ng:z:MiruMediaAssetVideoShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:MiruMediaAssetVideo"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:codec",
        readablePredicate: "codec",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:duration",
        readablePredicate: "duration",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:rotation",
        readablePredicate: "rotation",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:width",
        readablePredicate: "width",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:height",
        readablePredicate: "height",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:frameRate",
        readablePredicate: "frameRate",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:firstTimestamp",
        readablePredicate: "firstTimestamp",
      },
    ],
  },
};
