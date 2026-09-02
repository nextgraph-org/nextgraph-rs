// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};
use futures::channel::mpsc;
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::{Digest as Sha2Digest, Sha512};
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
    let sk = SigningKey::from_bytes(&secret_key);
    let pub_key = PubKey::Ed25519PubKey(sk.verifying_key().to_bytes());
    let priv_key = PrivKey::Ed25519PrivKey(secret_key);
    (priv_key, pub_key)
}

pub fn from_ed_privkey_to_dh_privkey(private: &PrivKey) -> PrivKey {
    if let PrivKey::Ed25519PrivKey(slice) = private {
        // The X25519 private key is the first half of SHA-512 over the Ed25519
        // seed, clamped. `ed25519_dalek::hazmat::ExpandedSecretKey` looks like
        // the natural replacement for the 1.x expansion used here, but it is
        // not: since 2.x it stores the scalar reduced modulo the group order,
        // and those bytes are not the clamped bytes. Using it would silently
        // change every device's X25519 key, so the expansion stays explicit.
        let mut expanded = [0u8; 64];
        expanded.copy_from_slice(Sha512::digest(slice).as_slice());
        let mut bits = [0u8; 32];
        bits.copy_from_slice(&expanded[0..32]);
        expanded.zeroize();
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
    let mut seed = [0u8; 32];
    seed.copy_from_slice(privkey.slice());
    let sk = SigningKey::from_bytes(&seed);
    seed.zeroize();
    PubKey::Ed25519PubKey(sk.verifying_key().to_bytes())
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
    let sk = SigningKey::from_bytes(&master_key);
    let priv_key = PrivKey::Ed25519PrivKey(sk.to_bytes());
    let pub_key = PubKey::Ed25519PubKey(sk.verifying_key().to_bytes());
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

/// The signing key for a keypair, refusing a public key that does not belong
/// to the private key.
///
/// Finding F1. The 1.x API let a `Keypair` be assembled from a secret and an
/// unrelated public key, and signing with such a pair leaks the secret. That
/// was reachable here, because the topic keypair reaching [`sign`] is
/// decrypted from commit content without authentication, so a flipped
/// ciphertext bit produced exactly the mismatched pair the attack needs. The
/// 2.x API removes the shape by deriving the public key from the secret, and
/// this function fails closed rather than signing under a different identity.
/// Montgomery keys now return an error instead of panicking.
fn signing_key_checked(pubkey: &PubKey, privkey: &PrivKey) -> Result<SigningKey, NgError> {
    match (privkey, pubkey) {
        (PrivKey::Ed25519PrivKey(sk), PubKey::Ed25519PubKey(pk)) => {
            let signing = SigningKey::from_bytes(sk);
            if signing.verifying_key().to_bytes() != *pk {
                return Err(NgError::InvalidKey);
            }
            Ok(signing)
        }
        (_, _) => Err(NgError::InvalidKey),
    }
}

pub fn keypair_from_ed(secret: SigningKey, public: VerifyingKey) -> (PrivKey, PubKey) {
    let ed_priv_key = secret.to_bytes();
    let ed_pub_key = public.to_bytes();
    let pub_key = PubKey::Ed25519PubKey(ed_pub_key);
    let priv_key = PrivKey::Ed25519PrivKey(ed_priv_key);
    (priv_key, pub_key)
}

pub fn sign(
    author_privkey: &PrivKey,
    author_pubkey: &PubKey,
    content: &[u8],
) -> Result<Sig, NgError> {
    let signing = signing_key_checked(author_pubkey, author_privkey)?;
    let sig_bytes = signing.sign(content).to_bytes();
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

pub fn verify(content: &[u8], sig: Sig, pub_key: PubKey) -> Result<(), NgError> {
    let pubkey = match pub_key {
        PubKey::Ed25519PubKey(pk) => pk,
        // Was a panic, which a peer could reach with a crafted key.
        _ => return Err(NgError::InvalidKey),
    };
    let pk = VerifyingKey::from_bytes(&pubkey)?;
    let mut sig_bytes = [0u8; 64];
    match sig {
        Sig::Ed25519Sig(ss) => {
            sig_bytes[..32].copy_from_slice(&ss[0]);
            sig_bytes[32..].copy_from_slice(&ss[1]);
        }
    }
    let sig = Signature::from_bytes(&sig_bytes);
    Ok(pk.verify_strict(content, &sig)?)
}

pub fn generate_keypair() -> (PrivKey, PubKey) {
    // Same construction as `SigningKey::generate`, which fills a 32 byte seed
    // from the RNG. Written out so this crate keeps one RNG, `rand` 0.7, which
    // `ng_threshold_crypto` still requires; see finding F7.
    let mut seed = random_key();
    let signing = SigningKey::from_bytes(&seed);
    let priv_key = PrivKey::Ed25519PrivKey(seed);
    let pub_key = PubKey::Ed25519PubKey(signing.verifying_key().to_bytes());
    seed.zeroize();
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

pub fn now_precise_timestamp() -> (u64, u32) {
    let dur = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    (dur.as_secs(), dur.subsec_nanos())
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

#[cfg(test)]
mod dalek_upgrade_compat {
    //! Golden vectors pinning the byte level behaviour of every key derivation
    //! and signature in this module. They were captured on the `ed25519-dalek`
    //! 1.0.1 tree and must keep passing after the 2.x and `curve25519-dalek`
    //! 4.x upgrade, which is how findings F1 and F2 are shown to change no
    //! stored or wire format. The X25519 case is the one that matters most: a
    //! migration using `hazmat::ExpandedSecretKey` reduces the scalar modulo
    //! the group order and would change every device's key, and this test
    //! fails if anyone tries it.

    use super::*;

    const SEED: [u8; 32] = [
        7, 200, 3, 91, 45, 210, 17, 88, 129, 240, 6, 61, 155, 22, 74, 199, 31, 8, 250, 143, 12, 65,
        180, 99, 254, 37, 118, 5, 220, 71, 160, 33,
    ];

    const ED_PUB: &str = "77f8186435b89caad9a4b439af66a878f75d0682a4ad629018c1a3f6ae912712";
    const DH_PRIV: &str = "6008c41b7e9f611935308890afbaeca0c5a47feb8030e9abd0d0a7c0b3483967";
    const DH_PUB: &str = "4c66d3e675fc1356a8480d7410c9b890962d31ba74b4fec0c20e9fa1db52a97a";
    const SIG: &str = "441e5d56cd8130c51335c125386ad885e5765d889ae8412a87b1e29e413b872db878fffee70ab5c4562016ba56b1583f922d1e1b5c04e7fb51cd246892e6de00";
    const NULL_PUB: &str = "3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29";

    fn hex(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{b:02x}")).collect()
    }

    #[test]
    fn key_derivation_is_unchanged() {
        let (priv_key, pub_key) = ed_keypair_from_priv_bytes(SEED);
        assert_eq!(hex(pub_key.slice()), ED_PUB, "ed25519 public key changed");
        assert_eq!(
            hex(ed_privkey_to_ed_pubkey(&priv_key).slice()),
            ED_PUB,
            "ed_privkey_to_ed_pubkey disagrees with ed_keypair_from_priv_bytes"
        );
        assert_eq!(
            hex(from_ed_privkey_to_dh_privkey(&priv_key).slice()),
            DH_PRIV,
            "X25519 private key changed, so every device identity would change"
        );
        assert_eq!(
            hex(&dh_pubkey_array_from_ed_pubkey_slice(pub_key.slice())),
            DH_PUB,
            "X25519 public key changed"
        );
        let (_, null_pub) = generate_null_ed_keypair();
        assert_eq!(hex(null_pub.slice()), NULL_PUB, "null keypair changed");
    }

    #[test]
    fn signatures_are_unchanged() {
        let (priv_key, pub_key) = ed_keypair_from_priv_bytes(SEED);
        let Sig::Ed25519Sig(ss) = sign(&priv_key, &pub_key, b"localfirst golden vector").unwrap();
        assert_eq!(format!("{}{}", hex(&ss[0]), hex(&ss[1])), SIG);
        verify(
            b"localfirst golden vector",
            Sig::Ed25519Sig(ss),
            pub_key.clone(),
        )
        .expect("a signature this crate produced must verify");
    }

    /// Finding F1. Signing must refuse a public key that does not belong to
    /// the private key, rather than producing a signature that leaks the
    /// secret. Before the 2.x upgrade this call returned a signature.
    #[test]
    fn signing_refuses_a_mismatched_public_key() {
        let (priv_key, _) = ed_keypair_from_priv_bytes(SEED);
        let (_, other_pub) = ed_keypair_from_priv_bytes([9u8; 32]);
        let err = sign(&priv_key, &other_pub, b"oracle").unwrap_err();
        assert_eq!(err, NgError::InvalidKey);
    }

    /// Montgomery keys used to panic on both paths, which a peer could reach.
    #[test]
    fn montgomery_keys_error_rather_than_panic() {
        let (priv_key, pub_key) = ed_keypair_from_priv_bytes(SEED);
        let dh_priv = from_ed_privkey_to_dh_privkey(&priv_key);
        let dh_pub = dh_pubkey_from_ed_pubkey_slice(pub_key.slice());
        assert_eq!(sign(&dh_priv, &pub_key, b"x").unwrap_err(), NgError::InvalidKey);
        assert_eq!(
            verify(b"x", Sig::Ed25519Sig([[0; 32], [0; 32]]), dh_pub).unwrap_err(),
            NgError::InvalidKey
        );
    }
}
