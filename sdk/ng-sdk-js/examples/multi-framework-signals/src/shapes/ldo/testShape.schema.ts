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
                valType: "literal",
                literalValue: ["http://example.org/TestObject"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "type",
                extra: true,
            },
            {
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/stringValue",
                readablePredicate: "stringValue",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numValue",
                readablePredicate: "numValue",
            },
            {
                valType: "boolean",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/boolValue",
                readablePredicate: "boolValue",
            },
            {
                valType: "number",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/arrayValue",
                readablePredicate: "arrayValue",
            },
            {
                valType: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/objectValue",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/objectValue",
                readablePredicate: "objectValue",
            },
            {
                valType: "nested",
                nestedShape:
                    "http://example.org/TestObject||http://example.org/anotherObject",
                maxCardinality: -1,
                minCardinality: 0,
                iri: "http://example.org/anotherObject",
                readablePredicate: "anotherObject",
            },
            {
                valType: "eitherOf",
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
            {
                valType: "literal",
                literalValue: ["lit1", "lit2"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/lit1Or2",
                readablePredicate: "lit1Or2",
            },
        ],
    },
    "http://example.org/TestObject||http://example.org/objectValue": {
        iri: "http://example.org/TestObject||http://example.org/objectValue",
        predicates: [
            {
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedString",
                readablePredicate: "nestedString",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/nestedNum",
                readablePredicate: "nestedNum",
            },
            {
                valType: "number",
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
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop1",
                readablePredicate: "prop1",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/prop2",
                readablePredicate: "prop2",
            },
        ],
    },
};
