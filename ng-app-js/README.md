# ng-app-js

JS/WASM module of NextGraph (SDK and apps)

## NextGraph

> NextGraph brings about the convergence between P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users and software developers alike, wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with end-to-end encryption, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
> 
> More info here [https://nextgraph.org](https://nextgraph.org)

## JS/WASM module

This module is part of the SDK of NextGraph.

It is composed of
- the npm package `ng-app-js`  which is the SDK
- the plain JS web app `app-web`
- the React web app `app-react`
- the node-js app `app-node`

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## For developers

Read our [getting started guide](https://docs.nextgraph.org/en/getting-started/).

```
npm i ng-app-js-sdk
```

## For contributors

```
wasm-pack build --target bundler
cd pkg
// if you have access to npm registry and want to publish the package 
// npm publish --access=public

cd ..
wasm-pack build -t nodejs -d pkg-node
node prepare-node.js
cd pkg-node
// if you have access to npm registry and want to publish the package 
// npm publish --access=public
```

### Plain JS web app

```
cd ../app-web
// for local development
npm install --no-save ../pkg 
// or, for install from npm registry: npm install
npm start
```

Open this URL in browser : [http://localhost:8080](http://localhost:8080)

### React web app

```
cd ../app-react
// for local development
npm install --no-save ../pkg
// or, for install from npm registry: npm install
npm run dev
```

Open this URL in browser : [http://localhost:8080](http://localhost:8080)

### NodeJS app

```
cd ../app-node
// for local development
npm install --no-save ../pkg-node
// or, for install from npm registry: npm install
npm run start
```

### Contributions license

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be dual licensed as below, without any
additional terms or conditions.s

## License

Licensed under either of
 * Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
 * MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/project/NextGraph/index.html), a fund established by [NLnet](https://nlnet.nl/) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreement No 957073.