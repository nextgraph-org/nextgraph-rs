// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0> 
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
const WebSocket = require("ws");
const ng = require("ng-app-node-sdk");
global.WebSocket = WebSocket;

const test = require("./test")
console.log("FROM INDEX");
ng.test();
test.random();
console.log(ng.start());

