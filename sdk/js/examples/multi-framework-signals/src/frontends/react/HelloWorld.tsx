import React from "react";
import { useShape } from "@ng-org/signals/react";
import flattenObject from "../utils/flattenObject";
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";
import { BasicShapeType } from "../../shapes/orm/basic.shapeTypes";
import type { ShapeType } from "@ng-org/shex-orm";
import type { Basic } from "../../shapes/orm/basic.typings";

const sparqlExampleData = `
PREFIX ex: <http://example.org/>
INSERT DATA {
    <urn:test:obj1> a ex:TestObject ;
      ex:stringValue "hello world" ;
      ex:numValue 42 ;
      ex:boolValue true ;
      ex:arrayValue 1,2,3 ;
      ex:objectValue <urn:test:id3> ;
      ex:anotherObject <urn:test:id1>, <urn:test:id2> ;
      ex:numOrStr "either" ;
      ex:lit1Or2 "lit1" ;
      ex:unrelated "some value" ;
      ex:anotherUnrelated 4242 .

    <urn:test:id3>
        ex:nestedString "nested" ;
        ex:nestedNum 7 ;
        ex:nestedArray 5,6 .

    <urn:test:id1>
        ex:prop1 "one" ;
        ex:prop2 1 .

    <urn:test:id2>
        ex:prop1 "two" ;
        ex:prop2 2 .

    <urn:test:obj2> a ex:TestObject ;
      ex:stringValue "hello world #2" ;
      ex:numValue 422 ;
      ex:boolValue false ;
      ex:arrayValue 4,5,6 ;
      ex:objectValue <urn:test:id6> ;
      ex:anotherObject <urn:test:id4>, <urn:test:id5> ;
      ex:numOrStr 4 ;
      ex:lit1Or2 "lit2" ;
      ex:unrelated "some value2" ;
      ex:anotherUnrelated 42422 .

    <urn:test:id6>
        ex:nestedString "nested2" ;
        ex:nestedNum 72 ;
        ex:nestedArray 7,8,9 .

    <urn:test:id4>
        ex:prop1 "one2" ;
        ex:prop2 12 .

    <urn:test:id5>
        ex:prop1 "two2" ;
        ex:prop2 22 .


    <urn:basicObject4>
        a <http://example.org/Basic> ;
        ex:basicString "string of object 1" .
    <urn:basicObject5>
        a <http://example.org/Basic> ;
        ex:basicString "string of object 2" .

}
        `;

export function HelloWorldReact() {
    const state = useShape(BasicShapeType);

    // @ts-expect-error
    window.reactState = state;
    console.log("react state", state);

    if (!state) return <div>Loading...</div>;
    // Create a table from the state object: One column for keys, one for values, one with an input to change the value.

    return (
        <div>
            <p>Rendered in React</p>

            <button
                onClick={() => {
                    window.ng.sparql_update(
                        window.session.session_id,
                        sparqlExampleData,
                        "did:ng:" + window.session.private_store_id
                    );
                }}
            >
                Add example data
            </button>

            <div>
                {state.values()?.map((ormObj) => (
                    <table border={1} cellPadding={5} key={ormObj["@id"]}>
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

                                const getNestedValue = (
                                    obj: any,
                                    path: string
                                ) => {
                                    return path
                                        .split(".")
                                        .reduce(
                                            (current, key) => current[key],
                                            obj
                                        );
                                };

                                return flattenObject(ormObj).map(
                                    ([key, value]) => (
                                        <tr key={key}>
                                            <td>{key}</td>
                                            <td>
                                                {value instanceof Set
                                                    ? Array.from(value).join(
                                                          ", "
                                                      )
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
                                                ) : typeof value ===
                                                  "number" ? (
                                                    <input
                                                        type="number"
                                                        value={value}
                                                        onChange={(e) => {
                                                            setNestedValue(
                                                                state,
                                                                key,
                                                                Number(
                                                                    e.target
                                                                        .value
                                                                )
                                                            );
                                                        }}
                                                    />
                                                ) : typeof value ===
                                                  "boolean" ? (
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
                                                                setNestedValue(
                                                                    state,
                                                                    key,
                                                                    [
                                                                        ...currentArray,
                                                                        currentArray.length +
                                                                            1,
                                                                    ]
                                                                );
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
                                                                    currentArray.length >
                                                                    0
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
                                    )
                                );
                            })()}
                        </tbody>
                    </table>
                ))}
            </div>
        </div>
    );
}
