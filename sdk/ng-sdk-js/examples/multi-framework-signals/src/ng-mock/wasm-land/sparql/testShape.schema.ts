import type { Schema } from "@nextgraph-monorepo/ng-shex-orm";

/**
 * =============================================================================
 * testShapeSchema: Schema for testShape
 * =============================================================================
 */
export const testShapeSchema: Schema = {
    "http://example.org/TestObject": {
        iri: "http://example.org/TestObject",
        predicates: [
            {
                type: "literal",
                literalValue: ["TestObject"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "type",
                extra: true,
            },
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/stringValue",
                readablePredicate: "stringValue",
            },
            {
                type: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numValue",
                readablePredicate: "numValue",
            },
            {
                type: "boolean",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/boolValue",
                readablePredicate: "boolValue",
            },
            {
                type: "number",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/arrayValue",
                readablePredicate: "arrayValue",
            },
            {
                type: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/objectValue",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/objectValue",
                readablePredicate: "objectValue",
            },
            {
                type: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/anotherObject",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/anotherObject",
                readablePredicate: "anotherObject",
            },
            {
                type: "eitherOf",
                eitherOf: [
                    {
                        type: "string",
                    },
                    {
                        type: "number",
                    },
                ],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numOrStr",
                readablePredicate: "numOrStr",
            },
        ],
    },
    "http://example.org/TestObject||http://example.org/objectValue": {
        iri: "http://example.org/TestObject||http://example.org/objectValue",
        predicates: [
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedString",
                readablePredicate: "nestedString",
            },
            {
                type: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedNum",
                readablePredicate: "nestedNum",
            },
            {
                type: "number",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/nestedArray",
                readablePredicate: "nestedArray",
            },
        ],
    },
    "http://example.org/TestObject||http://example.org/anotherObject": {
        iri: "http://example.org/TestObject||http://example.org/anotherObject",
        predicates: [
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop1",
                readablePredicate: "prop1",
            },
            {
                type: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop2",
                readablePredicate: "prop2",
            },
        ],
    },
};
