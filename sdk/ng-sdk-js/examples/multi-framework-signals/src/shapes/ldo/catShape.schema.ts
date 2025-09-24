import type { Schema } from "@nextgraph-monorepo/ng-shex-orm";

/**
 * =============================================================================
 * catShapeSchema: Schema for catShape
 * =============================================================================
 */
export const catShapeSchema: Schema = {
    "http://example.org/Cat": {
        iri: "http://example.org/Cat",
        predicates: [
            {
                valType: "literal",
                literalValue: ["http://example.org/Cat"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "type",
            },
            {
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/name",
                readablePredicate: "name",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/age",
                readablePredicate: "age",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numberOfHomes",
                readablePredicate: "numberOfHomes",
            },
            {
                valType: "nested",
                nestedShape:
                    "http://example.org/Cat||http://example.org/address",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/address",
                readablePredicate: "address",
            },
        ],
    },
    "http://example.org/Cat||http://example.org/address": {
        iri: "http://example.org/Cat||http://example.org/address",
        predicates: [
            {
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/street",
                readablePredicate: "street",
            },
            {
                valType: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/houseNumber",
                readablePredicate: "houseNumber",
            },
            {
                valType: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/floor",
                readablePredicate: "floor",
            },
        ],
    },
};
