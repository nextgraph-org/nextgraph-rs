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
  "@type": Set<"http://example.org/Expense">;
  /**
   * The name of the expense
   *
   * Original IRI: http://example.org/title
   */
  title: string;
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
   * The use category of the product
   *
   * Original IRI: http://example.org/expenseCategory
   */
  expenseCategory?: Set<ExpenseCategory>;
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
