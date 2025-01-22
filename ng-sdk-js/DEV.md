# ng-sdk-js

JS/WASM crate containing the SDK of NextGraph

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## JS/WASM module

This crate is composed of

- the npm package `ng-sdk-js` which is the SDK
- an example of web app using the ESmodule and webpack as bundler `app-web`
- an example of React web app `app-react`
- an example of node-js app `app-node`
- `index.html` an example of vanilla JS usage of the SDK

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## For developers

Read our [getting started guide](https://docs.nextgraph.org/en/getting-started/).

```
npm i ng-sdk-js
```

## For contributors

We recommend contributors to use the production build, as the creation and opening of wallets is very slow in the dev build.
Only use the dev build when debugging the sdk. see the next chapter for the production build.
Please note that the dev and prod builds share the same output folder, they thus override each other.
When building the app, be sure to have the production build of the SDK in the output folder.

```
wasm-pack build --dev --target bundler

wasm-pack build --dev -t nodejs -d pkg-node
node prepare-node.js
```

For testing in vanilla JS

```
wasm-pack build --dev --target web -d web
python3 -m http.server
// open http://localhost:8000

```

Or automated testing with headless chrome:

```
wasm-pack test --chrome --headless
```

## Production build

```
wasm-pack build --target bundler
tar --exclude .DS_Store -zcvf pkg.tar.gz pkg
wasm-pack build -t nodejs -d pkg-node
wasm-pack build --target web -d web
node prepare-node.js
cd pkg
npm publish --access=public
cd ../pkg-node
npm publish --access=public
```

### Example Plain JS web app

```
cd ../app-web
// for local development
npm install --no-save ../pkg
// or, for install from npm registry: npm install
npm start
```

Open this URL in browser : [http://localhost:8080](http://localhost:8080)

### Example React web app

```
cd ../app-react
// for local development
npm install --no-save ../pkg
// or, for install from npm registry: npm install
npm run dev
```

This URL will open automatically in browser : [http://localhost:8080](http://localhost:8080)

### Example NodeJS app

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

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.

