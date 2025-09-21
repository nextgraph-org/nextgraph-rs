#![doc(html_logo_url = "https://nextgraph.org/nextgraph-logo-192.png")]
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
//!  - A reference to the verifier
//!
//! In addition, the API for creating and managing your wallet is provided here.
//!
//! The Rust API is used internally in the CLI, and for all the Tauri-based Apps.
//!
//! The same API is also made available in Javascript for the browser (and is used by our webapp) and for nodejs. See the npm package [ng-sdk-js](https://www.npmjs.com/package/ng-sdk-js) or [nextgraph](https://www.npmjs.com/package/nextgraph)
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
//!
//!     // see https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/nextgraph/examples/in_memory.md
//!     // for a full example of what the Rust API gives you
//!
//!     Ok(())
//! }
//! ```
//!
//! ## Persistent
//!
//! With this config, the encrypted wallet, session information, outbox, and all user data will be saved locally, with encryption at rest.
//!
//! ```
//! use nextgraph::local_broker::{init_local_broker, LocalBrokerConfig};
//!
//! #[async_std::main]
//! async fn main() -> std::io::Result<()> {
//!     // initialize the local_broker with in-memory config.
//!     // all sessions will be lost when the program exits
//!     let mut current_path = current_dir()?;
//!     current_path.push(".ng");
//!     current_path.push("example");
//!     create_dir_all(current_path.clone())?;
//!
//!     // initialize the local_broker with config to save to disk in a folder called `.ng/example` in the current directory
//!     init_local_broker(Box::new(move || {
//!         LocalBrokerConfig::BasePath(current_path.clone())
//!     })).await;
//!
//!     // see https://git.nextgraph.org/NextGraph/nextgraph-rs/src/branch/master/nextgraph/examples/persistent.md
//!     // for a full example of what the Rust API gives you
//!
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
    pub use ng_verifier::site::*;
    pub use ng_verifier::types::*;
    pub mod protocol {
        pub use ng_net::app_protocol::*;
    }
    pub mod orm {
        pub use ng_verifier::orm::*;
    }
    pub use ng_verifier::prepare_app_response_for_js;
    pub use ng_verifier::read_triples_in_app_response_from_rust;
    pub use ng_verifier::triples_ser_to_json_string;
}

pub mod wallet {
    pub use ng_wallet::*;
}

pub fn get_device_name() -> String {
    let mut list: Vec<String> = Vec::with_capacity(3);
    #[cfg(not(target_arch = "wasm32"))]
    if let Ok(realname) = whoami::fallible::realname() {
        list.push(realname);
    } else {
        #[cfg(not(target_arch = "wasm32"))]
        if let Ok(username) = whoami::fallible::username() {
            list.push(username);
        }
    }
    if let Ok(devicename) = whoami::fallible::devicename() {
        list.push(devicename);
    } else {
        #[cfg(not(target_arch = "wasm32"))]
        if let Ok(hostname) = whoami::fallible::hostname() {
            list.push(hostname);
        } else {
            if let Ok(distro) = whoami::fallible::distro() {
                list.push(distro);
            }
        }
    }
    #[cfg(target_arch = "wasm32")]
    if let Ok(distro) = whoami::fallible::distro() {
        list.push(distro.replace("Unknown ",""));
    }

    list.join(" ")
}

#[cfg(debug_assertions)]
mod local_broker_dev_env;
