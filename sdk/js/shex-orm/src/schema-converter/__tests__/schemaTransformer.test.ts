import { describe, it, expect } from "vitest";
import parser from "@shexjs/parser";
import annotateReadablePredicates from "../util/annotateReadablePredicates.ts";
import { shexJConverter } from "../converter.ts";
import type { Schema as ShapeSchema, Shape } from "../../types.ts";

// Generated with Claude Opus 4.6

const TYPE_IRI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const BASE_IRI = "http://example.org/";

/** Parse ShEx text → ShExJ → annotate → convert → return flattened schema. */
async function buildSchema(shex: string): Promise<ShapeSchema> {
    // @ts-ignore
    const shexJ = parser.construct(BASE_IRI).parse(shex);
    // @ts-ignore
    annotateReadablePredicates(shexJ);
    const [, schema] = await shexJConverter(shexJ);
    return schema;
}

/** Find a predicate by its IRI in a shape. */
function findPredicate(shape: Shape, predicateIri: string) {
    return shape.predicates.find((p) => p.iri === predicateIri);
}

// ---------------------------------------------------------------------------
// Common prefixes used in all test schemas
// ---------------------------------------------------------------------------
const PREFIXES = `
PREFIX ex: <http://example.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ShexJSchemaTransformer", () => {
    // Single shape reference via @
    it("converts a single @-prefixed shape reference to valType 'shape'", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:category @ex:CategoryShape ;
            }
            ex:CategoryShape EXTRA a {
                a [ ex:Category ] ;
                ex:name xsd:string ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/category")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(1);
        expect(pred.dataTypes[0]).toEqual({
            valType: "shape",
            shape: "http://example.org/CategoryShape",
        });
    });

    // Shape reference without @ (datatype-like IRI) → valType "iri"
    it("converts an unrecognized datatype IRI to valType 'iri'", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:category ex:CategoryShape ;
            }
            ex:CategoryShape EXTRA a {
                a [ ex:Category ] ;
                ex:name xsd:string ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/category")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(1);
        expect(pred.dataTypes[0].valType).toBe("iri");
    });

    // ShapeOr with multiple shape references
    it("converts ShapeOr with two shape references to two shape DataTypes", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:category (@ex:CategoryShape OR @ex:TagShape) ;
            }
            ex:CategoryShape EXTRA a {
                a [ ex:Category ] ;
                ex:name xsd:string ;
            }
            ex:TagShape EXTRA a {
                a [ ex:Tag ] ;
                ex:label xsd:string ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/category")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(2);
        expect(pred.dataTypes[0]).toEqual({
            valType: "shape",
            shape: "http://example.org/CategoryShape",
        });
        expect(pred.dataTypes[1]).toEqual({
            valType: "shape",
            shape: "http://example.org/TagShape",
        });
    });

    // ShapeOr mixing primitive and shape reference
    it("converts ShapeOr mixing a primitive and a shape reference", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:catOrString xsd:string OR @ex:CategoryShape ;
            }
            ex:CategoryShape EXTRA a {
                a [ ex:Category ] ;
                ex:name xsd:string ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/catOrString")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(2);

        const types = pred.dataTypes.map((d) => d.valType);
        expect(types).toContain("string");
        expect(types).toContain("shape");

        const shapeDt = pred.dataTypes.find((d) => d.valType === "shape")!;
        expect(shapeDt.shape).toBe("http://example.org/CategoryShape");
    });

    // Anonymous inline shape → flattened to root with derived IRI
    it("flattens anonymous inline shapes to root with a derived IRI", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:category EXTRA a {
                    a [ ex:Category ] ;
                    ex:name xsd:string ;
                } ;
            }
        `);

        const derivedIri =
            "http://example.org/ItemShape||http://example.org/category";

        // The parent predicate should reference the derived IRI
        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/category")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(1);
        expect(pred.dataTypes[0]).toEqual({
            valType: "shape",
            shape: derivedIri,
        });

        // The anonymous shape should exist as a root-level entry
        const flattenedShape = schema[derivedIri];
        expect(flattenedShape).toBeDefined();
        expect(flattenedShape.iri).toBe(derivedIri);

        const namePred = findPredicate(
            flattenedShape,
            "http://example.org/name"
        );
        expect(namePred).toBeDefined();
    });

    // IRI value set (enumeration)
    it("converts IRI value sets to multiple iri DataTypes with literals", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
                ex:status [ex:Active ex:Archived ex:Deleted] ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        const pred = findPredicate(item, "http://example.org/status")!;
        expect(pred).toBeDefined();
        expect(pred.dataTypes).toHaveLength(3);
        expect(pred.dataTypes[0]).toEqual({
            valType: "iri",
            literals: ["http://example.org/Active"],
        });
        expect(pred.dataTypes[1]).toEqual({
            valType: "iri",
            literals: ["http://example.org/Archived"],
        });
        expect(pred.dataTypes[2]).toEqual({
            valType: "iri",
            literals: ["http://example.org/Deleted"],
        });
    });

    // Single-predicate shape (no EachOf wrapper)
    it("handles shapes with only one predicate", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:ItemShape {
                ex:name xsd:string ;
            }
        `);

        const item = schema["http://example.org/ItemShape"];
        expect(item).toBeDefined();
        expect(item.predicates).toHaveLength(1);
        expect(item.predicates[0].iri).toBe("http://example.org/name");
        expect(item.predicates[0].dataTypes[0].valType).toBe("string");
    });

    // EXTRA predicate
    it("marks EXTRA predicates with extra: true", async () => {
        const schema = await buildSchema(`
            ${PREFIXES}
            ex:CategoryShape EXTRA a {
                a [ ex:Category ] ;
                ex:name xsd:string ;
            }
        `);

        const cat = schema["http://example.org/CategoryShape"];
        const typePred = findPredicate(cat, TYPE_IRI)!;
        expect(typePred).toBeDefined();
        expect(typePred.extra).toBe(true);
    });
});
