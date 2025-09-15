import React from "react";
import { useShape } from "@nextgraph-monorepo/ng-signals/react";
import flattenObject from "../utils/flattenObject";
import { TestObjectShapeType } from "../../shapes/ldo/testShape.shapeTypes";

// Hack to get mock backend started
import { mockTestObject } from "../../ng-mock/wasm-land/shapeHandler";

export function HelloWorldReact() {
    const state = useShape(TestObjectShapeType);

    // @ts-expect-error
    window.reactState = state;

    if (!state) return <>Loading state</>;

    // Create a table from the state object: One column for keys, one for values, one with an input to change the value.

    return (
        <div>
            <p>Rendered in React</p>

            <button
                onClick={() => {
                    state.boolValue = !state.boolValue;
                    state.numValue += 2;
                }}
            >
                click me to change multiple props
            </button>

            <table border={1} cellPadding={5}>
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Edit</th>
                    </tr>
                </thead>
                <tbody>
                    {(() => {
                        const setNestedValue = (
                            obj: any,
                            path: string,
                            value: any
                        ) => {
                            const keys = path.split(".");
                            let current = obj;

                            for (let i = 0; i < keys.length - 1; i++) {
                                current = current[keys[i]];
                            }

                            current[keys[keys.length - 1]] = value;
                        };

                        const getNestedValue = (obj: any, path: string) => {
                            return path
                                .split(".")
                                .reduce((current, key) => current[key], obj);
                        };

                        return flattenObject(state).map(([key, value]) => (
                            <tr key={key}>
                                <td>{key}</td>
                                <td>
                                    {value instanceof Set
                                        ? Array.from(value).join(", ")
                                        : Array.isArray(value)
                                          ? `[${value.join(", ")}]`
                                          : JSON.stringify(value)}
                                </td>
                                <td>
                                    {typeof value === "string" ? (
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => {
                                                setNestedValue(
                                                    state,
                                                    key,
                                                    e.target.value
                                                );
                                            }}
                                        />
                                    ) : typeof value === "number" ? (
                                        <input
                                            type="number"
                                            value={value}
                                            onChange={(e) => {
                                                setNestedValue(
                                                    state,
                                                    key,
                                                    Number(e.target.value)
                                                );
                                            }}
                                        />
                                    ) : typeof value === "boolean" ? (
                                        <input
                                            type="checkbox"
                                            checked={value}
                                            onChange={(e) => {
                                                setNestedValue(
                                                    state,
                                                    key,
                                                    e.target.checked
                                                );
                                            }}
                                        />
                                    ) : Array.isArray(value) ? (
                                        <div>
                                            <button
                                                onClick={() => {
                                                    const currentArray =
                                                        getNestedValue(
                                                            state,
                                                            key
                                                        );
                                                    setNestedValue(state, key, [
                                                        ...currentArray,
                                                        currentArray.length + 1,
                                                    ]);
                                                }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const currentArray =
                                                        getNestedValue(
                                                            state,
                                                            key
                                                        );
                                                    if (
                                                        currentArray.length > 0
                                                    ) {
                                                        setNestedValue(
                                                            state,
                                                            key,
                                                            currentArray.slice(
                                                                0,
                                                                -1
                                                            )
                                                        );
                                                    }
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : value instanceof Set ? (
                                        <div>
                                            <button
                                                onClick={() => {
                                                    const currentSet =
                                                        getNestedValue(
                                                            state,
                                                            key
                                                        );
                                                    currentSet.add(
                                                        `item${currentSet.size + 1}`
                                                    );
                                                }}
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const currentSet =
                                                        getNestedValue(
                                                            state,
                                                            key
                                                        );
                                                    const lastItem =
                                                        Array.from(
                                                            currentSet
                                                        ).pop();
                                                    if (lastItem) {
                                                        currentSet.delete(
                                                            lastItem
                                                        );
                                                    }
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        "N/A"
                                    )}
                                </td>
                            </tr>
                        ));
                    })()}
                </tbody>
            </table>
        </div>
    );
}
