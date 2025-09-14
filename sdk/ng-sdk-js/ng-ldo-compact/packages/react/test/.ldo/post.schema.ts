import { Schema } from "shexj";

/**
 * =============================================================================
 * postSchema: ShexJ Schema for post
 * =============================================================================
 */
export const postSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "https://example.com/PostSh",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "http://schema.org/SocialMediaPosting",
                  "http://schema.org/CreativeWork",
                  "http://schema.org/Thing",
                ],
              },
            },
            {
              type: "TripleConstraint",
              predicate: "http://schema.org/articleBody",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                  object: {
                    value: "articleBody",
                  },
                },
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The actual body of the article. ",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://schema.org/uploadDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                  object: {
                    value: "uploadDate",
                  },
                },
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "Date when this media object was uploaded to this site.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://schema.org/image",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                  object: {
                    value: "image",
                  },
                },
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A media object that encodes this CreativeWork. This property is a synonym for encoding.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://schema.org/publisher",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#label",
                  object: {
                    value: "publisher",
                  },
                },
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The publisher of the creative work.",
                  },
                },
              ],
            },
          ],
        },
        annotations: [
          {
            type: "Annotation",
            predicate: "http://www.w3.org/2000/01/rdf-schema#label",
            object: {
              value: "SocialMediaPost",
            },
          },
          {
            type: "Annotation",
            predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
            object: {
              value:
                "A post to a social media platform, including blog posts, tweets, Facebook posts, etc.",
            },
          },
        ],
      },
    },
  ],
};
