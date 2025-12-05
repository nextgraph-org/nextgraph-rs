import React, { useEffect, useRef } from "react";
import useDeepSignal from "../../../../../hooks/react/useDeepSignal";
import { sharedState } from "../../../utils/state";
import { recordRender, recordObjectRender } from "../../../utils/renderMetrics";
import type { TaggedObject } from "../../../utils/mockData";

const ReactPanel: React.FC = () => {
    const state = useDeepSignal(sharedState);
    const renderCount = useRef(0);
    renderCount.current += 1;

    useEffect(() => {
        recordRender("react", renderCount.current);
    });

    const objectEntries = Array.from(
        state.objectSet.values()
    ) as TaggedObject[];

    const ObjectRow: React.FC<{ entry: TaggedObject }> = ({ entry }) => {
        const rowRenderCount = useRef(0);
        rowRenderCount.current += 1;
        useEffect(() => {
            recordObjectRender("react", entry["@id"], rowRenderCount.current);
        });
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
                    onChange={(event) => {
                        entry.label = event.target.value;
                    }}
                />
                <input
                    type="number"
                    data-role="count-input"
                    value={entry.count}
                    onChange={(event) => {
                        entry.count = Number(event.target.value || 0);
                    }}
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

    const renderPrimitiveField = (
        label: string,
        options:
            | { type: "text"; value: string; onChange: (next: string) => void }
            | {
                  type: "number";
                  value: number;
                  onChange: (next: number) => void;
              }
            | {
                  type: "boolean";
                  value: boolean;
                  onChange: (next: boolean) => void;
              }
    ) => {
        if (options.type === "boolean") {
            return (
                <fieldset className="field" data-field={label}>
                    <legend>{label}</legend>
                    <input
                        type="checkbox"
                        data-role="editor"
                        checked={options.value}
                        onChange={(event) =>
                            options.onChange(event.target.checked)
                        }
                    />
                    <span data-role="value">{String(options.value)}</span>
                </fieldset>
            );
        }
        if (options.type === "number") {
            return (
                <fieldset className="field" data-field={label}>
                    <legend>{label}</legend>
                    <input
                        type="number"
                        data-role="editor"
                        value={options.value}
                        onChange={(event) =>
                            options.onChange(Number(event.target.value || 0))
                        }
                    />
                    <span data-role="value">{options.value}</span>
                </fieldset>
            );
        }
        return (
            <fieldset className="field" data-field={label}>
                <legend>{label}</legend>
                <input
                    type="text"
                    data-role="editor"
                    value={options.value}
                    onChange={(event) => options.onChange(event.target.value)}
                />
                <span data-role="value">{options.value}</span>
            </fieldset>
        );
    };

    return (
        <section>
            <h2 className="title">react</h2>
            <div
                className="render-meta"
                data-render-count={renderCount.current}
            >
                Render #{renderCount.current}
            </div>
            <div className="field-grid">
                {renderPrimitiveField("type", {
                    type: "text",
                    value: state.type,
                    onChange: (next) => {
                        state.type = next;
                    },
                })}
                {renderPrimitiveField("stringValue", {
                    type: "text",
                    value: state.stringValue,
                    onChange: (next) => {
                        state.stringValue = next;
                    },
                })}
                {renderPrimitiveField("numValue", {
                    type: "number",
                    value: state.numValue,
                    onChange: (next) => {
                        state.numValue = next;
                    },
                })}
                {renderPrimitiveField("boolValue", {
                    type: "boolean",
                    value: state.boolValue,
                    onChange: (next) => {
                        state.boolValue = next;
                    },
                })}
                {renderPrimitiveField("objectValue.nestedString", {
                    type: "text",
                    value: state.objectValue.nestedString,
                    onChange: (next) => {
                        state.objectValue.nestedString = next;
                    },
                })}
                {renderPrimitiveField("objectValue.nestedNum", {
                    type: "number",
                    value: state.objectValue.nestedNum,
                    onChange: (next) => {
                        state.objectValue.nestedNum = next;
                    },
                })}
            </div>

            <fieldset className="field" data-field="arrayValue">
                <legend>arrayValue</legend>
                <div className="stack">
                    <span data-role="array-length">
                        Length: {state.arrayValue.length}
                    </span>
                    <div>
                        <button
                            type="button"
                            data-action="push"
                            onClick={() => {
                                state.arrayValue.push(
                                    state.arrayValue.length + 1
                                );
                            }}
                        >
                            Add item
                        </button>
                        <button
                            type="button"
                            data-action="pop"
                            onClick={() => {
                                if (state.arrayValue.length)
                                    state.arrayValue.pop();
                            }}
                        >
                            Remove item
                        </button>
                    </div>
                    <ul className="value-list">
                        {state.arrayValue.map((value, index) => (
                            <li key={`array-${index}`}>{value}</li>
                        ))}
                    </ul>
                </div>
            </fieldset>

            <fieldset className="field" data-field="objectValue.nestedArray">
                <legend>objectValue.nestedArray</legend>
                <div className="stack">
                    <span data-role="array-length">
                        Length: {state.objectValue.nestedArray.length}
                    </span>
                    <div>
                        <button
                            type="button"
                            data-action="push"
                            onClick={() => {
                                state.objectValue.nestedArray.push(
                                    state.objectValue.nestedArray.length + 10
                                );
                            }}
                        >
                            Add nested item
                        </button>
                        <button
                            type="button"
                            data-action="pop"
                            onClick={() => {
                                if (state.objectValue.nestedArray.length) {
                                    state.objectValue.nestedArray.pop();
                                }
                            }}
                        >
                            Remove nested item
                        </button>
                    </div>
                    <ul className="value-list">
                        {state.objectValue.nestedArray.map((value, index) => (
                            <li key={`nested-${index}`}>{value}</li>
                        ))}
                    </ul>
                </div>
            </fieldset>

            <fieldset className="field" data-field="setValue">
                <legend>setValue</legend>
                <div className="stack">
                    <span data-role="set-size">
                        Size: {state.setValue.size}
                    </span>
                    <div>
                        <button
                            type="button"
                            data-action="add"
                            onClick={() => {
                                state.setValue.add(
                                    `item${state.setValue.size + 1}`
                                );
                            }}
                        >
                            Add entry
                        </button>
                        <button
                            type="button"
                            data-action="remove"
                            onClick={() => {
                                const last = Array.from(
                                    state.setValue.values()
                                ).pop();
                                if (last) state.setValue.delete(last);
                            }}
                        >
                            Remove entry
                        </button>
                    </div>
                    <ul className="value-list">
                        {Array.from(state.setValue.values()).map((entry) => (
                            <li key={`set-${entry}`}>{entry}</li>
                        ))}
                    </ul>
                </div>
            </fieldset>

            <fieldset className="field" data-field="objectSet">
                <legend>objectSet entries</legend>
                {objectEntries.map((entry) => (
                    <ObjectRow entry={entry} key={entry["@id"]} />
                ))}
            </fieldset>
        </section>
    );
};

export default ReactPanel;
