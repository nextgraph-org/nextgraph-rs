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
     * The subject IRI.
     */
    readonly "@id"?: IRI;
    /**
     * The name of the expense
     */
    title: string;
    /**
     * A readable description
     */
    description?: string;
    /**
     * The total price
     */
    totalPrice: number;
    /**
     * The number of items bought
     */
    amount: number;
    /**
     * The (ISO8601) date of purchase
     */
    dateOfPurchase: string;
    /**
     * The use category of the product
     *
     * Original IRI: http://example.org/expenseCategory
     */
    expenseCategories: string[];
    /**
     * True, if this is a recurring expense (e.g. bus pass)
     */
    isRecurring: boolean;
    /**
     * For recurring events, the interval of recurrence
     */
    recurrenceInterval?: string;
    /**
     * The payment status of the expense
     */
    paymentStatus: "Paid" | "Pending" | "Overdue" | "Refunded";
}

/**
 * ExpenseCategory Type
 */
export interface ExpenseCategory {
    readonly "@id"?: IRI;
    /**
     * Name of expense category
     */
    categoryName: string;
    /**
     * Human-readable description of category
     */
    description: string;
}
/**
 * The structure of the discrete JSON (YJS or Automerge) document that all data is stored in.
 */
export interface DocumentStore {
    expenses: Expense[];
    expenseCategories: ExpenseCategory[];
}

export type AllowedCrdt = "YMap" | "Automerge";
