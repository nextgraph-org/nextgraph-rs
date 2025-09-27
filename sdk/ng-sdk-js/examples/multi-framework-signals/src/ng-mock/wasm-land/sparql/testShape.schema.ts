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
                dataTypes: "literal",
                literalValue: ["TestObject"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "type",
                extra: true,
            },
            {
                dataTypes: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/stringValue",
                readablePredicate: "stringValue",
            },
            {
                dataTypes: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numValue",
                readablePredicate: "numValue",
            },
            {
                dataTypes: "boolean",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/boolValue",
                readablePredicate: "boolValue",
            },
            {
                dataTypes: "number",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/arrayValue",
                readablePredicate: "arrayValue",
            },
            {
                dataTypes: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/objectValue",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/objectValue",
                readablePredicate: "objectValue",
            },
            {
                dataTypes: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/anotherObject",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/anotherObject",
                readablePredicate: "anotherObject",
            },
            {
                dataTypes: "eitherOf",
                eitherOf: [
                    {
                        valType: "string",
                    },
                    {
                        valType: "number",
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
                dataTypes: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedString",
                readablePredicate: "nestedString",
            },
            {
                dataTypes: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedNum",
                readablePredicate: "nestedNum",
            },
            {
                dataTypes: "number",
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
                dataTypes: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop1",
                readablePredicate: "prop1",
            },
            {
                dataTypes: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop2",
                readablePredicate: "prop2",
            },
        ],
    },
};
