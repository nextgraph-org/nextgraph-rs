import { test, expect } from "@playwright/test";

const mockTestObject = {
  type: "TestObject",
  stringValue: "string",
  numValue: 42,
  boolValue: true,
  nullValue: null,
  arrayValue: [1, 2, 3],
  objectValue: {
    nestedString: "nested",
    nestedNum: 7,
    nestedArray: [10, 12],
  },
  setValue: new Set(["v1", "v2", "v3"]),
};

test("components load", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".vue astro-island");

  await expect(page.locator(".vue .title")).toHaveText("vue");
  await expect(page.locator(".react .title")).toHaveText("react");
  await expect(page.locator(".svelte .title")).toHaveText("svelte");
});

// TODO: Test without signal pooling.
test.describe("cross framework propagation", () => {
  const frameworks = ["vue", "react", "svelte"] as const;

  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof Set);

  function changedValue(original: unknown) {
    if (typeof original === "string") return original + "_changed";
    if (typeof original === "number") return original + 10;
    if (typeof original === "boolean") return !original;
    if (Array.isArray(original)) return [...original, {}, {}];
    if (original instanceof Set) new Set(original).add("_changed");

    return original;
  }

  async function mutateCell(
    row: ReturnType<(typeof test)["info"] extends any ? any : never>,
    original: unknown
  ) {
    if (typeof original === "string") {
      const input = row.locator("input[type='text']");
      await input.fill(String(changedValue(original)));
      await input.blur();
    } else if (typeof original === "number") {
      const input = row.locator("input[type='number']");
      await input.fill(String(changedValue(original)));
      await input.blur();
    } else if (typeof original === "boolean") {
      const input = row.locator("input[type='checkbox']");
      await input.setChecked(Boolean(changedValue(original)));
    } else if (Array.isArray(original)) {
      const addButton = row.locator("button", { hasText: "Add" });
      await addButton.click();
      await addButton.click();
    }
  }

  async function assertCell(
    row: ReturnType<(typeof test)["info"] extends any ? any : never>,
    original: unknown,
    meta: { framework: string; key: string }
  ) {
    const { framework, key } = meta;
    const expected = changedValue(original);
    const cell = row.locator("td").nth(1);

    if (typeof original === "string") {
      const input = row.locator("input[type='text']");
      await expect(
        input,
        `Text value mismatch (${framework}:${key})`
      ).toHaveValue(String(expected));
      await expect(
        cell,
        `Rendered text mismatch (${framework}:${key})`
      ).toContainText(String(expected));
    } else if (typeof original === "number") {
      const input = row.locator("input[type='number']");
      await expect(
        input,
        `Number value mismatch (${framework}:${key})`
      ).toHaveValue(String(expected));
      await expect(
        cell,
        `Rendered number mismatch (${framework}:${key})`
      ).toContainText(String(expected));
    } else if (typeof original === "boolean") {
      const input = row.locator("input[type='checkbox']");
      await expect(
        input,
        `Checkbox state mismatch (${framework}:${key})`
      ).toBeChecked({
        checked: Boolean(expected),
      });
      await expect(
        cell,
        `Rendered boolean mismatch (${framework}:${key})`
      ).toContainText(String(expected));
    } else if (Array.isArray(original)) {
      const expectedLength = (original as unknown[]).length + 2;
      await expect(
        cell,
        `Array length mismatch (${framework}:${key}) expected ${expectedLength}`
      ).toContainText(String(expectedLength));
    }
  }

  for (const source of frameworks) {
    for (const target of frameworks) {
      if (source === target) continue;

      test(`${source} edits propagate to ${target}`, async ({ page }) => {
        await page.goto("/");
        await page.waitForSelector(".vue astro-island");

        // Mutate in source
        await test.step(`Mutate values in ${source}`, async () => {
          for (const [key, value] of Object.entries(mockTestObject)) {
            if (isPlainObject(value)) {
              for (const [k2, v2] of Object.entries(value)) {
                const fullKey = `${key}.${k2}`;
                const row = page.locator(`.${source} tr`, { hasText: fullKey });
                await mutateCell(row, v2);
              }
            } else {
              const row = page.locator(`.${source} tr`, { hasText: key });
              await mutateCell(row, value);
            }
          }
        });

        // Assert in target
        await test.step(`Assert propagation into ${target}`, async () => {
          for (const [key, value] of Object.entries(mockTestObject)) {
            if (isPlainObject(value)) {
              for (const [k2, v2] of Object.entries(value)) {
                const fullKey = `${key}.${k2}`;
                const row = page.locator(`.${target} tr`, { hasText: fullKey });
                await assertCell(row, v2, { framework: target, key: fullKey });
              }
            } else {
              const row = page.locator(`.${target} tr`, { hasText: key });
              await assertCell(row, value, { framework: target, key });
            }
          }
        });

        // Optional: also ensure source reflects its own changes (helps isolate failures)
        await test.step(`Validate mutated source ${source}`, async () => {
          for (const [key, value] of Object.entries(mockTestObject)) {
            if (isPlainObject(value)) {
              for (const [k2, v2] of Object.entries(value)) {
                const fullKey = `${key}.${k2}`;
                const row = page.locator(`.${source} tr`, { hasText: fullKey });
                await assertCell(row, v2, { framework: source, key: fullKey });
              }
            } else {
              const row = page.locator(`.${source} tr`, { hasText: key });
              await assertCell(row, value, { framework: source, key });
            }
          }
        });
      });
    }
  }
});
