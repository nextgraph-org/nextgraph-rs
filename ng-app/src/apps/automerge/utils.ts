// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import { next as A  } from "@automerge/automerge/slim";

const UINT = Symbol.for("_am_uint")
const INT = Symbol.for("_am_int")
const F64 = Symbol.for("_am_f64")
const COUNTER = Symbol.for("_am_counter")
const TEXT = Symbol.for("_am_text")

export function find_type(value) {
    switch (typeof value) {
        case "object":
            if (value == null) {
                return "null"
            } else if (value[UINT]) {
                return "uint"
            } else if (value[INT]) {
                return "number"
            } else if (value[F64]) {
                return "number"
            } else if (value[COUNTER]) {
                return "counter"
            } else if (value instanceof Date) {
                return "timestamp"
            } else if (value instanceof A.RawString) {
                return "str"
            } else if (value instanceof Text) {
                return "text"
            } else if (value instanceof Uint8Array) {
                return "bytes"
            } else if (value instanceof Array) {
                return "list"
            } else if (Object.getPrototypeOf(value) === Object.getPrototypeOf({})) {
                return "map"
            }
        case "boolean":
            return "boolean"
        case "number":
            if (Number.isInteger(value)) {
                return "number"
            } else {
                return "number"
            }
        case "string":
            return "text"
    }
}

export const new_prop_types = [
    {value:'text',name:"text"},
    {value:'number',name:"number"},
    {value:'counter',name:"counter"},
    {value:'boolean',name:"boolean"},
    {value:'null',name:"null"},
    {value:'timestamp',name:"timestamp"},
    {value:'map',name:"map"},
    {value:'list',name:"list"},
    {value:'bytes',name:"bytes"}
];

export function new_value(new_prop_type_selected) {
    switch (new_prop_type_selected) {
        case 'text': return '';
        case 'map': return {};
        case 'list': return [];
        case 'counter': return new A.Counter();
        case 'number': return 0;
        case 'boolean': return false;
        case 'null': return null;
        case 'timestamp': return new Date();
        case 'bytes': return new Uint8Array(0);
    }
}