// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// This code is partly derived from work written by TG x Thoth from P2Pcollab.
// Copyright 2022 TG x Thoth
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use crate::errors::*;
use crate::log::*;
use crate::types::*;

use curve25519_dalek::edwards::{CompressedEdwardsY, EdwardsPoint};
use ed25519_dalek::*;
use futures::channel::mpsc;
use rand::rngs::OsRng;
use web_time::{SystemTime, UNIX_EPOCH};

pub fn decode_key(key_string: &str) -> Result<[u8; 32], ()> {
    let vec = base64_url::decode(key_string).map_err(|_| log_err!("key has invalid content"))?;
    Ok(*slice_as_array!(&vec, [u8; 32])
        .ok_or(())
        .map_err(|_| log_err!("key has invalid content array"))?)
}

pub fn generate_null_keypair() -> (PrivKey, PubKey) {
    let master_key: [u8; 32] = [0; 32];
    let sk = SecretKey::from_bytes(&master_key).unwrap();
    let pk: PublicKey = (&sk).into();

    let keypair = Keypair {
        public: pk,
        secret: sk,
    };

    // log_debug!(
    //     "private key: ({}) {:?}",
    //     keypair.secret.as_bytes().len(),
    //     keypair.secret.as_bytes()
    // );
    // log_debug!(
    //     "public key: ({}) {:?}",
    //     keypair.public.as_bytes().len(),
    //     keypair.public.as_bytes()
    // );
    let ed_priv_key = keypair.secret.to_bytes();
    let ed_pub_key = keypair.public.to_bytes();
    let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
    let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
    (priv_key, pub_key)
}

pub fn dh_pubkey_from_ed_slice(public: &[u8]) -> PubKey {
    let mut bits: [u8; 32] = [0u8; 32];
    bits.copy_from_slice(public);
    let compressed = CompressedEdwardsY(bits);
    let ed_point: EdwardsPoint = compressed.decompress().unwrap();
    let mon_point = ed_point.to_montgomery();
    PubKey::X25519PubKey(mon_point.to_bytes())
}

pub fn sign(
    author_privkey: PrivKey,
    author_pubkey: PubKey,
    content: &Vec<u8>,
) -> Result<Sig, NgError> {
    let kp = match (author_privkey, author_pubkey) {
        (PrivKey::Ed25519PrivKey(sk), PubKey::Ed25519PubKey(pk)) => [sk, pk].concat(),
        (_, _) => panic!("cannot sign with Montgomery keys"),
    };
    let keypair = Keypair::from_bytes(kp.as_slice())?;
    let sig_bytes = keypair.sign(content.as_slice()).to_bytes();
    let mut it = sig_bytes.chunks_exact(32);
    let mut ss: Ed25519Sig = [[0; 32], [0; 32]];
    ss[0].copy_from_slice(it.next().unwrap());
    ss[1].copy_from_slice(it.next().unwrap());
    Ok(Sig::Ed25519Sig(ss))
}

pub fn verify(content: &Vec<u8>, sig: Sig, pub_key: PubKey) -> Result<(), NgError> {
    let pubkey = match pub_key {
        PubKey::Ed25519PubKey(pk) => pk,
        _ => panic!("cannot verify with Montgomery keys"),
    };
    let pk = PublicKey::from_bytes(&pubkey)?;
    let sig_bytes = match sig {
        Sig::Ed25519Sig(ss) => [ss[0], ss[1]].concat(),
    };
    let sig = Signature::from_bytes(&sig_bytes)?;
    Ok(pk.verify_strict(content, &sig)?)
}

pub fn generate_keypair() -> (PrivKey, PubKey) {
    let mut csprng = OsRng {};
    let keypair: Keypair = Keypair::generate(&mut csprng);
    // log_debug!(
    //     "private key: ({}) {:?}",
    //     keypair.secret.as_bytes().len(),
    //     keypair.secret.as_bytes()
    // );
    // log_debug!(
    //     "public key: ({}) {:?}",
    //     keypair.public.as_bytes().len(),
    //     keypair.public.as_bytes()
    // );
    let ed_priv_key = keypair.secret.to_bytes();
    let ed_pub_key = keypair.public.to_bytes();
    let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
    let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
    (priv_key, pub_key)
}

/// returns the NextGraph Timestamp of now.
pub fn now_timestamp() -> Timestamp {
    ((SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
        - EPOCH_AS_UNIX_TIMESTAMP)
        / 60)
        .try_into()
        .unwrap()
}

pub type Receiver<T> = mpsc::UnboundedReceiver<T>;
