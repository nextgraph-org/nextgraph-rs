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

// get your wallet file as an ArrayBuffer and pass it to wallet_read_file  

// ng.gen_wallet_for_test("rS6pZiroUZ5yjq9eraesDkpxWWOAoX_8QZ_5U9GXsOgA").then( async (res) => {
//     console.log(res[0]);
//     let opened = await ng.wallet_open_with_mnemonic_words(res[0].wallet, res[1], [1, 2, 1, 2]);
//     console.log(opened.V0.personal_site);
// });
// return;
        

const fs = require('fs');
let buffer = fs.readFileSync("/home/nn/Downloads/wallet-bCHhOmlelVtZ60jjGu7m-YtzF4TfD5WyErAMnEDOn-kA.ngw");

ng.wallet_read_file(buffer).then(async (wallet)=>{
    console.log("start");
    try {
        //let wal = await ng.gen_wallet_for_test("rS6pZiroUZ5yjq9eraesDkpxWWOAoX_8QZ_5U9GXsOgA");
        //console.log(wal);

        let opened_wallet = await ng.wallet_open_with_mnemonic_words(wallet, [
            "mutual", "wife", "section", "actual", "spend", "illness", "save", "delay", "kiss", "crash", "baby", "degree" ],
            [2, 3, 2, 3]);

        let user_id = opened_wallet.V0.personal_site;
        let user_id_string = opened_wallet.V0.personal_site_id;
        let wallet_name = opened_wallet.V0.wallet_id;

        console.log("wallet_name=", wallet_name)

        let _client = await ng.wallet_import(wallet, opened_wallet, true)

        let session = await ng.session_in_memory_start(wallet_name, user_id);

        let session_id = session.session_id;
        console.log(session);

        let protected_repo_id = session.protected_store_id.substring(2,46);
        console.log("Session started. protected store ID = ", protected_repo_id)

        let info = await ng.client_info();
        let connection_status = await ng.user_connect(
            info,
            user_id_string
        );

        console.log(connection_status);

        console.log("==== DUMP ====");
        let dump = await ng.rdf_dump(session_id);
        console.log(dump);
        console.log("==== END of DUMP ====");

        // we create a new document in the protected store of the user.
        let nuri = await ng.doc_create(session_id, "Graph", "data:graph", "store", "protected", protected_repo_id );
        // once you have created a document, you can reuse its Nuri by entering it in the line below, remove the commenting, and comment out the above line
        //let nuri = "did:ng:o:W6GCQRfQkNTLtSS_2-QhKPJPkhEtLVh-B5lzpWMjGNEA:v:h8ViqyhCYMS2I6IKwPrY6UZi4ougUm1gpM4QnxlmNMQA";
        console.log("nuri=",nuri);
        let base = nuri.substring(0,53);
        console.log("base=",base);

        // EXAMPLE OF SUBSCRIBING TO A DOCUMENT. base is the Nuri half first part (the document ID proper).

        //call unsub when you are done subscribing you don't want to receive updates anymore
        // let unsub = await ng.doc_subscribe(base, session_id,
        //     async (response) => {

        //         if (response.V0.State?.graph) {
                    
        //             let json_str = new TextDecoder().decode(response.V0.State.graph.triples);
        //             triples = JSON.parse(json_str);
                
        //             for (const triple of triples){
        //                 // deal with each triple
        //                 console.log("STATE",triple);
        //             }
                    
        //         } else if (response.V0.Patch?.graph) {
                    
        //             let inserts_json_str = new TextDecoder().decode(response.V0.Patch.graph.inserts);
        //             let inserts = JSON.parse(inserts_json_str);
        //             let removes_json_str = new TextDecoder().decode(response.V0.Patch.graph.removes);
        //             let removes = JSON.parse(removes_json_str);

        //             for (const insert of inserts){
        //                 // deal with each insert
        //                 console.log("INSERT",insert);
        //             }
        //             for (const remove of removes){
        //                 // deal with each remove
        //                 console.log("REMOVE",remove);
        //             }
                    
        //         }
        //     }
        // );

        let res = await ng.sparql_update(session_id, "INSERT DATA { <> <example:predicate> \"An example value1000\". }", nuri );
        console.log(res);

        // SELECT
        // we use base to replace <> in the subject

        // let sparql_result = await ng.sparql_query(session_id, "SELECT ?p ?o ?g WHERE { GRAPH ?g { <> ?p ?o } }", base);
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        // // specifying a nuri in the query arguments, is equivalent to settings the GRAPH in the WHERE
        // sparql_result = await ng.sparql_query(session_id, "SELECT ?s ?p ?o WHERE { ?s ?p ?o }", undefined, nuri);
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        // // base can be omitted if it isn't used

        // sparql_result = await ng.sparql_query(session_id, "SELECT ?s ?p ?o ?g WHERE { GRAPH ?g { ?s ?p ?o } }");
        // console.log(sparql_result);
        // for (const q of sparql_result.results.bindings) {
        //     console.log(q);
        // }

        // // CONSTRUCT

        // let triples = await ng.sparql_query(session_id, `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <${nuri}> { ?s ?p ?o } }`, base);
        // for (const q of triples) {
        //     console.log(q.subject.toString(), q.predicate.toString(), q.object.toString())
        // }

        // // is equivalent to 

        // triples = await ng.sparql_query(session_id, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }", base, nuri);
        // for (const q of triples) {
        //     console.log(q.subject.toString(), q.predicate.toString(), q.object.toString())
        // }

        // // cleaning up

        // await ng.user_disconnect(user_id_string);

        // await ng.session_stop(user_id_string);

        // await ng.wallet_close(wallet_name);

        console.log("the end");
    } catch (e) {
        console.error(e);
    }
}).catch(err => {
    console.error(err);
});

