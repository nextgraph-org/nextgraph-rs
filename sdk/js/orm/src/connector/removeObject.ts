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

/**
 * Utility for removing *all* data (quads) for a given graph and subject.
 *
 * Note that this is equivalent to calling `delete()` on an object in a graph subscription.
 */
export async function insertObject(graph_nuri: string, subject_iri: string) {
    const {
        ng,
        session: { session_id },
    } = await ngSession;
    ng.sparql_update(
        session_id,
        `DELETE WHERE { GRAPH <${graph_nuri}> { <${subject_iri}> ?p ?o . } }`,
        graph_nuri
    );
}
