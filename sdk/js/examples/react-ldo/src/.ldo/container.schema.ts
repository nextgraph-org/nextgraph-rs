import { Schema } from "shexj";

/**
 * =============================================================================
 * containerSchema: ShexJ Schema for container
 * =============================================================================
 */
export const containerSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "http://www.w3.org/ns/lddps#Container",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          id: "http://www.w3.org/ns/lddps#ContainerShape",
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "http://www.w3.org/ns/ldp#Container",
                  "http://www.w3.org/ns/ldp#Resource",
                ],
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "A container",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://purl.org/dc/terms/modified",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Date modified",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/ldp#contains",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines a Resource",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/posix/stat#mtime",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#decimal",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "?",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/posix/stat#size",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "size of this container",
                  },
                },
              ],
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
  ],
};
