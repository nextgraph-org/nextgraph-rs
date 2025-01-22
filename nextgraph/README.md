<p align="center">
    <img src="https://git.nextgraph.org/NextGraph/nextgraph-rs/raw/branch/master/nextgraph/.static/header.png" alt="nextgraph-header" />
</p>

# nextgraph

![MSRV][rustc-image]
[![Apache 2.0 Licensed][license-image]][license-link]
[![MIT Licensed][license-image2]][license-link2]
[![project chat](https://img.shields.io/badge/zulip-join_chat-brightgreen.svg)](https://forum.nextgraph.org)
[![Crates.io Version](https://img.shields.io/crates/v/nextgraph)](https://crates.io/crates/nextgraph)
[![docs.rs](https://img.shields.io/docsrs/nextgraph)](https://docs.rs/nextgraph)
[![NPM Version](https://img.shields.io/npm/v/nextgraph)](https://www.npmjs.com/package/nextgraph)

Rust client library for NextGraph framework

This library is in active development at [https://git.nextgraph.org/NextGraph/nextgraph-rs](https://git.nextgraph.org/NextGraph/nextgraph-rs), a Gitea instance. For bug reports, issues, merge requests, and in order to join the dev team, please visit the link above and create an account (you can do so with a github account). The [github repo](https://github.com/nextgraph-org/nextgraph-rs) is just a read-only mirror that does not accept issues.

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)

## Support

This crate has official documentation at [docs.rs](https://docs.rs/nextgraph/0.1.0/nextgraph/)

Documentation can be found here [https://docs.nextgraph.org](https://docs.nextgraph.org)

And our community forum where you can ask questions is here [https://forum.nextgraph.org](https://forum.nextgraph.org)

## Status

NextGraph is not ready yet. You can subscribe to [our newsletter](https://list.nextgraph.org/subscription/form) to get updates, and support us with a [donation](https://nextgraph.org/donate/).

## Dependencies

Nextgraph library is dependent on [async-std](https://async.rs/). You must include it in your `Cargo.toml`.
A tokio-based version (as a feature) might be available in the future.

```toml
[dependencies]
nextgraph = "0.1.1-alpha"
async-std = "1.12.0"
```

## Examples

You can find some examples on how to use the library:

-   [in_memory](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/nextgraph/examples)
-   [persistent](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/nextgraph/examples)

## License

Licensed under either of

-   Apache License, Version 2.0 ([LICENSE-APACHE2](LICENSE-APACHE2) or http://www.apache.org/licenses/LICENSE-2.0)
-   MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
    at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

### Contributions license

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in the work by you shall be dual licensed as below, without any
additional terms or conditions.

---

NextGraph received funding through the [NGI Assure Fund](https://nlnet.nl/assure) and the [NGI Zero Commons Fund](https://nlnet.nl/commonsfund/), both funds established by [NLnet](https://nlnet.nl/) Foundation with financial support from the European Commission's [Next Generation Internet](https://ngi.eu/) programme, under the aegis of DG Communications Networks, Content and Technology under grant agreements No 957073 and No 101092990, respectively.


[rustc-image]: https://img.shields.io/badge/rustc-1.74+-blue.svg
[license-image]: https://img.shields.io/badge/license-Apache2.0-blue.svg
[license-link]: https://git.nextgraph.org/NextGraph/nextgraph-rs/raw/branch/master/LICENSE-APACHE2
[license-image2]: https://img.shields.io/badge/license-MIT-blue.svg
[license-link2]: https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/LICENSE-MIT
