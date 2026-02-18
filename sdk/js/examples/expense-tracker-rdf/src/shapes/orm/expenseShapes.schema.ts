import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * expenseShapesSchema: Schema for expenseShapes
 * =============================================================================
 */
export const expenseShapesSchema: Schema = {
  "http://example.org/ExpenseShape": {
    iri: "http://example.org/ExpenseShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["http://example.org/Expense"],
          },
        ],
        maxCardinality: -1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/title",
        readablePredicate: "title",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/totalPrice",
        readablePredicate: "totalPrice",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/amount",
        readablePredicate: "amount",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "http://example.org/ExpenseShape||http://example.org/expenseCategory",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/expenseCategory",
        readablePredicate: "expenseCategory",
      },
    ],
  },
  "http://example.org/ExpenseShape||http://example.org/expenseCategory": {
    iri: "http://example.org/ExpenseShape||http://example.org/expenseCategory",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["http://example.org/ExpenseCategory"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/categoryName",
        readablePredicate: "categoryName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/description",
        readablePredicate: "description",
      },
    ],
  },
  "http://example.org/ExpenseCategoryShape": {
    iri: "http://example.org/ExpenseCategoryShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["http://example.org/ExpenseCategory"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/categoryName",
        readablePredicate: "categoryName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/description",
        readablePredicate: "description",
      },
    ],
  },
};
