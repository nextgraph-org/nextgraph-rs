import { deepSignal } from "../../../deepSignal.js";
import { buildInitialState, type TestState } from "./mockData.js";
import { getByPath, setByPath } from "./paths.js";

declare global {
    interface Window {
        sharedState?: TestState;
        testHarness?: {
            resetState: () => void;
            noopMutation: (path: string) => void;
            getRenderCounts: () => Record<string, number>;
            ready: boolean;
        };
        perfSuite?: {
            registerRunner: (
                framework: string,
                variant: string,
                runner: (
                    counts: PerfScenarioCounts
                ) => Promise<PerfScenarioResult>
            ) => void;
            runScenario?: (
                framework: string,
                variant: string,
                counts: PerfScenarioCounts
            ) => Promise<PerfScenarioResult | undefined>;
            runners?: Record<
                string,
                Record<
                    string,
                    (counts: PerfScenarioCounts) => Promise<PerfScenarioResult>
                >
            >;
            latestResults?: Record<string, Record<string, PerfScenarioResult>>;
            listeners?: Set<(result: PerfScenarioResult) => void>;
            publishResult?: (result: PerfScenarioResult) => void;
            subscribe?: (
                listener: (result: PerfScenarioResult) => void
            ) => () => void;
        };
        subscribeSharedState?: (listener: () => void) => () => void;
        sharedStateVersion?: number;
    }
}

export type PerfScenarioCounts = {
    primitives?: number;
    nested?: number;
    arrays?: number;
    sets?: number;
    objectSet?: number;
    warmupRuns?: number;
    repeatRuns?: number;
};

export type PerfVariant = "deep" | "native";

export type PerfScenarioBlockResult = {
    name: string;
    duration: number;
    renderCounts: Record<string, number>;
    objectRenderCounts: Record<string, Record<string, number>>;
};

export type PerfScenarioRun = {
    runIndex: number;
    totalDuration: number;
    blocks: Record<string, PerfScenarioBlockResult>;
};

export type PerfScenarioResult = {
    framework: string;
    variant: PerfVariant;
    totalDuration: number;
    blocks: Record<string, PerfScenarioBlockResult>;
    runCount: number;
    warmupCount: number;
    runs?: PerfScenarioRun[];
    completedAt?: number;
};

const createState = () => deepSignal<TestState>(buildInitialState());
export const sharedState = createState();

type SharedStateListener = () => void;
const sharedStateListeners = new Set<SharedStateListener>();

const notifySharedStateListeners = () => {
    if (!sharedStateListeners.size) return;
    sharedStateListeners.forEach((listener) => {
        try {
            listener();
        } catch (error) {
            console.error("sharedState listener failed", error);
        }
    });
};

const now = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();
const microtask = () => new Promise((resolve) => setTimeout(resolve, 0));

export function resetSharedState() {
    const next = buildInitialState();
    for (const key of Object.keys(sharedState as any)) {
        delete (sharedState as any)[key];
    }
    Object.assign(sharedState as any, next);
}

const measure = async (mutator: () => void, settle = true) => {
    const start = now();
    mutator();
    if (settle) await microtask();
    return now() - start;
};

if (typeof window !== "undefined") {
    window.sharedState = sharedState as any;
    const harness = (window.testHarness ??= {
        resetState: () => undefined,
        noopMutation: () => undefined,
        getRenderCounts: () =>
            (window.renderCounts ?? {}) as Record<string, number>,
        ready: false,
    });
    harness.resetState = () => resetSharedState();
    harness.noopMutation = (path: string) => {
        const current = getByPath(sharedState, path);
        setByPath(sharedState, path, current);
    };
    harness.ready = true;

    const perfSuite = (window.perfSuite ??= {
        runners: {} as Record<
            string,
            Record<
                string,
                (counts: PerfScenarioCounts) => Promise<PerfScenarioResult>
            >
        >,
        latestResults: {} as Record<string, Record<string, PerfScenarioResult>>,
        listeners: new Set<(result: PerfScenarioResult) => void>(),
        registerRunner(
            framework: string,
            variant: string,
            runner: (counts: PerfScenarioCounts) => Promise<PerfScenarioResult>
        ) {
            const runnerMap = (this.runners ??= {});
            const frameworkRunners = (runnerMap[framework] ??= {});
            frameworkRunners[variant] = runner;
        },
        publishResult(result: PerfScenarioResult) {
            const latest = (this.latestResults ??= {});
            (latest[result.framework] ??= {})[result.variant] = result;
            this.listeners?.forEach((listener) => listener(result));
        },
        subscribe(listener: (result: PerfScenarioResult) => void) {
            this.listeners?.add(listener);
            return () => this.listeners?.delete(listener);
        },
        async runScenario(
            framework: string,
            variant: string,
            counts: PerfScenarioCounts
        ) {
            const runnerMap = (this.runners ??= {});
            const runner = runnerMap[framework]?.[variant];
            if (!runner) return undefined;
            return runner(counts);
        },
    });
}
