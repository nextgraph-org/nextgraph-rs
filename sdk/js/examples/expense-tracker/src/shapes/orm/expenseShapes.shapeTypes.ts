import type { ShapeType } from "@ng-org/shex-orm";
import { expenseShapesSchema } from "./expenseShapes.schema";
import type { Expense, ExpenseCategory } from "./expenseShapes.typings";

// ShapeTypes for expenseShapes
export const ExpenseShapeType: ShapeType<Expense> = {
  schema: expenseShapesSchema,
  shape: "http://example.org/Expense",
};
export const ExpenseCategoryShapeType: ShapeType<ExpenseCategory> = {
  schema: expenseShapesSchema,
  shape: "http://example.org/ExpenseCategory",
};
