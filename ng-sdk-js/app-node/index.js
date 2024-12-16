// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

const WebSocket = require("ws");
// shim to insert WebSocket in global
const ng = require("nextgraph");
global.WebSocket = WebSocket;

let config = {
    server_peer_id: "FtdzuDYGewfXWdoPuXIPb0wnd0SAg1WoA2B14S7jW3MA",
    admin_user_key: "pye0YFzk1ix1amKEwd6AeqaUAN_PNpH5zGLomh0M1PAA",
    client_peer_key: "GRP0QnlzaB8o2vdiBaNoOYDNOFX-uehLZMxeCaG3JA0A",
    server_addr: "127.0.0.1:14400"
};

ng.init_headless(config).then( async() => {
    let session_id;
    try {
        //let user_id = await ng.admin_create_user(config);
        //console.log("user created: ",user_id);
        
        let user_id = "tPY8WDkgXdqJsQMXI6U5ztj_SK54djy9XtHJhKlzyGQA";

        
        //let base;
        let session = await ng.session_headless_start(user_id);
        session_id = session.session_id;
        console.log(session);
        
        let dump = await ng.rdf_dump(session.session_id);
        console.log(dump);

        //let nuri = await ng.doc_create(session.session_id, "Graph", "data:graph", "protected", "RMKIXeT9RvGT5wc2uJQaRqEFjaJpC19haeaSx4iRenIA", "store");
        let nuri = "did:ng:o:b70vk7Bj4eInXgG8pLysrFpEL-YSOiRYEmihPGiM1EsA:v:_0hm2qIpq443C7rMEdCGnhPDhsaWR2XruTIaF-9LKbkA";
        console.log("nuri=",nuri);
        let base = "did:ng:o:b70vk7Bj4eInXgG8pLysrFpEL-YSOiRYEmihPGiM1EsA";

        console.log("******** SELECT")

        let header_branch = "did:ng:o:b70vk7Bj4eInXgG8pLysrFpEL-YSOiRYEmihPGiM1EsA:v:_0hm2qIpq443C7rMEdCGnhPDhsaWR2XruTIaF-9LKbkA:b:TokczMya9WDpQ-_FYFi7QJVbHmllWS3lD-vjtzHHQa0A";
        
        // let sparql_result = await ng.sparql_query(session.session_id, "SELECT ?s ?p ?o WHERE { ?s ?p ?o }", base, header_branch);
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        await ng.sparql_update(session.session_id, "WITH <"+header_branch+">  \
        DELETE { <> <did:ng:x:ng#n> ?n.  } INSERT {<> <did:ng:x:ng#n> \"ddd6\". } WHERE {OPTIONAL { <> <did:ng:x:ng#n> ?n } }",nuri);

        // let history = await ng.branch_history(session.session_id);
        // for (const h of history.history) {
        //     console.log(h[0], h[1]);
        // }
        // console.log(history.swimlane_state);

        
        sparql_result = await ng.sparql_query(session.session_id, "CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <"+header_branch+"> { ?s ?p ?o } }", base);
        console.log("******** CONSTRUCT")

        for (const r of sparql_result) console.log(r.subject.value, r.predicate.value,r.object.value);
        
        //await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:o:8mqfhoSprneBjkAASinRk0OYvFpbiyhjMBVHKQIarDEA> <did:ng:i> <did:ng:j> }");
        // await ng.sparql_update(session.session_id, "DELETE DATA { <did:ng:t:AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:i> <did:ng:j> }");

        // await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:t:AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:i> <did:ng:j> }");
        // await ng.sparql_update(session.session_id, "INSERT { ?s <did:ng:i> <did:ng:k> } WHERE { ?s <did:ng:i> <did:ng:j> } ");

        // await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> <did:ng:t:BJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE>. <did:ng:t:BJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:m> <did:ng:n> }");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> [ <did:ng:m> <did:ng:n> ]. }");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  [ <did:ng:m> <did:ng:n> ] <did:ng:ok> <did:ng:v>  . }");
        //await ng.sparql_update(session.session_id, "INSERT {  ?a <did:ng:ok> <did:ng:v>  . } WHERE { ?a <did:ng:m> <did:ng:n>  } ");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> _:1 . _:1 <did:ng:m> <did:ng:n>. }");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  _:f766ca988268ddc60315ddd5bd621387 <did:ng:o> <did:ng:>. }");
        //await ng.sparql_update(session.session_id, "INSERT {  _:_ <did:ng:ok> <did:ng:v>  . } WHERE { _:_ <did:ng:m> <did:ng:n>  } ");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  _:_ <abc:a> <d:a>  .  _:_a <abceee:a> <d:a>  . }");
        
        //await ng.sparql_update(session.session_id, "INSERT DATA {  <> <a:selftest> <a:selftest>  . }",base);

        //await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:TEST4>  <did:ng:j> _:_  .   _:_ <did:ng:m> <did:ng:n>  . }");
        //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:TEST5> <did:ng:j> [ <did:ng:m> <did:ng:n> ]. }");

        // sparql_result = await ng.sparql_query(session.session_id, "SELECT ?a WHERE { ?a <did:ng:j> _:abc. _:abc <did:ng:m> <did:ng:n>  }", base);
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        // sparql_result = await ng.sparql_query(session.session_id, "SELECT ?s ?a WHERE { ?s <did:ng:j> ?a  }", base);
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        // console.log("******** CONSTRUCT2")

        // let quads = await ng.sparql_query(session.session_id, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",base);
        // for (const q of quads) {
        //     console.log(q.subject.toString(), q.predicate.toString(), q.object.toString(), q.graph.toString())
        // }

        // let file_nuri = await ng.file_put_to_private_store(session.session_id,"LICENSE-MIT","text/plain");
        // console.log(file_nuri);

        // //let file_nuri = "did:ng:j:AD_d4njVMAtIDEU1G-RDxfOLIOZyOrB_1Rb7B6XykIEJ:k:APV-_Xtk03PW_Mbl4OaYpLrmEkBDVtn81lpto8sxc_tb";
        // var bufs = [];
        // let cancel = await ng.file_get_from_private_store(session.session_id, file_nuri, async (file) => {
        //     if (file.V0.FileMeta) {
        //       //skip
        //     } else if (file.V0.FileBinary) {
        //       if (file.V0.FileBinary.byteLength > 0) {
        //         bufs.push(file.V0.FileBinary);
        //       } 
        //     } else if (file.V0 == 'EndOfStream') {
        //         //console.log("end of file");
        //         var buf = Buffer.concat(bufs);
        //         // if the file contains some UTF8 text
        //         console.log(buf.toString('utf8'));
        //     }
        // });

        // the 2nd argument `false` means: do not `force_close` the dataset. 
        // it will be detached, which means it stays in memory even when the session is stopped. 
        // (not all the dataset is in memory anyway! just some metadata)
        // if you set this to true, the dataset is closed and removed from memory on the server.
        // next time you will open a session for this user, the dataset will be loaded again.
        let res = await ng.session_headless_stop(session.session_id, false);
        //console.log(res);

    } catch (e) {
        console.error(e);
        if (session_id) await ng.session_headless_stop(session_id, true);
    }
})
.catch(err => {
    console.error(err);
});
