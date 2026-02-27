export type IRI = string;

/**
 * =============================================================================
 * Typescript Typings for expenseShapes
 * =============================================================================
 */

/**
 * Expense Type
 */
export interface Expense {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:z:Expense";
  /**
   * The name of the expense
   *
   * Original IRI: did:ng:z:title
   */
  title: string;
  /**
   * A readable description
   *
   * Original IRI: did:ng:z:description
   */
  description?: string;
  /**
   * The total price
   *
   * Original IRI: did:ng:z:totalPrice
   */
  totalPrice: number;
  /**
   * The number of items bought
   *
   * Original IRI: did:ng:z:amount
   */
  amount: number;
  /**
   * The date of purchase
   *
   * Original IRI: did:ng:z:dateOfPurchase
   */
  dateOfPurchase: string;
  /**
   * The use category of the product
   *
   * Original IRI: did:ng:z:expenseCategory
   */
  expenseCategory?: Set<string>;
  /**
   * True, if this is a recurring expense (e.g. bus pass)
   *
   * Original IRI: did:ng:z:isRecurring
   */
  isRecurring: boolean;
  /**
   * For recurring events, the interval of recurrence
   *
   * Original IRI: did:ng:z:recurrenceInterval
   */
  recurrenceInterval?: string;
  /**
   * The payment status of the expense
   *
   * Original IRI: did:ng:z:paymentStatus
   */
  paymentStatus:
    | "did:ng:z:Paid"
    | "did:ng:z:Pending"
    | "did:ng:z:Overdue"
    | "did:ng:z:Refunded";
}

/**
 * ExpenseCategory Type
 */
export interface ExpenseCategory {
  /**
   * The graph NURI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"did:ng:z:ExpenseCategory" | (IRI & {})>;
  /**
   * Name of expense category
   *
   * Original IRI: did:ng:z:categoryName
   */
  categoryName: string;
  /**
   * Human-readable description of category
   *
   * Original IRI: did:ng:z:description
   */
  description: string;
}
