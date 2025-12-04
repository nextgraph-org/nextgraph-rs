// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import React, { useEffect, useState } from "react";
import { useShape } from "@ng-org/signals/react";
import flattenObject from "../utils/flattenObject";
import { TestObjectShapeType } from "../../shapes/orm/testShape.shapeTypes";
import { BasicShapeType } from "../../shapes/orm/basic.shapeTypes";
import type { ShapeType } from "@ng-org/shex-orm";
import type { Basic } from "../../shapes/orm/basic.typings";
import { deepSignal, watch } from "@ng-org/alien-deepsignals";

export function HelloWorldReact() {
    const state = useShape(TestObjectShapeType);
    const objects = [...(state || [])];

    // @ts-expect-error
    window.reactState = state;

    // Create a table from the state object: One column for keys, one for values, one with an input to change the value.

    return (
        <div>
            <p>Rendered in React</p>
            <button
                onClick={async () => {
                    const storeId = "did:ng:" + window.session.private_store_id;
                    const sessionId = window.session.session_id;

                    const docId1 = await window.ng.doc_create(
                        sessionId,
                        "Graph",
                        "data:graph",
                        "store"
                    );
                    const docId2 = await window.ng.doc_create(
                        sessionId,
                        "Graph",
                        "data:graph",
                        "store"
                    );
                    const docId3 = await window.ng.doc_create(
                        sessionId,
                        "Graph",
                        "data:graph",
                        "store"
                    );

                    // Insert first test object with its nested objects
                    window.ng.sparql_update(
                        sessionId,
                        `
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
}
`,
                        docId1
                    );

                    // Insert second test object with its nested objects
                    window.ng.sparql_update(
                        sessionId,
                        `
PREFIX ex: <http://example.org/>
INSERT DATA {
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
}
`,
                        docId2
                    );

                    // Insert basic objects
                    window.ng.sparql_update(
                        sessionId,
                        `
PREFIX ex: <http://example.org/>
INSERT DATA {
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
                        `,
                        docId3
                    );
                }}
            >
                Add example data
            </button>
            <button
                onClick={() => {
                    window.ng.sparql_update(
                        window.session.session_id,
                        `DELETE WHERE { GRAPH ?g { ?s ?p ?o .}};`,
                        "did:ng:" + window.session.private_store_id
                    );
                }}
            >
                Remove all data
            </button>

            {!state ? (
                <div>Loading...</div>
            ) : (
                <div>
                    {objects.map((ormObj) => (
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
                                        targetObj: any,
                                        lastKey: string,
                                        value: any
                                    ) => {
                                        // targetObj is the direct parent object containing the property
                                        // lastKey is the property name to set
                                        targetObj[lastKey] = value;
                                    };

                                    return flattenObject(ormObj).map(
                                        ([key, value, lastKey, parentObj]) => (
                                            <tr key={key}>
                                                <td>{key}</td>
                                                <td>
                                                    {value instanceof Set
                                                        ? Array.from(
                                                              value
                                                          ).join(", ")
                                                        : Array.isArray(value)
                                                          ? `[${value.join(", ")}]`
                                                          : JSON.stringify(
                                                                value
                                                            )}
                                                </td>
                                                <td>
                                                    {typeof value ===
                                                    "string" ? (
                                                        <input
                                                            type="text"
                                                            value={value}
                                                            onChange={(e) => {
                                                                setNestedValue(
                                                                    parentObj,
                                                                    lastKey,
                                                                    e.target
                                                                        .value
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
                                                                    parentObj,
                                                                    lastKey,
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
                                                                    parentObj,
                                                                    lastKey,
                                                                    e.target
                                                                        .checked
                                                                );
                                                            }}
                                                        />
                                                    ) : Array.isArray(value) ? (
                                                        <div>
                                                            <button
                                                                onClick={() => {
                                                                    setNestedValue(
                                                                        parentObj,
                                                                        lastKey,
                                                                        [
                                                                            ...value,
                                                                            value.length +
                                                                                1,
                                                                        ]
                                                                    );
                                                                }}
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (
                                                                        value.length >
                                                                        0
                                                                    ) {
                                                                        setNestedValue(
                                                                            parentObj,
                                                                            lastKey,
                                                                            value.slice(
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
                                                                    value.add(
                                                                        `item${value.size + 1}`
                                                                    );
                                                                }}
                                                            >
                                                                Add
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    // Get an item from the set and then remove it.
                                                                    const last =
                                                                        Array.from(
                                                                            value
                                                                        ).pop();
                                                                    if (
                                                                        last !==
                                                                        undefined
                                                                    ) {
                                                                        value.delete(
                                                                            last
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
            )}
        </div>
    );
}
