import React, { useEffect, useRef, useState } from "react";
import useDeepSignal from "../../../../../../../hooks/react/useDeepSignal";
import { sharedState } from "../../../../../utils/state";
import type { TaggedObject } from "../../../../../utils/mockData";
import {
    recordObjectRender,
    recordRender,
} from "../../../../../utils/renderMetrics";
import {
    registerSharedStateAdapter,
    runScenarioImmediately,
} from "../../../../../utils/perfScenarios";

type ObjectRowProps = {
    entry: TaggedObject;
};

const ObjectRow: React.FC<ObjectRowProps> = ({ entry }) => {
    const rowRenderCount = useRef(0);
    rowRenderCount.current += 1;
    recordObjectRender("react", entry["@id"], rowRenderCount.current);
    return (
        <div
            className="object-row"
            data-entry-id={entry["@id"]}
            data-render-count={rowRenderCount.current}
        >
            <span className="object-id">{entry["@id"]}</span>
            <input
                type="text"
                value={entry.label}
                data-role="label"
                onChange={(event) => (entry.label = event.target.value)}
            />
            <input
                type="number"
                value={entry.count}
                data-role="count-input"
                onChange={(event) =>
                    (entry.count = Number(event.target.value || 0))
                }
            />
            <span data-role="count">{entry.count}</span>
            <button
                type="button"
                data-action="increment"
                onClick={() => {
                    entry.count += 1;
                }}
            >
                +1
            </button>
        </div>
    );
};

const ReactPerfDeep: React.FC = () => {
    const state = useDeepSignal(sharedState);
    const renderCount = useRef(0);
    const [busy, setBusy] = useState(false);
    renderCount.current += 1;

    useEffect(() => {
        const dispose = registerSharedStateAdapter("react");
        return () => dispose();
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).__reactSharedIdentity = state === sharedState;
            (window as any).__reactSharedGlobal =
                state === (window as any).sharedState;
        }
    }, []);

    useEffect(() => {
        recordRender("react", renderCount.current);
    });

    const handleAddEntry = () => {
        const id = `react-deep-${Math.random().toString(36).slice(2, 8)}`;
        state.objectSet.add({
            "@id": id,
            label: `react ${id}`,
            count: 0,
        });
    };

    const handleRemoveEntry = () => {
        const last = Array.from(state.objectSet.values()).pop();
        if (!last) return;
        state.objectSet.delete(last);
    };

    const handleRunScenario = async () => {
        try {
            setBusy(true);
            await runScenarioImmediately("react", "deep");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="perf-panel react" data-field="objectSet">
            <h2 className="title">react (deepSignal)</h2>
            <div
                className="render-meta"
                data-render-count={renderCount.current}
            >
                Render #{renderCount.current}
            </div>
            <div className="field" data-field="objectSet">
                <legend>objectSet entries</legend>
                <div className="set-controls">
                    <span data-role="set-size">
                        Size: {state.objectSet.size}
                    </span>
                    <div>
                        <button type="button" onClick={handleAddEntry}>
                            Add entry
                        </button>
                        <button type="button" onClick={handleRemoveEntry}>
                            Remove entry
                        </button>
                        <button
                            type="button"
                            data-action="run-scenario"
                            onClick={handleRunScenario}
                            disabled={busy}
                        >
                            {busy ? "Running…" : "Run perf scenario"}
                        </button>
                    </div>
                </div>
                <div className="object-set">
                    {state.objectSet.values().map((entry) => (
                        <ObjectRow key={entry["@id"]} entry={entry} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReactPerfDeep;
