# nextgraphweb

[![Apache 2.0 Licensed][license-image]][license-link]
[![MIT Licensed][license-image2]][license-link2]
[![project chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://forum.nextgraph.org)

JavaScript/TypeScript package containing the SDK of NextGraph for developing Web Apps

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## For developers

Read our [getting started guide](https://docs.nextgraph.org/en/getting-started/).

You need to create a Wallet for yourself, on one of our Public Broker Service Provider. Alternatively, you can do everything locally, as [described below](#local-development)

```
npm i nextgraphweb
```

Additionally, you can use [LDO (Linked Data Object) library](https://ldo.js.org/latest/guides/nextgraph/) to help you with RDF handling in the client side.

```
npm i @ldo/connected-nextgraph
```

More documentation on LDO can be found [here](https://www.npmjs.com/package/@ldo/connected-nextgraph).

The LDO library also offers a React plugin that will be demonstrated in another example.

You will find a full example web app [here](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/ng-sdk-js/example-webapp-vite).
Specially you will find there instructions for setting up your local dev env.

You have to first call the `init()` and `ng.login()`, then once you  receive the status `loggedin` in the callback, you can start using the whole API.

## APIs

All the functions are async. you must use them with `await` (or `.then()`).

They all can throw errors. You must enclose them in `try {} catch(e) {}`

- `ng.doc_create()`
- `ng.sparql_query(session_id, "[SPARQL query]", base, nuri)` returns or:
    -   for SELECT queries: a JSON Sparql Query Result as a Javascript object. [SPARQL Query Results JSON Format](https://www.w3.org/TR/sparql11-results-json/)
    -   for CONSTRUCT queries: a list of quads in the format [RDF-JS data model](http://rdf.js.org/data-model-spec/) that can be used as ingress to RDFjs lib.
    -   for ASK queries: a boolean
- `ng.sparql_update(session_id, "[SPARQL update]")` returns nothing, but can throw an error.

Here is the format of the config object to be supplied in the calls to `init_headless` and `admin_create_user`:

## Local development

you need to have a running local ngd server and a local ng-app frontend too. See those [instructions first](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/DEV.md#first-run).

You will need to create an admin wallet on the local ngd instance, as explained in the above link.

Then you can use that wallet to log in inside your webapp.

Then compile the nextgraphweb package in dev mode:

```
pnpm run -C ../../helpers/nextgraphweb builddev
```

Then create your app, by example, with the command:

```
npm create vite@latest
```

change directory to where our app is located. and install dependencies, then run the dev server.


```
npm install
npm link ../../helpers/nextgraphweb
npm run dev
```

Due to the way `npm link`  works, you will have to run this command again, after every time you use `npm install`.

See the example code in [src/main.js](./src/main.js)

## Example usage

call :

```javascript
import {default as ng, init} from "nextgraphweb";

await init( (event) => {
    // callback
    // once you receive event.status == "loggedin"
    // you can use the full API
}
, true // singleton: boolean (will your app create many docs in the system, or should it be launched as a unique instance)
, []); //list of AccessRequests (for now, leave this empty)

await ng.login(); // this will return false at the first attempt. but it will open the wallet login page so the user can login.
    // if you call it again later once the user has logged in already, it will return true, and nothing more will happen
```

You can alternatively wrap the callback inside a Promise in order to wait for the "loggedin" event.

```javascript
import {default as ng, init} from "nextgraphweb";

let loggedin = new Promise( async (resolve) => {
    await init( (event) => {
        // callback
        // once you receive event.status == "loggedin"
        // you can use the full API
        if (event.status == "loggedin") resolve(event.session);
        else if (event.status == "cancelled" || event.status == "error") resolve(false);
    }
    , true // singleton: boolean (will your app create many docs in the system, or should it be launched as a unique instance)
    , []); //list of AccessRequests (for now, leave this empty)
});

await ng.login(); // this will return false at the first attempt. but it will open the wallet login page so the user can login.
    // if you call it again later once the user has logged in already, it will return true, and nothing more will happen

let session = await loggedin;
if (session) {

    await ng.doc_create(session.session_id,...);

    await ng.sparql_query(session.session_id,...);

}
```

---

## License

Licensed under either of

-   Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
-   MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
    at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.

[license-image]: https://img.shields.io/badge/license-Apache2.0-blue.svg
[license-link]: https://git.nextgraph.org/NextGraph/nextgraph-rs/raw/branch/master/LICENSE-APACHE2
[license-image2]: https://img.shields.io/badge/license-MIT-blue.svg
[license-link2]: https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/LICENSE-MIT
