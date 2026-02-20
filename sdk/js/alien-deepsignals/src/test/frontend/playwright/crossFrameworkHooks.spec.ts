// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { test, expect, Page } from "@playwright/test";
import { mockTestObject, type TaggedObject } from "../utils/mockData";

const frameworks = ["react", "vue", "svelte", "svelte4"] as const;
type Framework = (typeof frameworks)[number];

const alphaEntry = Array.from(mockTestObject.objectSet).find(
    (entry) => entry["@id"] === "urn:object:alpha"
) as TaggedObject | undefined;

if (!alphaEntry) {
    throw new Error(
        "mock data must include an objectSet entry with @id urn:object:alpha"
    );
}

type FieldPlan = {
    key: string;
    mutate(page: Page, framework: Framework): Promise<void>;
    assert(page: Page, framework: Framework): Promise<void>;
};

const fieldLocator = (page: Page, framework: Framework, key: string) =>
    page.locator(`.${framework} [data-field='${key}']`);

const createTextPlan = (key: string, nextValue: string): FieldPlan => ({
    key,
    mutate: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        const input = field.locator("input[data-role='editor']");
        await input.fill(nextValue);
        await input.blur();
    },
    assert: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        await expect(field.locator("[data-role='value']")).toHaveText(
            nextValue
        );
    },
});

const createNumberPlan = (key: string, nextValue: number): FieldPlan => ({
    key,
    mutate: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        const input = field.locator("input[data-role='editor']");
        await input.fill(String(nextValue));
        await input.blur();
    },
    assert: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        await expect(field.locator("[data-role='value']")).toHaveText(
            String(nextValue)
        );
    },
});

const createBooleanPlan = (key: string, nextValue: boolean): FieldPlan => ({
    key,
    mutate: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        const input = field.locator("input[data-role='editor']");
        await input.setChecked(nextValue);
    },
    assert: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        await expect(field.locator("[data-role='value']")).toHaveText(
            String(nextValue)
        );
    },
});

const createArrayPlan = (
    key: string,
    initialLength: number,
    additions: number
): FieldPlan => ({
    key,
    mutate: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        const addButton = field.locator("button[data-action='push']");
        for (let i = 0; i < additions; i++) {
            await addButton.click();
        }
    },
    assert: async (page, framework) => {
        const expectedLength = initialLength + additions;
        const field = fieldLocator(page, framework, key);
        await expect(field.locator("[data-role='array-length']")).toHaveText(
            `Length: ${expectedLength}`
        );
    },
});

const createSetPlan = (
    key: string,
    initialSize: number,
    additions: number
): FieldPlan => ({
    key,
    mutate: async (page, framework) => {
        const field = fieldLocator(page, framework, key);
        const addButton = field.locator("button[data-action='add']");
        for (let i = 0; i < additions; i++) {
            await addButton.click();
        }
    },
    assert: async (page, framework) => {
        const expectedSize = initialSize + additions;
        const field = fieldLocator(page, framework, key);
        await expect(field.locator("[data-role='set-size']")).toHaveText(
            `Size: ${expectedSize}`
        );
    },
});

const createObjectSetPlan = (
    entryId: string,
    nextLabel: string,
    expectedCount: number
): FieldPlan => ({
    key: "objectSet",
    mutate: async (page, framework) => {
        const entry = fieldLocator(page, framework, "objectSet").locator(
            `[data-entry-id='${entryId}']`
        );
        const labelInput = entry.locator("input[data-role='label']");
        await labelInput.fill(nextLabel);
        await labelInput.blur();
        await entry.locator("button[data-action='increment']").click();
    },
    assert: async (page, framework) => {
        const entry = fieldLocator(page, framework, "objectSet").locator(
            `[data-entry-id='${entryId}']`
        );
        await expect(entry.locator("[data-role='count']")).toHaveText(
            String(expectedCount)
        );
        await expect(entry.locator("input[data-role='label']")).toHaveValue(
            nextLabel
        );
    },
});

const fieldPlans: FieldPlan[] = [
    createTextPlan("type", "TestObjectUpdated"),
    createTextPlan("stringValue", "string_changed"),
    createNumberPlan("numValue", 1337),
    createBooleanPlan("boolValue", false),
    createTextPlan("objectValue.nestedString", "nested_changed"),
    createNumberPlan("objectValue.nestedNum", 77),
    createArrayPlan("arrayValue", mockTestObject.arrayValue.length, 2),
    createArrayPlan(
        "objectValue.nestedArray",
        mockTestObject.objectValue.nestedArray.length,
        1
    ),
    createSetPlan("setValue", mockTestObject.setValue.size, 1),
    createObjectSetPlan(
        alphaEntry["@id"],
        "Alpha updated",
        alphaEntry.count + 1
    ),
];

const getRenderCounts = (page: Page) =>
    page.evaluate(() => ({ ...((window as any).renderCounts ?? {}) }));

const waitForFrameworkReady = async (page: Page, framework: Framework) => {
    try {
        await page.waitForSelector(`.${framework} .title`, {
            state: "visible",
        });
    } catch (error) {
        throw new Error(
            `${framework} panel did not render within 10 seconds: ${error}`
        );
    }
};

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForFrameworkReady(page, "react");
    await waitForFrameworkReady(page, "vue");
    await waitForFrameworkReady(page, "svelte");
    await waitForFrameworkReady(page, "svelte4");
    await page.waitForFunction("window.testHarness?.ready === true");
    await page.evaluate(() => (window as any).testHarness?.resetState());
});

test("components load", async ({ page }) => {
    for (const framework of frameworks) {
        await expect(page.locator(`.${framework} .title`)).toBeDefined();
    }
});

test.describe("cross framework propagation", () => {
    for (const source of frameworks) {
        for (const target of frameworks) {
            if (source === target) continue;

            test(`${source} edits propagate to ${target}`, async ({ page }) => {
                await test.step(`mutate in ${source}`, async () => {
                    for (const plan of fieldPlans) {
                        await plan.mutate(page, source);
                    }
                });

                await page.waitForTimeout(100);

                await test.step(`assert in ${target}`, async () => {
                    for (const plan of fieldPlans) {
                        await plan.assert(page, target);
                    }
                });

                await test.step(`validate mutated source ${source}`, async () => {
                    for (const plan of fieldPlans) {
                        await plan.assert(page, source);
                    }
                });
            });
        }
    }
});

test("hidden mutations do not trigger renders", async ({ page }) => {
    const before = await getRenderCounts(page);
    await page.evaluate(() => {
        if ((window as any).sharedState) {
            (window as any).sharedState.hiddenValue = Math.random();
        }
    });
    await page.waitForTimeout(50);
    const after = await getRenderCounts(page);
    for (const framework of frameworks) {
        const previous = before[framework] ?? 0;
        const current = after[framework] ?? 0;
        expect(current).toBeGreaterThanOrEqual(previous);
        expect(current - previous).toBeLessThanOrEqual(2);
    }
});