// let config = {
//     // replace server_peer_id and admin_user_key with your own
//     // replace client_peer_key with a fresh key generated with `ngcli gen-key` (use the private key)
//     server_peer_id: "pzx0BqespDc0MjvtYmq1b6PRqc4i1mjYRqVbIXOw2RwA",
//     admin_user_key: "sB2JMURtgd42pWI4lLxCT_cNle-pfWkOLZQ0XyJiFswA",
//     client_peer_key: "GRP0QnlzaB8o2vdiBaNoOYDNOFX-uehLZMxeCaG3JA0A",
//     server_addr: "127.0.0.1:14400"
// };

// ng.init_headless(config).then( async() => {
//     let session_id;
//     try {
//         //let user_id = await ng.admin_create_user(config);
//         //console.log("user created: ",user_id);
        
//         let user_id = "sajsOaZWHXNyvhBxWbyj9GFmxuAjsP31gWQ2qZunCr0A";
        
//         //let base;
//         let session = await ng.session_headless_start(user_id);
//         session_id = session.session_id;
//         console.log(session);
        
//         let dump = await ng.rdf_dump(session.session_id);
//         console.log(dump);
//         let private_store = "did:ng:o:qBzNhlqofXRKbTfTUOq-2Aagh5AgDES5LR4Hsw7caCUA:v:XL7JfZF_8OuRiEN1db3g44sUD2m1aU8Z_Ab1Z6H-AOkA";
//         //let nuri = await ng.doc_create(session.session_id, "Graph", "data:graph", "protected", "B381BvfdAFYPBkdhDrsqnMMg5pnJMWJgJbZobZErXZMA", "store");
//         let nuri = "did:ng:o:FwRgrwtOhli54mRT6xi8J5ZK7X4L7L86lpbwhNVmgbsA:v:cpEgHDobJmdpcB8Z4SP91tBX4wPaasjJuz09GkfP2_UA";
//         console.log("nuri=",nuri);
//         let base = "did:ng:o:FwRgrwtOhli54mRT6xi8J5ZK7X4L7L86lpbwhNVmgbsA";

//         console.log("******** UPDATE")

//         //let header_branch = "did:ng:o:b70vk7Bj4eInXgG8pLysrFpEL-YSOiRYEmihPGiM1EsA:v:_0hm2qIpq443C7rMEdCGnhPDhsaWR2XruTIaF-9LKbkA:b:TokczMya9WDpQ-_FYFi7QJVbHmllWS3lD-vjtzHHQa0A";
        
//         // let sparql_result = await ng.sparql_query(session.session_id, "SELECT ?s ?p ?o WHERE { ?s ?p ?o }", base, header_branch);
//         // console.log(sparql_result);
//         // for (const q of sparql_result.results.bindings) {
//         //     console.log(q);
//         // }

//         // await ng.sparql_update(session.session_id, "WITH <"+header_branch+">  \
//         // DELETE { <> <did:ng:x:ng#n> ?n.  } INSERT {<> <did:ng:x:ng#n> \"ddd6\". } WHERE {OPTIONAL { <> <did:ng:x:ng#n> ?n } }",nuri);

//         // let history = await ng.branch_history(session.session_id);
//         // for (const h of history.history) {
//         //     console.log(h[0], h[1]);
//         // }
//         // console.log(history.swimlane_state);

//         await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:_> <did:ng:j> <did:ng:j3> }");
        
