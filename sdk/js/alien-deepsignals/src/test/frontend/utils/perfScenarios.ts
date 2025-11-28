import type {
    PerfScenarioBlockResult,
    PerfScenarioCounts,
    PerfScenarioResult,
    PerfScenarioRun,
    PerfVariant,
} from "./state";
import { resetSharedState, sharedState } from "./state";
import {
    snapshotObjectRenderCounts,
    snapshotRenderCounts,
} from "./renderMetrics";
import type { TaggedObject } from "./mockData";

const frameworks = ["react", "vue", "svelte"] as const;
type Framework = (typeof frameworks)[number];

type ScenarioAdapter = {
    reset: () => void | Promise<void>;
    mutateExisting: (iterations: number) => void | Promise<void>;
    bulkMutate: (iterations: number) => void | Promise<void>;
    batchAddRemove: (iterations: number) => void | Promise<void>;
};

const DEFAULT_COUNTS: Required<PerfScenarioCounts> = {
    primitives: 200,
    nested: 120,
    arrays: 80,
    sets: 64,
    objectSet: 80,
    warmupRuns: 0,
    repeatRuns: 1,
};

const adapters: Partial<
    Record<Framework, Partial<Record<PerfVariant, ScenarioAdapter>>>
> = {};

const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();
const settle = () =>
    new Promise<void>((resolve) => {
        if (
            typeof window !== "undefined" &&
            typeof window.requestAnimationFrame === "function"
        ) {
            window.requestAnimationFrame(() => resolve());
        } else {
            setTimeout(() => resolve(), 16);
        }
    });

const withDefaults = (counts?: PerfScenarioCounts) => ({
    primitives: counts?.primitives ?? DEFAULT_COUNTS.primitives,
    nested: counts?.nested ?? DEFAULT_COUNTS.nested,
    arrays: counts?.arrays ?? DEFAULT_COUNTS.arrays,
    sets: counts?.sets ?? DEFAULT_COUNTS.sets,
    objectSet: counts?.objectSet ?? DEFAULT_COUNTS.objectSet,
    warmupRuns: counts?.warmupRuns ?? DEFAULT_COUNTS.warmupRuns,
    repeatRuns: counts?.repeatRuns ?? DEFAULT_COUNTS.repeatRuns,
});

const diffNumericMap = (
    after: Record<string, number>,
    before: Record<string, number>
): Record<string, number> => {
    const keys = new Set([...Object.keys(after), ...Object.keys(before)]);
    const result: Record<string, number> = {};
    for (const key of keys) {
        result[key] = (after[key] ?? 0) - (before[key] ?? 0);
    }
    return result;
};

const diffObjectRenderCounts = (
    after: Record<string, Record<string, number>>,
    before: Record<string, Record<string, number>>
): Record<string, Record<string, number>> => {
    const scope = new Set([...Object.keys(after), ...Object.keys(before)]);
    const result: Record<string, Record<string, number>> = {};
    for (const framework of scope) {
        const afterEntries = after[framework] ?? {};
        const beforeEntries = before[framework] ?? {};
        const ids = new Set([
            ...Object.keys(afterEntries),
            ...Object.keys(beforeEntries),
        ]);
        const diff: Record<string, number> = {};
        for (const id of ids) {
            diff[id] = (afterEntries[id] ?? 0) - (beforeEntries[id] ?? 0);
        }
        result[framework] = diff;
    }
    return result;
};

const measureBlock = async (
    name: string,
    action: () => void | Promise<void>
) => {
    const beforeRenders = snapshotRenderCounts();
    const beforeObjectRenders = snapshotObjectRenderCounts();
    const start = now();
    await action();
    await settle();
    const duration = now() - start;
    const afterRenders = snapshotRenderCounts();
    const afterObjectRenders = snapshotObjectRenderCounts();
    return {
        name,
        duration,
        renderCounts: diffNumericMap(afterRenders, beforeRenders),
        objectRenderCounts: diffObjectRenderCounts(
            afterObjectRenders,
            beforeObjectRenders
        ),
    };
};

