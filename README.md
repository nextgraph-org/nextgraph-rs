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

- [Install Rust](https://www.rust-lang.org/tools/install)
- Install the [Nix package manager](https://nixos.org/download.html)
- and [Nix Flakes](https://nixos.wiki/wiki/Flakes)

```
git clone git@git.nextgraph.org:NextGraph/nextgraph-rs.git
cd nextgraph-rs
nix develop
cargo build
``` 

### Packages

The crates are organized as follow : 

- p2p-repo : all the common types, traits and structs for the P2P repositories
- p2p-net : all the common types, traits and structs for the P2P networks
- p2p-broker : the broker code (as server and core peer)
- p2p-client : the client connecting to a broker, used by the apps and verifier
- p2p-stores-lmdb : lmdb backed stores for the p2p layer
- p2p-verifier : the code of the verifier
- ngcli : CLI tool to manipulate the repos
- ngd : binary executable of the daemon (that can run a broker, verifier and/or Rust services)
- ng-app-js : contains the JS SDK, the web app, react app, and some node services

### Run

Build & run executables:

```
// runs the daemon
cargo run --bin ngd

// runs the client
cargo run --bin ngcli
```

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

### Build a package

Build the default package (`.#ngd`):

```
nix build
```

Bulid a specific package:

```
nix build '.#ngcli'
```

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
 * Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
 * MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/project/NextGraph/index.html), a fund established by [NLnet](https://nlnet.nl/) with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreement No 957073.
