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
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "http://example.org/Expense";
  /**
   * The name of the expense
   *
   * Original IRI: http://example.org/title
   */
  title: string;
  /**
   * A readable description
   *
   * Original IRI: http://example.org/description
   */
  description?: string;
  /**
   * The total price
   *
   * Original IRI: http://example.org/totalPrice
   */
  totalPrice: number;
  /**
   * The number of items bought
   *
   * Original IRI: http://example.org/amount
   */
  amount: number;
  /**
   * The date of purchase
   *
   * Original IRI: http://example.org/dateOfPurchase
   */
  dateOfPurchase: string;
  /**
   * The use category of the product
   *
   * Original IRI: http://example.org/expenseCategory
   */
  expenseCategory?: Set<IRI>;
  /**
   * True, if this is a recurring expense (e.g. bus pass)
   *
   * Original IRI: http://example.org/isRecurring
   */
  isRecurring: boolean;
  /**
   * For recurring events, the interval of recurrence
   *
   * Original IRI: http://example.org/recurrenceInterval
   */
  recurrenceInterval?: string;
  /**
   * The payment status of the expense
   *
   * Original IRI: http://example.org/paymentStatus
   */
  paymentStatus:
    | "http://example.org/Paid"
    | "http://example.org/Pending"
    | "http://example.org/Overdue"
    | "http://example.org/Refunded";
}

/**
 * ExpenseCategory Type
 */
export interface ExpenseCategory {
  /**
   * The graph IRI.
   */
  readonly "@graph": IRI;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": Set<"http://example.org/ExpenseCategory" | (IRI & {})>;
  /**
   * Name of expense category
   *
   * Original IRI: http://example.org/categoryName
   */
  categoryName: string;
  /**
   * Human-readable description of category
   *
   * Original IRI: http://example.org/description
   */
  description: string;
}
