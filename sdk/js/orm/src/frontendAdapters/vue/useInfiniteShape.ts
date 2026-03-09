// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { normalizeScope, type Scope } from "../../types.ts";
import { useDeepSignal } from "@ng-org/alien-deepsignals/vue";
import { onBeforeUnmount } from "vue";
import type { BaseType, ShapeType } from "@ng-org/shex-orm";
import { OrmSubscription } from "../../connector/ormSubscriptionHandler.ts";
import { DeepSignalSet } from "@ng-org/alien-deepsignals";
import { readOnlySet } from "../utils.ts";

const escapeSparqlString = (lit: string): string =>
    lit
        .replaceAll("\\", "\\\\")
        .replaceAll("\t", "\\t")
        .replaceAll("\n", "\\n")
        .replaceAll("\r", "\\r")
        .replaceAll("\b", "\\b")
        .replaceAll("\f", "\\f")
        .replaceAll('"', '\\"')
        .replaceAll("'", "\\'");

const isEscapedSparqlIri = (iri: string) =>
    /^[^<>\{\}\|\^`\\\x00-\x20]*$/.test(iri);

type SparqlRaw = { __rawSparql: string };

const sparqlRaw = (value: string): SparqlRaw => ({ __rawSparql: value });

const sparqlIri = (iri: string): SparqlRaw => {
    if (!isEscapedSparqlIri(iri)) {
        throw new Error(`Invalid SPARQL IRI: ${iri}`);
    }
    return sparqlRaw(`<${iri}>`);
};

export const sparql = (
    strings: TemplateStringsArray,
    ...values: Array<string | number | boolean | null | undefined | SparqlRaw>
): string => {
    let out = strings[0] ?? "";

    for (let index = 0; index < values.length; index++) {
        const value = values[index];

        if (value === null || value === undefined) {
            out += "UNDEF";
        } else if (typeof value === "number" || typeof value === "boolean") {
            out += String(value);
        } else if (typeof value === "string") {
            out += `"${escapeSparqlString(value)}"`;
        } else {
            out += value.__rawSparql;
        }

        out += strings[index + 1] ?? "";
    }

    return out;
};

export const makeSparqlQuery = (
    type: string,
    pageSize: number,
    offset: number,
    orderBy: string | undefined
) => {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
        throw new Error(`pageSize must be a positive integer, got ${pageSize}`);
    }
    if (!Number.isInteger(offset) || offset < 0) {
        throw new Error(`offset must be a non-negative integer, got ${offset}`);
    }

    const orderByClause =
        orderBy === undefined
            ? ""
            : sparql`
                OPTIONAL { ?id ${sparqlIri(orderBy)} ?orderByValue . }
              ORDER BY ?orderByValue`;

    return sparql`
      SELECT DISTINCT ?id
      WHERE {
        ?id a ${sparqlIri(type)} .
        ${sparqlRaw(orderByClause)}
      }
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;
};

// Filters? How?
// - how does it work in other frameworks like graphql?
// - what about ranges etc?
// - filter-shapes (small shapes only with properties to filter by)
//   - filter-shapes are on the dataset
// Non-reactive (to save memory)

// - three versions: non-reactive, reactive with sparql, filter-shapes

// ranges?

export function useInfiniteShape<T extends BaseType>({
    shape,
    scope,
    enabled,
    orderByPred,
    desiredPageSize,
    // select?
}: {
    shape: ShapeType<T>;
    scope: Scope | string | undefined;
    orderByPred: string;
    enabled: boolean;
    desiredPageSize: number; // Not always fulfilled
}): {
    fetchNextPage: () => Promise<void>;
    data: Set<T>[];
    promise: Promise<Set<T>[]>;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
} {
    if (scope === undefined) {
        return useDeepSignal(readOnlySet) as DeepSignalSet<T>;
    }

    const connection = OrmSubscription.getOrCreate(
        shape,
        normalizeScope(scope)
    );

    // Cleanup
    onBeforeUnmount(() => {
        connection.close();
    });

    const ref = useDeepSignal(connection.signalObject);

    return { ref };
}

export default useInfiniteShape;