//         sparql_result = await ng.sparql_query(session.session_id, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }");
//         console.log("******** CONSTRUCT")

//         for (const r of sparql_result) console.log(r.subject.value, r.predicate.value, r.object.value);
        
        
//         // await ng.sparql_update(session.session_id, "DELETE DATA { <did:ng:t:AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:j> <did:ng:j> }");

//         // await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:t:AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:j> <did:ng:j> }");
//         // await ng.sparql_update(session.session_id, "INSERT { ?s <did:ng:j> <did:ng:k> } WHERE { ?s <did:ng:j> <did:ng:j> } ");

//         // await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> <did:ng:t:BJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE>. <did:ng:t:BJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE> <did:ng:m> <did:ng:n> }");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> [ <did:ng:m> <did:ng:n> ]. }");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  [ <did:ng:m> <did:ng:n> ] <did:ng:ok> <did:ng:v>  . }");
//         //await ng.sparql_update(session.session_id, "INSERT {  ?a <did:ng:ok> <did:ng:v>  . } WHERE { ?a <did:ng:m> <did:ng:n>  } ");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:z> <did:ng:j> _:1 . _:1 <did:ng:m> <did:ng:n>. }");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  _:f766ca988268ddc60315ddd5bd621387 <did:ng:o> <did:ng:>. }");
//         //await ng.sparql_update(session.session_id, "INSERT {  _:_ <did:ng:ok> <did:ng:v>  . } WHERE { _:_ <did:ng:m> <did:ng:n>  } ");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  _:_ <abc:a> <d:a>  .  _:_a <abceee:a> <d:a>  . }");
        
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  <> <a:selftest> <a:selftest>  . }",base);

//         //await ng.sparql_update(session.session_id, "INSERT DATA { <did:ng:TEST4>  <did:ng:j> _:_  .   _:_ <did:ng:m> <did:ng:n>  . }");
//         //await ng.sparql_update(session.session_id, "INSERT DATA {  <did:ng:TEST5> <did:ng:j> [ <did:ng:m> <did:ng:n> ]. }");

//         // sparql_result = await ng.sparql_query(session.session_id, "SELECT ?a WHERE { ?a <did:ng:j> _:abc. _:abc <did:ng:m> <did:ng:n>  }", base);
//         // console.log(sparql_result);
//         // for (const q of sparql_result.results.bindings) {
//         //     console.log(q);
//         // }

//         // sparql_result = await ng.sparql_query(session.session_id, "SELECT ?s ?a WHERE { ?s <did:ng:j> ?a  }", base);
//         // console.log(sparql_result);
//         // for (const q of sparql_result.results.bindings) {
//         //     console.log(q);
//         // }

//         // console.log("******** CONSTRUCT2")

//         // let quads = await ng.sparql_query(session.session_id, "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",base);
//         // for (const q of quads) {
//         //     console.log(q.subject.toString(), q.predicate.toString(), q.object.toString(), q.graph.toString())
//         // }

//         // let file_nuri = await ng.file_put_to_private_store(session.session_id,"LICENSE-MIT","text/plain");
//         // console.log(file_nuri);

//         // //let file_nuri = "did:ng:j:AD_d4njVMAtIDEU1G-RDxfOLIOZyOrB_1Rb7B6XykIEJ:k:APV-_Xtk03PW_Mbl4OaYpLrmEkBDVtn81lpto8sxc_tb";
//         // var bufs = [];
//         // let cancel = await ng.file_get_from_private_store(session.session_id, file_nuri, async (file) => {
//         //     if (file.V0.FileMeta) {
//         //       //skip
//         //     } else if (file.V0.FileBinary) {
//         //       if (file.V0.FileBinary.byteLength > 0) {
//         //         bufs.push(file.V0.FileBinary);
//         //       } 
//         //     } else if (file.V0 == 'EndOfStream') {
//         //         //console.log("end of file");
//         //         var buf = Buffer.concat(bufs);
//         //         // if the file contains some UTF8 text
//         //         console.log(buf.toString('utf8'));
//         //     }
//         // });

//         // the 2nd argument `false` means: do not `force_close` the dataset. 
//         // it will be detached, which means it stays in memory even when the session is stopped. 
//         // (not all the dataset is in memory anyway! just some metadata)
//         // if you set this to true, the dataset is closed and removed from memory on the server.
//         // next time you will open a session for this user, the dataset will be loaded again.
//         let res = await ng.session_headless_stop(session.session_id, false);
//         //console.log(res);

//     } catch (e) {
//         console.error(e);
//         if (session_id) await ng.session_headless_stop(session_id, true);
//     }
// })
// .catch(err => {
//     console.error(err);
// });
