import { describe, expect, test } from "vitest";
import { makeSparqlQuery, sparql } from "./useInfiniteShape.ts";

describe("sparql template", () => {
    test("escapes interpolated literal values", () => {
        const query = sparql`SELECT ?s WHERE { ?s ?p ${'a"b\\c\n'} }`;

        expect(query).toContain('"a\\\"b\\\\c\\n"');
    });

    test("renders numeric values without quotes", () => {
        const query = sparql`SELECT ?s WHERE { ?s ?p ?o } LIMIT ${10} OFFSET ${5}`;

        expect(query).toContain("LIMIT 10");
        expect(query).toContain("OFFSET 5");
    });
});

describe("makeSparqlQuery", () => {
    test("creates a paginated query without orderBy", () => {
        const query = makeSparqlQuery("did:ng:z:type", 20, 0, undefined);

        expect(query).toContain("SELECT DISTINCT ?id");
        expect(query).toContain("?id a <did:ng:z:type> .");
        expect(query).toContain("LIMIT 20");
        expect(query).toContain("OFFSET 0");
        expect(query).not.toContain("ORDER BY");
    });

    test("creates an ordered query when orderBy is provided", () => {
        const query = makeSparqlQuery("did:ng:z:type", 20, 40, "did:ng:z:pred");

        expect(query).toContain(
            "OPTIONAL { ?id <did:ng:z:pred> ?orderByValue . }"
        );
        expect(query).toContain("ORDER BY ?orderByValue");
    });

    test("throws for invalid iri", () => {
        expect(() =>
            makeSparqlQuery("did:ng:z:type bad", 20, 0, undefined)
        ).toThrow("Invalid SPARQL IRI");
    });

    test("throws for invalid pagination", () => {
        expect(() => makeSparqlQuery("did:ng:z:type", 0, 0, undefined)).toThrow(
            "pageSize must be a positive integer"
        );
        expect(() =>
            makeSparqlQuery("did:ng:z:type", 10, -1, undefined)
        ).toThrow("offset must be a non-negative integer");
    });
});
