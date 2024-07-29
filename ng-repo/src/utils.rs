// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;
use curve25519_dalek::edwards::{CompressedEdwardsY, EdwardsPoint};
use ed25519_dalek::*;
use futures::channel::mpsc;
use rand::rngs::OsRng;
use rand::RngCore;
use time::{OffsetDateTime, UtcOffset};
use web_time::{Duration, SystemTime, UNIX_EPOCH};
use zeroize::Zeroize;

use crate::errors::*;
#[allow(unused_imports)]
use crate::log::*;
use crate::types::*;

pub fn derive_key(context: &str, key_material: &[u8]) -> [u8; 32] {
    blake3::derive_key(context, key_material)
}

pub fn ed_keypair_from_priv_bytes(secret_key: [u8; 32]) -> (PrivKey, PubKey) {
    let sk = SecretKey::from_bytes(&secret_key).unwrap();
    let pk: PublicKey = (&sk).into();
    let pub_key = PubKey::Ed25519PubKey(pk.to_bytes());
    let priv_key = PrivKey::Ed25519PrivKey(secret_key);
    (priv_key, pub_key)
}

pub fn from_ed_privkey_to_dh_privkey(private: &PrivKey) -> PrivKey {
    //SecretKey and ExpandedSecretKey are Zeroized at drop
    if let PrivKey::Ed25519PrivKey(slice) = private {
        let ed25519_priv = SecretKey::from_bytes(slice).unwrap();
        let exp: ExpandedSecretKey = (&ed25519_priv).into();
        let mut exp_bytes = exp.to_bytes();
        exp_bytes[32..].zeroize();
        let mut bits = *slice_as_array!(&exp_bytes[0..32], [u8; 32]).unwrap();
        bits[0] &= 248;
        bits[31] &= 127;
        bits[31] |= 64;
        // PrivKey takes ownership and will zeroize on drop
        PrivKey::X25519PrivKey(bits)
    } else {
        panic!("this is not an Edmonds privkey")
    }
}

/// don't forget to zeroize the string later on
pub fn decode_key(key_string: &str) -> Result<PubKey, NgError> {
    let mut vec = base64_url::decode(key_string).map_err(|_| NgError::InvalidKey)?;
    vec.reverse();
    Ok(serde_bare::from_slice(&vec).map_err(|_| NgError::InvalidKey)?)
}

pub fn decode_priv_key(key_string: &str) -> Result<PrivKey, NgError> {
    let mut vec = base64_url::decode(key_string).map_err(|_| NgError::InvalidKey)?;
    vec.reverse();
    Ok(serde_bare::from_slice(&vec).map_err(|_| NgError::InvalidKey)?)
}

pub fn decode_sym_key(key_string: &str) -> Result<SymKey, NgError> {
    let mut vec = base64_url::decode(key_string).map_err(|_| NgError::InvalidKey)?;
    vec.reverse();
    Ok(serde_bare::from_slice(&vec).map_err(|_| NgError::InvalidKey)?)
}

pub fn decode_digest(key_string: &str) -> Result<crate::types::Digest, NgError> {
    let mut vec = base64_url::decode(key_string).map_err(|_| NgError::InvalidKey)?;
    vec.reverse();
    Ok(serde_bare::from_slice(&vec).map_err(|_| NgError::InvalidKey)?)
}

pub fn decode_overlayid(id_string: &str) -> Result<OverlayId, NgError> {
    let mut vec = base64_url::decode(id_string).map_err(|_| NgError::InvalidKey)?;
    vec.reverse();
    Ok(serde_bare::from_slice(&vec).map_err(|_| NgError::InvalidKey)?)
}

pub fn ed_privkey_to_ed_pubkey(privkey: &PrivKey) -> PubKey {
    // SecretKey is zeroized on drop (3 lines below) se we are safe
    let sk = SecretKey::from_bytes(privkey.slice()).unwrap();
    let pk: PublicKey = (&sk).into();
    PubKey::Ed25519PubKey(pk.to_bytes())
}

/// use with caution. it should be embedded in a zeroize struct in order to be safe
pub fn random_key() -> [u8; 32] {
    let mut sk = [0u8; 32];
    let mut csprng = OsRng {};
    csprng.fill_bytes(&mut sk);
    sk
}

pub fn generate_null_ed_keypair() -> (PrivKey, PubKey) {
    // we don't use zeroize because... well, it is already a zeroized privkey ;)
    let master_key: [u8; 32] = [0; 32];
    let sk = SecretKey::from_bytes(&master_key).unwrap();
    let pk: PublicKey = (&sk).into();
    let priv_key = PrivKey::Ed25519PrivKey(sk.to_bytes());
    let pub_key = PubKey::Ed25519PubKey(pk.to_bytes());
    (priv_key, pub_key)
}

pub fn dh_pubkey_from_ed_pubkey_slice(public: &[u8]) -> PubKey {
    PubKey::X25519PubKey(dh_pubkey_array_from_ed_pubkey_slice(public))
}

pub fn dh_pubkey_array_from_ed_pubkey_slice(public: &[u8]) -> X25519PubKey {
    let mut bits: [u8; 32] = [0u8; 32];
    bits.copy_from_slice(public);
    let compressed = CompressedEdwardsY(bits);
    let ed_point: EdwardsPoint = compressed.decompress().unwrap();
    //compressed.zeroize();
    let mon_point = ed_point.to_montgomery();
    //ed_point.zeroize();
    let array = mon_point.to_bytes();
    //mon_point.zeroize();
    array
}

