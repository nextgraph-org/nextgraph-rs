# Oxigraph

Oxigraph is a graph database library implementing the [SPARQL](https://www.w3.org/TR/sparql11-overview/) standard.
Its author is Thomas Pellissier Tanon thomas@pellissier-tanon.fr

The official upstream project is here: https://oxigraph.org/

https://github.com/oxigraph/oxigraph/

https://crates.io/crates/oxigraph

This package (ng-oxigraph) is a fork used internally by NextGraph.org project.
It mostly adds CRDTs to RDF/SPARQL (and also provides a RocksDB backend with encryption at rest, and OpenBSD support).

If you are interested to know more about NextGraph: https://nextgraph.org

https://git.nextgraph.org/NextGraph/nextgraph-rs

https://crates.io/crates/nextgraph

## License

Both OxiGraph and NextGraph are licensed under either of

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
  at your option.

`SPDX-License-Identifier: Apache-2.0 OR MIT`

Copyright is attributed to "Copyright (c) 2018 Oxigraph developers" for all the code corresponding to the commit [427d675c9b4e7f55308825357d8628c612b82a91](https://github.com/oxigraph/oxigraph/commit/427d675c9b4e7f55308825357d8628c612b82a91) of the OxiGraph repository on date Mon Apr 8 09:11:04 2024 +0200.

All the code added in subsequent commits have a copyright attributed to "Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers".

## NextGraph

> NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
>
> This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
>
> More info here [https://nextgraph.org](https://nextgraph.org)
