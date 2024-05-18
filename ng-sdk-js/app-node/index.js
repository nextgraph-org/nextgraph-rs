// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

const WebSocket = require("ws");
// shim to insert WebSocket in global
const ng = require("ng-sdk-node");
global.WebSocket = WebSocket;

let config = {
    server_peer_id: "ALyGZgFaDDALXLppJZLS2TrMScG0TQIS68RzRcPv99aN",
    admin_user_key:"ABI7mSYq1jzulcatewG6ssaFuCjYVVxF_esEmV33oBW4",
    client_peer_key:"APbhJBuWUUmwZbuYwVm88eJ0b_ZulpSMOlA-9Zwi-S0Q"
};

ng.init_headless(config).then( async() => {
    let session_id;
    try {
        let user_id = await ng.admin_create_user(config);
        console.log("user created: ",user_id);
        
        let other_user_id = "AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE";

        let session = await ng.session_headless_start(other_user_id);
        session_id = session.session_id;
        console.log(session);
        
        let sparql_result = await ng.sparql_query(session.session_id, "SELECT * WHERE { ?s ?p ?o }");
        console.log(sparql_result);

        let quads = await ng.sparql_query(session.session_id, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }");
        for (const q of quads) {
            console.log(q.subject.toString(), q.predicate.toString(), q.object.toString(), q.graph.toString())
        }

        let result = await ng.sparql_update(session.session_id, "INSERT DATA { <http://example.com> <http://example.com> <http://example.com> }");
        console.log(result);

        let file_nuri = await ng.file_put_to_private_store(session.session_id,"LICENSE-MIT","text/plain");
        console.log(file_nuri);

        //let file_nuri = "did:ng:j:AD_d4njVMAtIDEU1G-RDxfOLIOZyOrB_1Rb7B6XykIEJ:k:APV-_Xtk03PW_Mbl4OaYpLrmEkBDVtn81lpto8sxc_tb";
        var bufs = [];
        let cancel = await ng.file_get_from_private_store(session.session_id, file_nuri, async (file) => {
            if (file.V0.FileMeta) {
              //skip
            } else if (file.V0.FileBinary) {
              if (file.V0.FileBinary.byteLength > 0) {
                bufs.push(file.V0.FileBinary);
              } 
            } else if (file.V0 == 'EndOfStream') {
                //console.log("end of file");
                var buf = Buffer.concat(bufs);
                // if the file contains some UTF8 text
                console.log(buf.toString('utf8'));
            }
        });

        // the 2nd argument `false` means: do not `force_close` the dataset. 
        // it will be detached, which means it stays in memory even when the session is stopped. 
        // (not all the dataset is in memory anyway! just some metadata)
        // if you set this to true, the dataset is closed and removed from memory on the server.
        // next time you will open a session for this user, the dataset will be loaded again.
        let res = await ng.session_headless_stop(session.session_id, false);
        console.log(res);

    } catch (e) {
        console.error(e);
        if (session_id) await ng.session_headless_stop(session_id, true);
    }
})
.catch(err => {
    console.error(err);
});
