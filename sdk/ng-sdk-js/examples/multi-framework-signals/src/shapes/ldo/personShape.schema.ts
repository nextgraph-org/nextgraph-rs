import type { Schema } from "@nextgraph-monorepo/ng-shex-orm";

/**
 * =============================================================================
 * personShapeSchema: Schema for personShape
 * =============================================================================
 */
export const personShapeSchema: Schema = {
    "http://example.org/Person": {
        iri: "http://example.org/Person",
        predicates: [
            {
                type: "literal",
                literalValue: ["http://example.org/Person"],
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                readablePredicate: "type",
            },
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/name",
                readablePredicate: "name",
            },
            {
                type: "nested",
                nestedShape:
                    "http://example.org/Person||http://example.org/address",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/address",
                readablePredicate: "address",
            },
            {
                type: "boolean",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/hasChildren",
                readablePredicate: "hasChildren",
            },
            {
                type: "number",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/numberOfHouses",
                readablePredicate: "numberOfHouses",
            },
        ],
    },
    "http://example.org/Person||http://example.org/address": {
        iri: "http://example.org/Person||http://example.org/address",
        predicates: [
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/street",
                readablePredicate: "street",
            },
            {
                type: "string",
                maxCardinality: 1,
                minCardinality: 1,
                iri: "http://example.org/houseNumber",
                readablePredicate: "houseNumber",
            },
        ],
    },
};