const accumulateNumericMap = (
    target: Record<string, number>,
    delta: Record<string, number>
) => {
    for (const [key, value] of Object.entries(delta)) {
        target[key] = (target[key] ?? 0) + value;
    }
};

const accumulateObjectRenderCounts = (
    target: Record<string, Record<string, number>>,
    delta: Record<string, Record<string, number>>
) => {
    for (const [scope, entries] of Object.entries(delta)) {
        const targetEntries = (target[scope] ??= {});
        for (const [id, value] of Object.entries(entries)) {
            targetEntries[id] = (targetEntries[id] ?? 0) + value;
        }
    }
};

const averageNumericMap = (
    source: Record<string, number>,
    divisor: number
): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(source)) {
        result[key] = Math.round(value / divisor);
    }
    return result;
};

const averageObjectRenderCounts = (
    source: Record<string, Record<string, number>>,
    divisor: number
) => {
    const result: Record<string, Record<string, number>> = {};
    for (const [scope, entries] of Object.entries(source)) {
        const averaged: Record<string, number> = {};
        for (const [id, value] of Object.entries(entries)) {
            averaged[id] = Math.round(value / divisor);
        }
        result[scope] = averaged;
    }
    return result;
};

const getAdapter = (framework: Framework, variant: PerfVariant) =>
    adapters[framework]?.[variant];

const executeScenarioRun = async (
    framework: Framework,
    variant: PerfVariant,
    adapter: ScenarioAdapter,
    resolved: ReturnType<typeof withDefaults>,
    runIndex: number
) => {
    await adapter.reset();
    await settle();

    const blocks: PerfScenarioResult["blocks"] = {};
    blocks.mutateExisting = await measureBlock("mutateExisting", () =>
        adapter.mutateExisting(resolved.objectSet)
    );
    blocks.bulkMutate = await measureBlock("bulkMutate", () =>
        adapter.bulkMutate(resolved.primitives)
    );
    blocks.batchAddRemove = await measureBlock("batchAddRemove", () =>
        adapter.batchAddRemove(resolved.sets)
    );

    const totalDuration = Object.values(blocks).reduce(
        (sum, block) => sum + block.duration,
        0
    );

    const run: PerfScenarioRun = {
        runIndex,
        totalDuration,
        blocks,
    };
    return run;
};

async function runScenarioWithAdapter(
    framework: Framework,
    variant: PerfVariant,
    adapter: ScenarioAdapter,
    counts?: PerfScenarioCounts
): Promise<PerfScenarioResult> {
    const resolved = withDefaults(counts);
    const warmups = Math.max(0, resolved.warmupRuns);
    const repeats = Math.max(1, resolved.repeatRuns);

    for (let i = 0; i < warmups; i += 1) {
        await executeScenarioRun(framework, variant, adapter, resolved, i);
    }

    const runs: PerfScenarioRun[] = [];
    for (let i = 0; i < repeats; i += 1) {
        runs.push(
            await executeScenarioRun(
                framework,
                variant,
                adapter,
                resolved,
                warmups + i
            )
        );
    }

    const aggregatedBlocks: PerfScenarioResult["blocks"] = {};
    const blockSums: Record<string, PerfScenarioBlockResult> = {};

    for (const run of runs) {
        Object.entries(run.blocks).forEach(([name, block]) => {
            const accumulator = (blockSums[name] ??= {
                name,
                duration: 0,
                renderCounts: {},
                objectRenderCounts: {},
            });
            accumulator.duration += block.duration;
            accumulateNumericMap(accumulator.renderCounts, block.renderCounts);
            accumulateObjectRenderCounts(
                accumulator.objectRenderCounts,
                block.objectRenderCounts
            );
        });
    }

    Object.entries(blockSums).forEach(([name, block]) => {
        aggregatedBlocks[name] = {
            name,
            duration: block.duration / repeats,
            renderCounts: averageNumericMap(block.renderCounts, repeats),
            objectRenderCounts: averageObjectRenderCounts(
                block.objectRenderCounts,
                repeats
            ),
        };
    });

    const averageTotalDuration =
        runs.reduce((sum, run) => sum + run.totalDuration, 0) / repeats;

    const result: PerfScenarioResult = {
        framework,
        variant,
        totalDuration: averageTotalDuration,
        blocks: aggregatedBlocks,
        runCount: repeats,
        warmupCount: warmups,
        runs,
        completedAt: Date.now(),
    };

    if (typeof window !== "undefined") {
        window.perfSuite?.publishResult?.(result);
    }

    return result;
}

