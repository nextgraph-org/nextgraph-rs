// Copyright (c) 2026 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import { ngSession } from "./initNg.ts";
import type { RdfOrmSubscription } from "./RdfOrmSubscription.ts";

/**
 * Utility for removing *all* data (quads) for a given document and subject.
 *
 * Essentially this runs the following SPARQL query:\
 * `DELETE WHERE { GRAPH <${graphNuri}> { <${subjectIri}> ?p ?o . } }`
 *
 * Note that this call has the same effect to calling `delete()` on an object
 * in an [RDF ORM Subscription]({@link RdfOrmSubscription}).
 *
 * @param graphNuri The Nuri of the document to remove data in.
 * @param subjectIri The IRI of the subject to delete all data for.
 */
export async function removeObject(graphNuri: string, subjectIri: string) {
    const {
        ng,
        session: { session_id },
    } = await ngSession;
    ng.sparql_update(
        session_id,
        `DELETE WHERE { GRAPH <${graphNuri}> { <${subjectIri}> ?p ?o . } }`,
        graphNuri
    );
}
