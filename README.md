# nextgraph-rs

Rust implementation of NextGraph

This repository is in active development at [https://git.nextgraph.org/NextGraph/nextgraph-rs](https://git.nextgraph.org/NextGraph/nextgraph-rs), a Gitea instance. For bug reports, issues, merge requests, and in order to join the dev team, please visit the link above and create an account (you can do so with a github account). The [github repo](https://github.com/nextgraph-org/nextgraph-rs) is just a read-only mirror that does not accept issues.

## NextGraph

> NextGraph brings about the convergence between P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users and software developers alike, wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with end-to-end encryption, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## Support

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## How to use NextGraph

NextGraph is not ready yet. You can subscribe to [our newsletter](https://list.nextgraph.org/subscription/form) to get updates, and support us with a [donation](https://nextgraph.org/donate/).

## For developers

Read our [getting started guide](https://docs.nextgraph.org/en/getting-started/).

## For contributors

- [Install Rust](https://www.rust-lang.org/tools/install) minimum required 1.64.0
- [Install Nodejs](https://nodejs.org/en/download/)

until this [PR](https://github.com/rustwasm/wasm-pack/pull/1271) is accepted, will have to install wasm-pack this way:

```
cargo install wasm-pack --git https://github.com/rustwasm/wasm-pack.git --rev c2b663f25abe50631a236d57a8c6d7fd806413b2
cargo install cargo-watch
// optionally, if you want a Rust REPL: cargo install evcxr_repl
git clone git@git.nextgraph.org:NextGraph/nextgraph-rs.git
cd nextgraph-rs
cargo build
```

### Packages

The crates are organized as follow :

- p2p-repo : all the common types, traits and structs for the P2P repositories
- p2p-net : all the common types, traits and structs for the P2P networks
- p2p-broker : the broker code (as server and core peer)
- p2p-client-ws : the client connecting to a broker, used by the apps and verifier
- p2p-verifier : the code of the verifier
- stores-lmdb : lmdb backed stores
- ngcli : CLI tool to manipulate the repos
- ngd : binary executable of the daemon (that can run a broker, verifier and/or Rust services)
- ngone : server for nextgraph.one (boostrap into the right app)
- ng-sdk-js : contains the JS SDK, with example apps: web app, react app, or node service.
- ng-app : all the native apps, based on Tauri, and the web app.
- ng-wallet : keeps the secret keys of all identities of the user in a safe wallet

### Run

Build & run executables:

```
// runs the daemon
cargo run --bin ngd

// runs the client
cargo run --bin ngcli
```

For the web apps, see the [README](ng-app-js/README.md)

### Test

Test all:

```
cargo test --all --verbose -- --nocapture
```

Test a single module:

```
cargo test --package p2p-repo --lib -- branch::test --nocapture
```

Test end-to-end client and server:

```
cargo test --package ngcli -- --nocapture
```

Test WASM websocket

```
cd ng-app-js
wasm-pack test --chrome --headless
```

Test Rust websocket

```
cargo test --package p2p-client-ws --lib --  --nocapture
```

### Build release binaries

```
cargo build -r
```

you can then find the binaries `ngcli` and `ngd` in `target/release`

### Generate documentation

Generate documentation for all packages without their dependencies:

```
cargo doc --no-deps
```

The generated documentation can be found in `target/doc/<crate-name>`.

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

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/project/NextGraph/index.html), a fund established by [NLnet](https://nlnet.nl/) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreement No 957073.