export function registerScenarioAdapter(
    framework: Framework,
    variant: PerfVariant,
    adapter: ScenarioAdapter
) {
    (adapters[framework] ??= {})[variant] = adapter;
    registerPerfRunners();
    return () => {
        if (adapters[framework]?.[variant] === adapter) {
            delete adapters[framework]![variant];
        }
    };
}

const createSharedStateAdapter = (): ScenarioAdapter => {
    if (typeof window !== "undefined") {
        (window as any).__adapterSharedIdentity =
            sharedState === (window as any).sharedState;
    }
    let syntheticCounter = 0;
    const generateId = () => `perf-object-${++syntheticCounter}`;
    const bumpGlobalNumericFields = () => {
        sharedState.numValue += 2;
        sharedState.hiddenValue += 2;
        sharedState.objectValue.nestedNum += 2;
        sharedState.count += 2;
        const baseArray = sharedState.arrayValue as number[];
        for (let i = 0; i < baseArray.length; i += 1) {
            baseArray[i] += 2;
        }
        const nestedArray = sharedState.objectValue.nestedArray as number[];
        for (let i = 0; i < nestedArray.length; i += 1) {
            nestedArray[i] += 2;
        }
    };
    return {
        reset() {
            resetSharedState();
        },
        mutateExisting(iterations: number) {
            const entries = Array.from(
                sharedState.objectSet.values()
            ) as TaggedObject[];
            if (!entries.length) return;
            for (let cycle = 0; cycle < iterations; cycle += 1) {
                let idx = 0;
                for (const entry of entries) {
                    entry.label = `Object ${entry["@id"]} #${cycle}-${idx}`;
                    entry.count += 2;
                    idx += 1;
                }
                bumpGlobalNumericFields();
            }
        },
        bulkMutate(iterations: number) {
            const entries = Array.from(
                sharedState.objectSet.values()
            ) as TaggedObject[];
            if (!entries.length) return;
            for (let i = 0; i < iterations; i += 1) {
                for (const entry of entries) {
                    entry.count += 2;
                }
                bumpGlobalNumericFields();
            }
        },
        batchAddRemove(iterations: number) {
            const created: string[] = [];
            for (let i = 0; i < iterations; i += 1) {
                const id = generateId();
                sharedState.objectSet.add({
                    "@id": id,
                    label: `Perf entry ${id}`,
                    count: i,
                });
                created.push(id);
            }
            for (const id of created) {
                for (const entry of sharedState.objectSet) {
                    if (entry["@id"] === id) {
                        sharedState.objectSet.delete(entry);
                        break;
                    }
                }
            }
        },
    };
};

export function registerSharedStateAdapter(framework: Framework) {
    return registerScenarioAdapter(
        framework,
        "deep",
        createSharedStateAdapter()
    );
}

export function registerPerfRunners(): boolean {
    if (typeof window === "undefined") return false;
    const suite = window.perfSuite;
    if (!suite?.registerRunner) return false;
    (Object.keys(adapters) as Framework[]).forEach((framework) => {
        const variants = adapters[framework];
        if (!variants) return;
        (Object.keys(variants) as PerfVariant[]).forEach((variant) => {
            const adapter = variants[variant];
            if (!adapter) return;
            suite.registerRunner(framework, variant, (counts) =>
                runScenarioWithAdapter(framework, variant, adapter, counts)
            );
        });
    });
    return true;
}

export async function runScenarioImmediately(
    framework: Framework,
    variant: PerfVariant,
    counts?: PerfScenarioCounts
) {
    const adapter = getAdapter(framework, variant);
    if (!adapter) {
        throw new Error(
            `No perf scenario adapter registered for ${framework}:${variant}`
        );
    }
    return runScenarioWithAdapter(framework, variant, adapter, counts);
}