pub fn pubkey_privkey_to_keypair(pubkey: &PubKey, privkey: &PrivKey) -> Keypair {
    match (privkey, pubkey) {
        (PrivKey::Ed25519PrivKey(sk), PubKey::Ed25519PubKey(pk)) => {
            let secret = SecretKey::from_bytes(sk).unwrap();
            let public = PublicKey::from_bytes(pk).unwrap();

            Keypair { secret, public }
        }
        (_, _) => panic!("cannot sign with Montgomery keys"),
    }
}

pub fn keypair_from_ed(secret: SecretKey, public: PublicKey) -> (PrivKey, PubKey) {
    let ed_priv_key = secret.to_bytes();
    let ed_pub_key = public.to_bytes();
    let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
    let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
    (priv_key, pub_key)
}

pub fn sign(
    author_privkey: &PrivKey,
    author_pubkey: &PubKey,
    content: &Vec<u8>,
) -> Result<Sig, NgError> {
    let keypair = pubkey_privkey_to_keypair(author_pubkey, author_privkey);
    let sig_bytes = keypair.sign(content.as_slice()).to_bytes();
    // log_debug!(
    //     "XXXX SIGN {:?} {:?} {:?}",
    //     author_pubkey,
    //     content.as_slice(),
    //     sig_bytes
    // );
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
    let sig = ed25519_dalek::Signature::from_bytes(&sig_bytes)?;
    Ok(pk.verify_strict(content, &sig)?)
}

pub fn generate_keypair() -> (PrivKey, PubKey) {
    let mut csprng = OsRng {};
    let keypair: Keypair = Keypair::generate(&mut csprng);
    let ed_priv_key = keypair.secret.to_bytes();
    let ed_pub_key = keypair.public.to_bytes();
    let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
    let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
    (priv_key, pub_key)
}

pub fn encrypt_in_place(plaintext: &mut Vec<u8>, key: [u8; 32], nonce: [u8; 12]) {
    let mut cipher = ChaCha20::new(&key.into(), &nonce.into());
    let mut content_dec_slice = plaintext.as_mut_slice();
    cipher.apply_keystream(&mut content_dec_slice);
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

/// returns a new NextGraph Timestamp equivalent to the duration after now.
pub fn timestamp_after(duration: Duration) -> Timestamp {
    (((SystemTime::now().duration_since(UNIX_EPOCH).unwrap() + duration).as_secs()
        - EPOCH_AS_UNIX_TIMESTAMP)
        / 60)
        .try_into()
        .unwrap()
}

/// displays the NextGraph Timestamp in UTC.
#[cfg(not(target_arch = "wasm32"))]
pub fn display_timestamp(ts: &Timestamp) -> String {
    let dur =
        Duration::from_secs(EPOCH_AS_UNIX_TIMESTAMP) + Duration::from_secs(*ts as u64 * 60u64);

    let dt: OffsetDateTime = OffsetDateTime::UNIX_EPOCH + dur;

    dt.format(&time::format_description::parse("[day]/[month]/[year] [hour]:[minute] UTC").unwrap())
        .unwrap()
}

/// displays the NextGraph Timestamp in local time for the history (JS)
pub fn display_timestamp_local(ts: Timestamp) -> String {
    let dur = Duration::from_secs(EPOCH_AS_UNIX_TIMESTAMP) + Duration::from_secs(ts as u64 * 60u64);

    let dt: OffsetDateTime = OffsetDateTime::UNIX_EPOCH + dur;

    let dt = dt.to_offset(TIMEZONE_OFFSET.clone());
    dt.format(
        &time::format_description::parse("[day]/[month]/[year repr:last_two] [hour]:[minute]")
            .unwrap(),
    )
    .unwrap()
}

use lazy_static::lazy_static;
lazy_static! {
    static ref TIMEZONE_OFFSET: UtcOffset = unsafe {
        time::util::local_offset::set_soundness(time::util::local_offset::Soundness::Unsound);
        UtcOffset::current_local_offset().unwrap()
    };
}

pub(crate) type Receiver<T> = mpsc::UnboundedReceiver<T>;

#[cfg(test)]
mod test {
    use crate::{
        log::*,
        utils::{display_timestamp_local, now_timestamp},
    };

    #[test]
    pub fn test_time() {
        let time = now_timestamp() + 120; // 2 hours later
        log_info!("{}", display_timestamp_local(time));
    }

    #[test]
    pub fn test_locales() {
        let list = vec!["C", "c", "aa-bb-cc-dd", "aa-ff_bb.456d"];
        let res: Vec<String> = list
            .iter()
            .filter_map(|lang| {
                if *lang == "C" || *lang == "c" {
                    None
                } else {
                    let mut split = lang.split('.');
                    let code = split.next().unwrap();
                    let code = code.replace("_", "-");
                    let mut split = code.rsplitn(2, '-');
                    let country = split.next().unwrap();
                    Some(match split.next() {
                        Some(next) => format!("{}-{}", next, country.to_uppercase()),
                        None => country.to_string(),
                    })
                }
            })
            .collect();
        log_debug!("{:?}", res);
    }
}
