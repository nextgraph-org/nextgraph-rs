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
        maxCardinality: 1,
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://example.org/description",
        readablePredicate: "description",
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/dateOfPurchase",
        readablePredicate: "dateOfPurchase",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "http://example.org/expenseCategory",
        readablePredicate: "expenseCategory",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/isRecurring",
        readablePredicate: "isRecurring",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "http://example.org/recurrenceInterval",
        readablePredicate: "recurrenceInterval",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["http://example.org/Paid"],
          },
          {
            valType: "iri",
            literals: ["http://example.org/Pending"],
          },
          {
            valType: "iri",
            literals: ["http://example.org/Overdue"],
          },
          {
            valType: "iri",
            literals: ["http://example.org/Refunded"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://example.org/paymentStatus",
        readablePredicate: "paymentStatus",
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
