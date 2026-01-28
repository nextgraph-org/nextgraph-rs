// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ExpenseCategories } from "./ExpenseCategories";
import { Expenses } from "./Expenses";

export function ReactExpenseTracker() {
    return (
        <div id="react-main" className="expense-app-shell">
            <div className="expense-app-content">
                <header className="expense-hero">
                    <h1>React Expense Tracker</h1>
                    <p>
                        Organize categories, log purchases. Encrypted and
                        local-first.
                    </p>
                </header>
                <div className="section-stack">
                    <ExpenseCategories />
                    <Expenses />
                </div>
            </div>
        </div>
    );
}
