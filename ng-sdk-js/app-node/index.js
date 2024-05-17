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
    
    try {
        //let user_id = "ABIojb8XGAGCL4R_-81Kix8vJnSsfpvu8jwi6T-wTQWt";
        //let user_id = "ABA1FBm8ofqCXutaf96pRTWvgXDaCG2JLuRlthzoV4a2";
        let user_id = "AJQ5gCLoXXjalC9diTDCvxxWu5ZQUcYWEE821nhVRMcE";
        //let user_id = await ng.admin_create_user(config);
        console.log("user created: ",user_id);
        
        let session = await ng.session_headless_start(user_id);
        console.log(session);

        let res = await ng.session_headless_stop(session.session_id, true);
        console.log(res);

    } catch (e) {
        console.error(e);
    }
})
.catch(err => {
    console.error(err);
});
