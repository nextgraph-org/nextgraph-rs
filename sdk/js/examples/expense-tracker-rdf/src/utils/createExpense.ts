import { insertObject } from "@ng-org/orm";
import { ExpenseShapeType } from "../shapes/orm/expenseShapes.shapeTypes";
import type { Expense } from "../shapes/orm/expenseShapes.typings";
import { sessionPromise } from "./ngSession";

export async function createExpense(obj: Partial<Expense>) {
    const { session_id, ng } = await sessionPromise;

    const docNuri = await ng.doc_create(
        session_id,
        "Graph",
        "data:graph",
        "store", // Private store
        undefined
    );

    await insertObject(ExpenseShapeType, {
        "@graph": docNuri,
        "@type": "did:ng:z:Expense",
        "@id": "",
        amount: obj.amount ?? 1,
        recurrenceInterval: obj.recurrenceInterval ?? "",
        description: obj.description ?? undefined,
        totalPrice: obj.totalPrice ?? 0,
        paymentStatus: obj.paymentStatus ?? "did:ng:z:Paid",
        isRecurring: obj.isRecurring ?? false,
        expenseCategory: obj.expenseCategory ?? new Set<string>(),
        dateOfPurchase: obj.dateOfPurchase ?? new Date().toISOString(),
        title: obj.title ?? "New Expense",
    });
}
