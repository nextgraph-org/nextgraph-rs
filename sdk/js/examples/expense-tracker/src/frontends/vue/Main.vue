<!--
// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT
-->
<script setup lang="ts">
import ExpenseCategories from "./ExpenseCategories.vue";
import Expenses from "./Expenses.vue";
</script>

<template>
    <div id="vue-main" class="expense-app-shell">
        <div class="expense-app-content">
            <header class="expense-hero">
                <h1>Vue Expense Tracker</h1>
                <p>
                    Organize categories, log purchases. Encrypted and local-first.
                </p>
            </header>
            <div class="section-stack">
                <ExpenseCategories />
                <Expenses />
            </div>
        </div>
    </div>
</template>
