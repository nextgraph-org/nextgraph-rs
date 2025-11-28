import { test, expect, Page } from "@playwright/test";
import type {
    PerfScenarioCounts,
    PerfScenarioResult,
    PerfVariant,
} from "../utils/state";

const frameworks = ["react", "vue", "svelte"] as const;
const scenarios = frameworks.flatMap((framework) => [
    { framework, variant: "deep" as PerfVariant },
    { framework, variant: "native" as PerfVariant },
]);

type Framework = (typeof frameworks)[number];

const waitForFrameworkReady = async (page: Page, framework: Framework) => {
    await page.waitForSelector(`.${framework} .title`, {
        state: "visible",
    });
    await page.waitForFunction(
        (name) => ((window as any).renderEventCounts?.[name] ?? 0) > 0,
        framework,
        { timeout: 5_000 }
    );
};

const waitForPerfSuiteReady = async (
    page: Page,
    framework: Framework,
    variant: PerfVariant
) => {
    await page.waitForFunction(
        ({ framework, variant }) =>
            Boolean((window as any).perfSuite?.runners?.[framework]?.[variant]),
        { framework, variant },
        { timeout: 15_000 }
    );
};

const navigateToScenario = async (
    page: Page,
    framework: Framework,
    variant: PerfVariant
) => {
    await page.goto(`/perf?framework=${framework}&variant=${variant}`);
    await waitForFrameworkReady(page, framework);
    await waitForPerfSuiteReady(page, framework, variant);
};

const runScenario = async (
    page: Page,
    framework: Framework,
    variant: PerfVariant,
    counts: PerfScenarioCounts
) => {
    return page.evaluate<
        PerfScenarioResult | undefined,
        {
            framework: Framework;
            variant: PerfVariant;
            counts: PerfScenarioCounts;
        }
    >(
        ({ framework, variant, counts }) =>
            (window as any).perfSuite?.runScenario?.(
                framework,
                variant,
                counts
            ),
        { framework, variant, counts }
    );
};

const formatDuration = (value?: number) =>
    typeof value === "number" ? `${value.toFixed(1)}ms` : "n/a";

const logScenarioOverview = (
    framework: Framework,
    variant: PerfVariant,
    result?: PerfScenarioResult
) => {
    if (!result) {
        // eslint-disable-next-line no-console
        console.log(`[perfSuite] ${framework}/${variant} produced no result`);
        return;
    }
    const mutate = result.blocks?.mutateExisting;
    const renderCount = mutate?.renderCounts?.[framework] ?? 0;
    const touchedIds = Object.keys(
        mutate?.objectRenderCounts?.[framework] ?? {}
    );
    const sample = touchedIds.slice(0, 5);
    const sampleDisplay = sample.length
        ? ` [${sample.join(", ")}${touchedIds.length > sample.length ? ", ..." : ""}]`
        : "";
    // eslint-disable-next-line no-console
    console.log(
        `[perfSuite] ${framework}/${variant} total=${formatDuration(
            result.totalDuration
        )} mutate=${formatDuration(mutate?.duration)} renders=${renderCount} touched=${touchedIds.length}${sampleDisplay}`
    );
};

test.describe("perfSuite object-set scenarios", () => {
    const baseCounts: PerfScenarioCounts = {
        primitives: 96,
        nested: 64,
        arrays: 40,
        sets: 40,
        objectSet: 48,
    };

    for (const { framework, variant } of scenarios) {
        test(`${framework}/${variant} runner reports block metrics`, async ({
            page,
        }) => {
            await navigateToScenario(page, framework, variant);
            if (framework === "react" && variant === "deep") {
                const debugInfo = await page.evaluate(() => ({
                    identity: (window as any).__reactSharedIdentity,
                    globalMatch: (window as any).__reactSharedGlobal,
                    watchHits: (window as any).__reactWatchHits,
                    adapterMatch: (window as any).__adapterSharedIdentity,
                    version: (window as any).sharedStateVersion,
                }));
                // eslint-disable-next-line no-console
                console.log(
                    `[debug] react/deep identity=${debugInfo.identity} global=${debugInfo.globalMatch} adapter=${debugInfo.adapterMatch} watchHits=${debugInfo.watchHits} version=${debugInfo.version}`
                );
            }
            const result = await runScenario(
                page,
                framework,
                variant,
                baseCounts
            );
            expect(result).toBeTruthy();
            const mutateBlock = result?.blocks?.mutateExisting;
            logScenarioOverview(framework, variant, result);
            expect(mutateBlock?.duration ?? 0).toBeGreaterThan(0);
            const alphaRenders =
                mutateBlock?.objectRenderCounts?.[framework]?.[
                    "urn:object:alpha"
                ] ?? 0;
            expect(alphaRenders).toBeGreaterThan(0);
        });
    }

    test("objectSet counts are configurable (react/deep)", async ({ page }) => {
        const framework: Framework = "react";
        const variant: PerfVariant = "deep";
        await navigateToScenario(page, framework, variant);
        const light = await runScenario(page, framework, variant, {
            objectSet: 1,
        });
        const heavy = await runScenario(page, framework, variant, {
            objectSet: 8,
        });
        expect(light).toBeTruthy();
        expect(heavy).toBeTruthy();
        const lightAlpha =
            light?.blocks?.mutateExisting?.objectRenderCounts?.react?.[
                "urn:object:alpha"
            ] ?? 0;
        const heavyAlpha =
            heavy?.blocks?.mutateExisting?.objectRenderCounts?.react?.[
                "urn:object:alpha"
            ] ?? 0;
        expect(heavyAlpha).toBeGreaterThanOrEqual(lightAlpha);
    });
});
