import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { TaggedObject } from "../../../../../utils/mockData";
import { cloneDefaultObjectSet } from "../../../../../utils/mockData";
import {
    recordObjectRender,
    recordRender,
} from "../../../../../utils/renderMetrics";
import {
    registerScenarioAdapter,
    runScenarioImmediately,
} from "../../../../../utils/perfScenarios";

type ObjectRowProps = {
    entry: TaggedObject;
    updateEntries: (mutate: (draft: TaggedObject[]) => void) => void;
};

const ObjectRow: React.FC<ObjectRowProps> = ({ entry, updateEntries }) => {
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
                data-role="label"
                value={entry.label}
                onChange={(event) =>
                    updateEntries((draft) => {
                        const target = draft.find(
                            (item) => item["@id"] === entry["@id"]
                        );
                        if (target) target.label = event.target.value;
                    })
                }
            />
            <input
                type="number"
                data-role="count-input"
                value={entry.count}
                onChange={(event) =>
                    updateEntries((draft) => {
                        const target = draft.find(
                            (item) => item["@id"] === entry["@id"]
                        );
                        if (target)
                            target.count = Number(event.target.value || 0);
                    })
                }
            />
            <span data-role="count">{entry.count}</span>
            <button
                type="button"
                data-action="increment"
                onClick={() =>
                    updateEntries((draft) => {
                        const target = draft.find(
                            (item) => item["@id"] === entry["@id"]
                        );
                        if (target) target.count += 1;
                    })
                }
            >
                +1
            </button>
        </div>
    );
};

const cloneInitialEntries = (): TaggedObject[] => cloneDefaultObjectSet();

const ReactPerfNative: React.FC = () => {
    const [objectSet, setObjectSet] = useState<Set<TaggedObject>>(
        () => new Set(cloneInitialEntries())
    );
    const renderCount = useRef(0);
    const counterRef = useRef(0);
    const [busy, setBusy] = useState(false);
    renderCount.current += 1;

    useEffect(() => {
        recordRender("react", renderCount.current);
    });

    const entries = useMemo(() => Array.from(objectSet.values()), [objectSet]);

    const updateEntries = useCallback(
        (mutate: (draft: TaggedObject[]) => void) => {
            setObjectSet((prev) => {
                const draft = Array.from(prev.values()).map((entry) => ({
                    ...entry,
                }));
                mutate(draft);
                return new Set(draft);
            });
        },
        []
    );

    useEffect(() => {
        const dispose = registerScenarioAdapter("react", "native", {
            reset: () => {
                setObjectSet(new Set(cloneInitialEntries()));
            },
            mutateExisting: (iterations: number) => {
                updateEntries((draft) => {
                    if (!draft.length) return;
                    for (let cycle = 0; cycle < iterations; cycle += 1) {
                        draft.forEach((entry, index) => {
                            entry.label = `POJO ${entry["@id"]} #${cycle}-${index}`;
                            entry.count += 2;
                        });
                    }
                });
            },
            bulkMutate: (iterations: number) => {
                updateEntries((draft) => {
                    if (!draft.length) return;
                    for (let i = 0; i < iterations; i += 1) {
                        for (const entry of draft) {
                            entry.count += 2;
                        }
                    }
                });
            },
            batchAddRemove: (iterations: number) => {
                const additions: TaggedObject[] = [];
                for (let i = 0; i < iterations; i += 1) {
                    counterRef.current += 1;
                    const id = `react-native-${counterRef.current}`;
                    additions.push({
                        "@id": id,
                        label: `Native ${id}`,
                        count: i,
                    });
                }
                updateEntries((draft) => {
                    draft.push(...additions);
                });
                updateEntries((draft) => {
                    const start = Math.max(draft.length - additions.length, 0);
                    draft.splice(start, additions.length);
                });
            },
        });
        return () => dispose();
    }, [updateEntries]);

    const handleAddEntry = () => {
        counterRef.current += 1;
        const id = `react-native-${counterRef.current}`;
        updateEntries((draft) => {
            draft.push({ "@id": id, label: `Native ${id}`, count: 0 });
        });
    };

    const handleRemoveEntry = () => {
        updateEntries((draft) => {
            draft.pop();
        });
    };

    const handleRunScenario = async () => {
        try {
            setBusy(true);
            await runScenarioImmediately("react", "native");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="perf-panel react" data-field="objectSet">
            <h2 className="title">react (native state)</h2>
            <div
                className="render-meta"
                data-render-count={renderCount.current}
            >
                Render #{renderCount.current}
            </div>
            <div className="field" data-field="objectSet">
                <legend>objectSet entries</legend>
                <div className="set-controls">
                    <span data-role="set-size">Size: {objectSet.size}</span>
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
                    {entries.map((entry) => (
                        <ObjectRow
                            key={entry["@id"]}
                            entry={entry}
                            updateEntries={updateEntries}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReactPerfNative;
