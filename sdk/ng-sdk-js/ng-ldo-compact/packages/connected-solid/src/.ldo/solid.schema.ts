import { Schema } from "shexj";

/**
 * =============================================================================
 * solidSchema: ShexJ Schema for solid
 * =============================================================================
 */
export const solidSchema: Schema = {
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
                    value: "A container on a Solid server",
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
              valueExpr: "http://www.w3.org/ns/lddps#Resource",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines a Solid Resource",
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
    {
      id: "http://www.w3.org/ns/lddps#Resource",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          id: "http://www.w3.org/ns/lddps#ResourceShape",
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "http://www.w3.org/ns/ldp#Resource",
                  "http://www.w3.org/ns/iana/media-types/text/turtle#Resource",
                ],
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Any resource on a Solid server",
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
    {
      id: "http://www.w3.org/ns/lddps#ProfileWithStorage",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          id: "http://www.w3.org/ns/lddps#ProfileWithStorageShape",
          type: "TripleConstraint",
          predicate: "http://www.w3.org/ns/pim/space#storage",
          valueExpr: {
            type: "NodeConstraint",
            nodeKind: "iri",
          },
          min: 0,
          max: -1,
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
  ],
};
