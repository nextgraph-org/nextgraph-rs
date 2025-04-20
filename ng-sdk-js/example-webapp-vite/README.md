# example-webapp-vite

Example of a Web app made with NextGraph, using Vite

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## For developing locally

you need to have a running local ngd server. See those [instructions first](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/DEV.md#first-run).

Then compile the nextgraphweb package in dev mode:

```
pnpm run -C ../../helpers/nextgraphweb builddev
```

```
npm install
npm link ../../helpers/nextgraphweb
npm run dev
```

Due to the way `npm link`  works, you will have to run this command again, after every time you use `npm install`.

In our case, we have configured vite server to run on port 5174 for local development.

Open this URL in browser : [http://localhost:5174](http://localhost:5174)

See the example code in [src/main.js](./src/main.js)

## For usage in your project

call :

```javascript
import {default as ng, init} from "nextgraphweb";

await init( location.origin, (event) => {
    // callback
    // once you receive event.status == "loggedin"
    // you can use the full API
}
, true // singleton: boolean (will your app create many docs in the system, or should it be launched as a unique instance)
, []); //list of AccessRequests (for now, leave this empty)

await ng.login(); // this will return false at the first attempt. but it will open the wallet login page so the user can login.
    // if you call it again later once the user has logged in already, it will return true, and nothing more will happen
```

## License

Licensed under either of

-   Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
-   MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
    at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.
