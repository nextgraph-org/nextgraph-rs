import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * expenseShapesSchema: Schema for expenseShapes
 * =============================================================================
 */
export const expenseShapesSchema: Schema = {
  "did:ng:z:ExpenseShape": {
    iri: "did:ng:z:ExpenseShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:Expense"],
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
        iri: "did:ng:z:title",
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
        iri: "did:ng:z:description",
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
        iri: "did:ng:z:totalPrice",
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
        iri: "did:ng:z:amount",
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
        iri: "did:ng:z:dateOfPurchase",
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
        iri: "did:ng:z:expenseCategory",
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
        iri: "did:ng:z:isRecurring",
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
        iri: "did:ng:z:recurrenceInterval",
        readablePredicate: "recurrenceInterval",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:Paid"],
          },
          {
            valType: "iri",
            literals: ["did:ng:z:Pending"],
          },
          {
            valType: "iri",
            literals: ["did:ng:z:Overdue"],
          },
          {
            valType: "iri",
            literals: ["did:ng:z:Refunded"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:z:paymentStatus",
        readablePredicate: "paymentStatus",
      },
    ],
  },
  "did:ng:z:ExpenseCategoryShape": {
    iri: "did:ng:z:ExpenseCategoryShape",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:z:ExpenseCategory"],
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
        iri: "did:ng:z:categoryName",
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
        iri: "did:ng:z:description",
        readablePredicate: "description",
      },
    ],
  },
};
