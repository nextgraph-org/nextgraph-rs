// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { DiscreteOrmConnection } from "@ng-org/orm";
import type { AllowedCrdt, DocumentStore } from "../types";
import { sessionPromise } from "./ngSession";

/**
 * Establishes an ORM connection and loads or creates
 * the CRDT document store where all application data is stored as JSON.
 */
export async function loadStore(crdt: AllowedCrdt) {
    /** The identifier that we use to find this application's store. */
    const APPLICATION_CLASS_IRI = `did:ng:z:ExpenseTrackerDiscreteApp-${crdt}`;

    // First, find or create the document that we use for this document.
    // We find its document id / IRI with a sparql query.
    const { ng, session_id } = await sessionPromise;

    // If a document already exists, we have added an RDF triple with type APPLICATION_CLASS_IRI
    const ret = await ng.sparql_query(
        session_id,
        `SELECT ?storeId WHERE { GRAPH ?storeId { ?s a <${APPLICATION_CLASS_IRI}> } }`,
        undefined,
        undefined
    );
    let documentId = ret?.results.bindings?.[0]?.storeId?.value;

    // Create a new document, if necessary.
    if (!documentId) {
        // Create document with the preferred CRDT.
        documentId = await ng.doc_create(
            session_id,
            crdt,
            crdt === "Automerge" ? "data:json" : "data:map", // Currently, the class name cannot be arbitrary due to a but in the ng interface. APPLICATION_CLASS_IRI,
            "store",
            undefined
        );

        // Add class to RDF part of the document so we can find it again.
        await ng.sparql_update(
            session_id,
            `INSERT DATA { GRAPH <${documentId}> {<${documentId}> a <${APPLICATION_CLASS_IRI}> } }`,
            documentId
        );
    }

    const connection = DiscreteOrmConnection.getOrCreate(documentId);
    await connection.readyPromise;
    const storeObject = connection.signalObject as Partial<DocumentStore>;

    // If the store is still empty, initialize it.
    if (!storeObject.expenses) {
        storeObject.expenses = [];
        storeObject.expenseCategories = [];
    }

    return connection;
}
