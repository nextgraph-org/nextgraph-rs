// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

/**
 * When dealing with shapes (RDF-based graph database ORMs):
 * The scope of a shape request.
 * In most cases, it is recommended to use a narrow scope for performance.
 * You can filter results by `subjects` and `graphs`. Only objects in that scope will be returned.
 *
 * @example
 * ```typescript
 * // Contains all expense objects with `@id` <s1 IRI> or <s2 IRI> and `@graph` <g1 IRI> or <g2 IRI>
 * const expenses: DeepSignalSet<Expense = useShape(ExpenseShape,
 *      {graphs: ["<graph1 IRI>", "<graph2 IRI>"],
 *       subjects: ["<subject1 IRI>", "<subject2 IRI>"]});
 * ```
 */
export type Scope = {
    /**
     * The graphs to filter for. If more than one IRI is provided, the union of all graphs is considered.
     *
     * - Set value to `["did:ng:i"]` or `[""]` for whole graph.
     * - Setting value to `[]` or leaving it `undefined`, no objects are returned.
     */
    graphs?: string[];

    /**
     * Subjects to filter for. Set to `[]` or leaving it `undefined` for no filtering.
     */
    subjects?: string[];
};

/** Convert undefined to [] and for graphs "" to "did:ng:i". If scope is string, that means {graphs: [\<scope string>], subjects: []}. */
export const normalizeScope = (scope: Scope | string | undefined = {}) => {
    if (typeof scope === "string") {
        return { graphs: [scope], subjects: [] };
    }
    // Convert "" to did:ng:i
    const graphs = (scope.graphs ?? []).map((g) => (g === "" ? "did:ng:i" : g));
    const subjects = scope.subjects ?? [];

    return { graphs, subjects };
};

/** An allowed array in the CRDT. */
export interface DiscreteArray extends Array<DiscreteType> {}

/** An allowed object in the CRDT. */
export interface DiscreteObject {
    [key: string]: DiscreteType;
}
/** An allowed type in the CRDT. */
export type DiscreteType =
    | DiscreteArray
    | DiscreteObject
    | string
    | number
    | boolean;

/**
 * The root root array for reading and modifying the CRDT as a plain object.
 */
export type DiscreteRootArray = (
    | DiscreteArray
    | string
    | number
    | boolean
    | (DiscreteObject & { readonly "@id": string })
)[];

/**
 * The root object for reading and modifying the CRDT as a plain object.
 */
export interface DiscreteRootObject {
    [key: string]:
        | DiscreteObject
        | string
        | number
        | boolean
        | DiscreteRootArray;
}

/**
 * The supported discrete (JSON) CRDTs.
 * Automerge and YMap require objects as roots.
 * YArray requires an array as root.
 */
export type DiscreteCrdt = "YMap" | "YArray" | "Automerge";
