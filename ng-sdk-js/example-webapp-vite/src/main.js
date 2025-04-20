// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

import {default as ng, init} from "nextgraphweb";
import { createNextGraphLdoDataset } from "@ldo/connected-nextgraph";
import { parseRdf } from "@ldo/ldo";
const ldoDataset = createNextGraphLdoDataset();

init( async (event) => {
    // callback
    // event.status: "loggedin"...
    console.log("callback",event);

    if (event.status == "cancelled") {

        document.getElementById("result").innerText = "Login cancelled";
        console.log("CANCELLED");

    } else if (event.status == "loggedin") {

        //console.log("2nd login returned",await ng.login());

        let session_id = event.session.session_id;
        ldoDataset.setContext("nextgraph", {
          ng,
          sessionId: session_id
        });

        const resource = await ldoDataset.createResource("nextgraph");
        if (!resource.isError) {
            console.log("Created resource:", resource.uri);
        }

        const ttlData = `
            @prefix foaf: <http://xmlns.com/foaf/0.1/> .
            <#spiderman> a foaf:Person ; foaf:name "Spiderman" .
        `;

        const triples = await parseRdf(ttlData);

        await resource.update({
            added: triples,
            removed: undefined
        });

        document.getElementById("result").innerText = "created a new doc with Nuri: "+resource.uri;

        // TESTING error handling. See the "SELCT" instead of SELECT
        try {
            let res = await ng.sparql_query(session_id,"SELCT ?subject ?predicate ?object WHERE { ?subject ?predicate ?object .} LIMIT 10");
            console.log(res);
        } catch (e) {
            console.error("got an error", e)
        }
        // This one shall pass
        try {
            let res = await ng.sparql_query(session_id,"SELECT ?subject ?predicate ?object WHERE { ?subject ?predicate ?object .} LIMIT 10");
            console.log(res);
        } catch (e) {
            console.error("got an error", e)
        }
    }

}, true, []//list of AccessRequests
).then(async ()=>{
    console.log("1st login returned",await ng.login());
});
