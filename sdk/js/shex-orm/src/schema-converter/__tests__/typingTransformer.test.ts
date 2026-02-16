import { describe, it, expect } from "vitest";
import annotateReadablePredicates from "../util/annotateReadablePredicates.ts";
import { shexJConverter } from "../converter.ts";
import { Schema } from "../../ShexJTypes.ts";

const TYPE_IRI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

function buildSchema() {
    return {
        type: "Schema",
        shapes: [
            {
                type: "ShapeDecl",
                id: "http://example.org/Expense",
                shapeExpr: {
                    type: "Shape",
                    expression: {
                        type: "EachOf",
                        expressions: [
                            {
                                type: "TripleConstraint",
                                predicate: TYPE_IRI,
                                valueExpr: {
                                    type: "NodeConstraint",
                                    values: [
                                        {
                                            value: "http://example.org/Expense",
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            },
            {
                type: "ShapeDecl",
                id: "http://example.org/ExpenseCategory",
                shapeExpr: {
                    type: "Shape",
                    extra: [TYPE_IRI],
                    expression: {
                        type: "EachOf",
                        expressions: [
                            {
                                type: "TripleConstraint",
                                predicate: TYPE_IRI,
                                valueExpr: {
                                    type: "NodeConstraint",
                                    values: [
                                        {
                                            value: "http://example.org/ExpenseCategory",
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                },
            },
            {
                type: "ShapeDecl",
                id: "http://example.org/CollisionTest",
                shapeExpr: {
                    type: "Shape",
                    extra: [TYPE_IRI],
                    expression: {
                        type: "EachOf",
                        expressions: [
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org/collide1/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org/collide2/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org/collide3/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org2/collide3/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org:collide4/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                            {
                                type: "TripleConstraint",
                                predicate: "http://example.org/collide4/foo",
                                valueExpr: {
                                    type: "NodeConstraint",
                                    datatype:
                                        "http://www.w3.org/2001/XMLSchema#string",
                                },
                            },
                        ],
                    },
                },
            },
        ],
    }; // satisfies Schema;
}

async function buildTypingsText(): Promise<string> {
    const schema = buildSchema();
    annotateReadablePredicates(schema as any);
    const [typings] = await shexJConverter(schema as any);
    return typings.typingsString;
}

describe("ShexJTypingTransformer", () => {
    it("emits literal unions for rdf:type constraints", async () => {
        const typings = await buildTypingsText();
        expect(typings).toMatch(
            /interface Expense[\s\S]*?"@type": "http:\/\/example\.org\/Expense";/
        );
    });

    it("treats EXTRA rdf:type predicates as plural", async () => {
        const typings = await buildTypingsText();
        expect(typings).toMatch(
            /\"@type\": Set<\"http:\/\/example\.org\/ExpenseCategory\" | IRI & {}>;/
        );
    });

    it("handles property name collisions", async () => {
        const typings = await buildTypingsText();

        expect(typings).toMatch(/ collide1_foo: string/);
        expect(typings).toMatch(/ collide2_foo: string/);
        expect(typings).toMatch(/ org_collide3_foo: string/);
        expect(typings).toMatch(/ org2_collide3_foo: string/);
        expect(typings).toMatch(/ "0__http_example_org_collide4_foo"\: string/);
        expect(typings).toMatch(/ "1__http_example_org_collide4_foo"\: string/);
    });
});
