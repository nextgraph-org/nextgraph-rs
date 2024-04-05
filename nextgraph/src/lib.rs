#![doc(html_logo_url = "https://file.nextgraph.org/download/1fd175bb6d7d832156bd5ad4abcdee7e")]
#![doc(issue_tracker_base_url = "https://git.nextgraph.org/NextGraph/nextgraph-rs/issues")]
#![doc(html_favicon_url = "https://nextgraph.org/favicon.svg")]
//! # NextGraph framework client library
//!
//! NextGraph brings about the convergence of P2P and Semantic Web technologies, towards a decentralized, secure and privacy-preserving cloud, based on CRDTs.
//!
//! This open source ecosystem provides solutions for end-users (a platform) and software developers (a framework), wishing to use or create **decentralized** apps featuring: **live collaboration** on rich-text documents, peer to peer communication with **end-to-end encryption**, offline-first, **local-first**, portable and interoperable data, total ownership of data and software, security and privacy. Centered on repositories containing **semantic data** (RDF), **rich text**, and structured data formats like **JSON**, synced between peers belonging to permissioned groups of users, it offers strong eventual consistency, thanks to the use of **CRDTs**. Documents can be linked together, signed, shared securely, queried using the **SPARQL** language and organized into sites and containers.
//!
//! More info here [https://nextgraph.org](https://nextgraph.org). Documentation available here [https://docs.nextgraph.org](https://docs.nextgraph.org).
//!
//! ## LocalBroker, the entrypoint to NextGraph network
//!
//! `local_broker` contains the API for controlling the Local Broker, which is a reduced instance of the network Broker.
//! This is your entrypoint to NextGraph network.
//! It runs embedded in your client program, and once configured (by opening a Session), it can keep for you (on disk or in memory):
//!  - the blocks of the repos,
//!  - the connection(s) to your Server Broker
//!  - the events that you send to the Overlay, if there is no connectivity (Outbox)
//!  - A reference to the verifier (optional)
//!
//! In addition, the API for creating and managing your wallet is provided here.
//!
//! The same API is also made available in Javascript for the browser (and is used by our webapp), nodejs, in the CLI, and for all the Tauri-based Apps.
//!
//! The library requires `async-std` minimal version 1.12.0
//!
//! See [examples](https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/nextgraph/examples) for a quick start.
//!
//! ## In-memory
//!
//! With this config, no data will be persisted to disk.
//!
//! ```
//! use nextgraph::local_broker::{init_local_broker, LocalBrokerConfig};
//!
//! #[async_std::main]
//! async fn main() -> std::io::Result<()> {
//!     // initialize the local_broker with in-memory config.
//!     // all sessions will be lost when the program exits
//!     init_local_broker(Box::new(|| LocalBrokerConfig::InMemory)).await;
//!     Ok(())
//! }
//! ```

pub mod local_broker;

pub mod repo {
    pub use ng_repo::*;
}

pub mod net {
    pub use ng_net::*;
}

pub mod verifier {
    pub use ng_verifier::*;
}

pub mod wallet {
    pub use ng_wallet::*;
}
