import { describe, it, expect } from "vitest";
import annotateReadablePredicates from "../util/annotateReadablePredicates.ts";
import { shexJConverter } from "../converter.ts";

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
        ],
    };
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
            /interface ExpenseCategory[\s\S]*?"@type": Set<"http:\/\/example\.org\/ExpenseCategory" \|[\s]*\(?string[\s]*&[\s]*\{[\s]*\}\)?>;/
        );
    });
});
