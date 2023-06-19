/*
 * Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

use async_std::task;
use ed25519_dalek::*;
use futures::{channel::mpsc, select, Future, FutureExt, SinkExt};
pub use noise_protocol::U8Array;
use noise_protocol::DH;
pub use noise_rust_crypto::sensitive::Sensitive;
use p2p_repo::log::*;
use p2p_repo::types::PubKey;

#[cfg(target_arch = "wasm32")]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + 'static,
{
    task::spawn_local(async move {
        if let Err(e) = fut.await {
            log_err!("EXCEPTION {}", e)
        }
    })
}
#[cfg(target_arch = "wasm32")]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub type ResultSend<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

#[cfg(not(target_arch = "wasm32"))]
pub fn spawn_and_log_error<F>(fut: F) -> task::JoinHandle<()>
where
    F: Future<Output = ResultSend<()>> + Send + 'static,
{
    task::spawn(async move {
        if let Err(e) = fut.await {
            log_err!("{}", e)
        }
    })
}

pub type Sender<T> = mpsc::UnboundedSender<T>;
pub type Receiver<T> = mpsc::UnboundedReceiver<T>;

pub fn keys_from_bytes(secret_key: [u8; 32]) -> (Sensitive<[u8; 32]>, PubKey) {
    let sk = SecretKey::from_bytes(&secret_key).unwrap();
    let pk: PublicKey = (&sk).into();

    let pub_key = PubKey::Ed25519PubKey(pk.to_bytes());

    let priv_key = Sensitive::<[u8; 32]>::from_slice(&secret_key);
    (priv_key, pub_key)
}

pub fn gen_keys() -> (Sensitive<[u8; 32]>, [u8; 32]) {
    let pri = noise_rust_crypto::X25519::genkey();
    let publ = noise_rust_crypto::X25519::pubkey(&pri);
    (pri, publ)
}

pub struct Dual25519Keys {
    pub x25519_priv: Sensitive<[u8; 32]>,
    pub x25519_public: [u8; 32],
    pub ed25519_priv: SecretKey,
    pub ed25519_pub: PublicKey,
}

impl Dual25519Keys {
    pub fn generate() -> Self {
        let mut x25519_priv = Sensitive::<[u8; 32]>::new();
        getrandom::getrandom(&mut *x25519_priv).expect("getrandom failed");

        let ed25519_priv = SecretKey::from_bytes(&x25519_priv.as_slice()).unwrap();
        let ed25519_pub: PublicKey = (&ed25519_priv).into();

        x25519_priv[0] &= 248;
        x25519_priv[31] &= 127;
        x25519_priv[31] |= 64;

        let x25519_public = noise_rust_crypto::X25519::pubkey(&x25519_priv);

        Self {
            x25519_priv,
            x25519_public,
            ed25519_priv,
            ed25519_pub,
        }
    }
}
