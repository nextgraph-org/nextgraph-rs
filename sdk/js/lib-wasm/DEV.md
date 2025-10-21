# WASM module

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## For contributors

First of all, run:

```bash
cargo install cargo-run-script
```

Please note that the dev and prod builds share the same output folder, they thus override each other.
When building the app, be sure to have the production build of the SDK in the output folder.

```bash
// for the app sdk (browser)
cargo run-script appdev

// for the nodejs sdk
cargo run-script nodedev
```

For testing in vanilla JS

```bash
cargo run-script webdev
python3 -m http.server
# open http://localhost:8000

```

Or automated testing with headless chrome:

```bash
wasm-pack test --chrome --headless
```

## Developing against a third party webapp

in a separate terminal, from the root of the mono-repo :

```bash
pnpm buildfrontdev3
cd engine/broker/auth
pnpm dev3
```

in a separate terminal, from the root of the mono-repo :

```bash
cd infra/ngnet
cargo run-script buildfrontdev3
cargo run
```

in a separate terminal, from the root of the mono-repo, start your local ngd

```bash
export NG_DEV3=1; cargo run -r -p ngd -- -vv --save-key -l 14400
# Then log in to your account by opening
# http://localhost:14400
```

finally, start your local third party webapp you will use to test the WASM SDK.
in a separate terminal, from the root of the mono-repo,

```bash
# This is up to you. By example :
cd sdk/js/examples/multi-framework-signals
pnpm dev
# Then open that app in your browser
```

every time you modify the SDK, re-run (at the root of mono-repo) :

```bash
cargo run-script libwasmdev3
# Or in the sdk/js/lib-wasm folder run cargo run-script appdev3
```

## Production build

```bash
cargo run-script app
cargo run-script node
cargo run-script web
```

### Contributions license

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be dual licensed as below, without any
additional terms or conditions.

## License

Licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.
