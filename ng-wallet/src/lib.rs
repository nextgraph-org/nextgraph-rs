// Copyright (c) 2022-2023 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

// #[macro_use]
// extern crate slice_as_array;

#[macro_use]
extern crate lazy_static;

pub mod types;

pub mod bip39;

pub mod emojis;

use std::{collections::HashMap, io::Cursor};

use crate::bip39::bip39_wordlist;
use crate::types::*;
use aes_gcm_siv::{
    aead::{heapless::Vec as HeaplessVec, AeadInPlace, KeyInit},
    Aes256GcmSiv, Nonce,
};
use argon2::{Algorithm, Argon2, AssociatedData, ParamsBuilder, Version};
use chacha20poly1305::XChaCha20Poly1305;
use zeroize::{Zeroize, ZeroizeOnDrop};

use image::{imageops::FilterType, io::Reader as ImageReader, ImageOutputFormat};
use safe_transmute::transmute_to_bytes;

use p2p_net::types::{SiteType, SiteV0};
use p2p_repo::types::{PubKey, Timestamp};
use p2p_repo::utils::{generate_keypair, now_timestamp, sign, verify};
use p2p_repo::{log::*, types::PrivKey};
use rand::prelude::*;
use serde_bare::{from_slice, to_vec};
use web_time::Instant;

pub fn enc_master_key(
    master_key: &[u8; 32],
    key: &[u8; 32],
    nonce: u8,
    wallet_id: WalletId,
) -> Result<[u8; 48], NgWalletError> {
    let cipher = Aes256GcmSiv::new(key.into());
    let mut nonce_buffer = [0u8; 12];
    nonce_buffer[0] = nonce;
    let nonce = Nonce::from_slice(&nonce_buffer);

    let mut buffer: HeaplessVec<u8, 48> = HeaplessVec::new(); // Note: buffer needs 16-bytes overhead for auth tag
    buffer.extend_from_slice(master_key);

    // Encrypt `buffer` in-place, replacing the plaintext contents with ciphertext
    cipher
        .encrypt_in_place(nonce, &to_vec(&wallet_id).unwrap(), &mut buffer)
        .map_err(|e| NgWalletError::EncryptionError)?;

    // `buffer` now contains the encrypted master key
    // log_debug!("cipher {:?}", buffer);
    Ok(buffer.into_array::<48>().unwrap())
}

pub fn dec_master_key(
    ciphertext: [u8; 48],
    key: &[u8; 32],
    nonce: u8,
    wallet_id: WalletId,
) -> Result<[u8; 32], NgWalletError> {
    let cipher = Aes256GcmSiv::new(key.into());
    let mut nonce_buffer = [0u8; 12];
    nonce_buffer[0] = nonce;
    let nonce = Nonce::from_slice(&nonce_buffer);

    let mut buffer: HeaplessVec<u8, 48> = HeaplessVec::from_slice(&ciphertext).unwrap(); // Note: buffer needs 16-bytes overhead for auth tag

    // Decrypt `buffer` in-place, replacing its ciphertext context with the original plaintext
    cipher
        .decrypt_in_place(nonce, &to_vec(&wallet_id).unwrap(), &mut buffer)
        .map_err(|e| NgWalletError::DecryptionError)?;
    Ok(buffer.into_array::<32>().unwrap())
}

fn gen_nonce(peer_id: PubKey, nonce: u64) -> [u8; 24] {
    let mut buffer = Vec::with_capacity(24);
    buffer.extend_from_slice(&peer_id.slice()[0..16]);
    buffer.extend_from_slice(&nonce.to_be_bytes());
    buffer.try_into().unwrap()
}

fn gen_associated_data(timestamp: Timestamp, wallet_id: WalletId) -> Vec<u8> {
    let ser_wallet = to_vec(&wallet_id).unwrap();
    [ser_wallet, timestamp.to_be_bytes().to_vec()].concat()
}

pub fn enc_wallet_log(
    log: &WalletLog,
    master_key: &[u8; 32],
    peer_id: PubKey,
    nonce: u64,
    timestamp: Timestamp,
    wallet_id: WalletId,
) -> Result<Vec<u8>, NgWalletError> {
    let ser_log = to_vec(log).map_err(|e| NgWalletError::InternalError)?;

    let nonce_buffer: [u8; 24] = gen_nonce(peer_id, nonce);

    let cipher = XChaCha20Poly1305::new(master_key.into());

    let mut buffer: Vec<u8> = Vec::with_capacity(ser_log.len() + 16); // Note: buffer needs 16-bytes overhead for auth tag
    buffer.extend_from_slice(&ser_log);

    // Encrypt `buffer` in-place, replacing the plaintext contents with ciphertext
    cipher
        .encrypt_in_place(
            &nonce_buffer.into(),
            &gen_associated_data(timestamp, wallet_id),
            &mut buffer,
        )
        .map_err(|e| NgWalletError::EncryptionError)?;

    // `buffer` now contains the message ciphertext
    // log_debug!("encrypted_block ciphertext {:?}", buffer);

    Ok(buffer)
}

pub fn dec_session(key: PrivKey, vec: &Vec<u8>) -> Result<SessionWalletStorageV0, NgWalletError> {
    let session_ser = crypto_box::seal_open(&(*key.to_dh().slice()).into(), vec)
        .map_err(|_| NgWalletError::DecryptionError)?;
    let session: SessionWalletStorage =
        serde_bare::from_slice(&session_ser).map_err(|_| NgWalletError::SerializationError)?;
    let SessionWalletStorage::V0(v0) = session;
    Ok(v0)
}

pub fn create_new_session(
    wallet_id: PubKey,
    user: PubKey,
) -> Result<(SessionWalletStorageV0, Vec<u8>), NgWalletError> {
    let peer = generate_keypair();
    let mut sws = SessionWalletStorageV0::new();
    let sps = SessionPeerStorageV0 {
        user,
        peer_key: peer.0,
        last_wallet_nonce: 0,
        branches_last_seq: HashMap::new(),
    };
    sws.users.insert(user.to_string(), sps);
    let sws_ser = serde_bare::to_vec(&SessionWalletStorage::V0(sws.clone())).unwrap();
    let mut rng = crypto_box::aead::OsRng {};
    let cipher = crypto_box::seal(&mut rng, &wallet_id.to_dh_slice().into(), &sws_ser)
        .map_err(|_| NgWalletError::EncryptionError)?;
    Ok((sws, cipher))
}

pub fn dec_encrypted_block(
    mut ciphertext: Vec<u8>,
    master_key: &mut [u8; 32],
    peer_id: PubKey,
    nonce: u64,
    timestamp: Timestamp,
    wallet_id: WalletId,
) -> Result<EncryptedWalletV0, NgWalletError> {
    let nonce_buffer: [u8; 24] = gen_nonce(peer_id, nonce);

    let cipher = XChaCha20Poly1305::new(master_key.as_ref().into());

    // Decrypt `ciphertext` in-place, replacing its ciphertext context with the original plaintext
    cipher
        .decrypt_in_place(
            &nonce_buffer.into(),
            &gen_associated_data(timestamp, wallet_id),
            &mut ciphertext,
        )
        .map_err(|e| NgWalletError::DecryptionError)?;

    let decrypted_log =
        from_slice::<WalletLog>(&ciphertext).map_err(|e| NgWalletError::DecryptionError)?;

    master_key.zeroize();

    // `ciphertext` now contains the decrypted block
    //log_debug!("decrypted_block {:?}", ciphertext);

    match decrypted_log {
        WalletLog::V0(v0) => v0.reduce(),
    }
}

pub fn derive_key_from_pass(mut pass: Vec<u8>, salt: [u8; 16], wallet_id: WalletId) -> [u8; 32] {
    let params = ParamsBuilder::new()
        .m_cost(10 * 1024)
        .t_cost(12)
        .p_cost(1)
        .data(AssociatedData::new(wallet_id.slice()).unwrap())
        .output_len(32)
        .build()
        .unwrap();
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8; 32];
    argon.hash_password_into(&pass, &salt, &mut out).unwrap();
    pass.zeroize();
    out
}

pub fn open_wallet_with_pazzle(
    wallet: Wallet,
    pazzle: Vec<u8>,
    mut pin: [u8; 4],
) -> Result<EncryptedWallet, NgWalletError> {
    // each digit shouldnt be greater than 9
    if pin[0] > 9 || pin[1] > 9 || pin[2] > 9 || pin[3] > 9 {
        return Err(NgWalletError::InvalidPin);
    }

    let opening_pazzle = Instant::now();

    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let mut pazzle_key = derive_key_from_pass(
                [pazzle, pin.to_vec()].concat(),
                v0.content.salt_pazzle,
                v0.id,
            );
            //pazzle.zeroize();
            pin.zeroize();

            let mut master_key = dec_master_key(
                v0.content.enc_master_key_pazzle,
                &pazzle_key,
                v0.content.master_nonce,
                v0.id,
            )?;
            pazzle_key.zeroize();

            log_debug!(
                "opening of wallet with pazzle took: {} ms",
                opening_pazzle.elapsed().as_millis()
            );

            Ok(EncryptedWallet::V0(dec_encrypted_block(
                v0.content.encrypted,
                &mut master_key,
                v0.content.peer_id,
                v0.content.nonce,
                v0.content.timestamp,
                v0.id,
            )?))
        }
    }
}

pub fn open_wallet_with_mnemonic(
    wallet: Wallet,
    mut mnemonic: [u16; 12],
    mut pin: [u8; 4],
) -> Result<EncryptedWallet, NgWalletError> {
    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let mut mnemonic_key = derive_key_from_pass(
                [transmute_to_bytes(&mnemonic), &pin].concat(),
                v0.content.salt_mnemonic,
                v0.id,
            );
            mnemonic.zeroize();
            pin.zeroize();

            let mut master_key = dec_master_key(
                v0.content.enc_master_key_mnemonic,
                &mnemonic_key,
                v0.content.master_nonce,
                v0.id,
            )?;
            mnemonic_key.zeroize();

            Ok(EncryptedWallet::V0(dec_encrypted_block(
                v0.content.encrypted,
                &mut master_key,
                v0.content.peer_id,
                v0.content.nonce,
                v0.content.timestamp,
                v0.id,
            )?))
        }
    }
}

pub fn display_mnemonic(mnemonic: &[u16; 12]) -> Vec<String> {
    let res: Vec<String> = mnemonic
        .into_iter()
        .map(|i| String::from(bip39_wordlist[*i as usize]))
        .collect();
    res
}

use crate::emojis::{EMOJIS, EMOJI_CAT};

pub fn display_pazzle(pazzle: &Vec<u8>) -> Vec<String> {
    let res: Vec<String> = pazzle
        .into_iter()
        .map(|i| {
            let cat = i >> 4;
            let idx = i & 15;
            let cat_str = EMOJI_CAT[cat as usize];
            String::from(format!(
                "{}:{}",
                cat_str,
                EMOJIS.get(cat_str).unwrap()[idx as usize].code
            ))
        })
        .collect();
    res
}

pub fn gen_shuffle_for_pazzle_opening(pazzle_length: u8) -> ShuffledPazzle {
    let mut rng = rand::thread_rng();
    let mut category_indices: Vec<u8> = (0..pazzle_length).collect();
    //log_debug!("{:?}", category_indices);
    category_indices.shuffle(&mut rng);
    //log_debug!("{:?}", category_indices);

    let mut emoji_indices: Vec<Vec<u8>> = Vec::with_capacity(pazzle_length.into());
    for _ in 0..pazzle_length {
        let mut idx: Vec<u8> = (0..15).collect();
        //log_debug!("{:?}", idx);
        idx.shuffle(&mut rng);
        //log_debug!("{:?}", idx);
        emoji_indices.push(idx)
    }
    ShuffledPazzle {
        category_indices,
        emoji_indices,
    }
}

pub fn gen_shuffle_for_pin() -> Vec<u8> {
    let mut rng = rand::thread_rng();
    let mut digits: Vec<u8> = (0..10).collect();
    //log_debug!("{:?}", digits);
    digits.shuffle(&mut rng);
    //log_debug!("{:?}", digits);
    digits
}

// fn random_pass() {
//     const choices: &str =
//         "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";

//     let mut ran = thread_rng();

//     let mut mnemonic: [char; 11] = [0.into(); 11];
//     for i in &mut mnemonic {
//         *i = choices.chars().nth(ran.gen_range(0, 72)).unwrap();
//     }
//     log_debug!("{}", mnemonic.iter().collect::<String>());
// }

/// creates a Wallet from a pin, a security text and image (with option to send the bootstrap and wallet to nextgraph.one)
/// and returns the Wallet, the pazzle and the mnemonic
pub async fn create_wallet_v0(
    mut params: CreateWalletV0,
) -> Result<CreateWalletResultV0, NgWalletError> {
    let creating_pazzle = Instant::now();

    // pazzle_length can only be 9, 12, or 15
    if params.pazzle_length != 9
        && params.pazzle_length != 12
        && params.pazzle_length != 15
        && params.pazzle_length != 0
    {
        return Err(NgWalletError::InvalidPazzleLength);
    }

    // check validity of PIN

    // shouldn't start with 0
    // if params.pin[0] == 0 {
    //     return Err(NgWalletError::InvalidPin);
    // }

    // each digit shouldnt be greater than 9
    if params.pin[0] > 9 || params.pin[1] > 9 || params.pin[2] > 9 || params.pin[3] > 9 {
        return Err(NgWalletError::InvalidPin);
    }

    // check for same digit doesnt appear 3 times
    if (params.pin[0] == params.pin[1] && params.pin[0] == params.pin[2])
        || (params.pin[0] == params.pin[1] && params.pin[0] == params.pin[3])
        || (params.pin[0] == params.pin[2] && params.pin[0] == params.pin[3])
        || (params.pin[1] == params.pin[2] && params.pin[1] == params.pin[3])
    {
        return Err(NgWalletError::InvalidPin);
    }

    // check for ascending series
    if params.pin[1] == params.pin[0] + 1
        && params.pin[2] == params.pin[1] + 1
        && params.pin[3] == params.pin[2] + 1
    {
        return Err(NgWalletError::InvalidPin);
    }

    // check for descending series
    if params.pin[3] >= 3
        && params.pin[2] == params.pin[3] - 1
        && params.pin[1] == params.pin[2] - 1
        && params.pin[0] == params.pin[1] - 1
    {
        return Err(NgWalletError::InvalidPin);
    }

    // check validity of security text
    let words: Vec<_> = params.security_txt.split_whitespace().collect();
    let new_string = words.join(" ");
    let count = new_string.chars().count();
    if count < 10 || count > 100 {
        return Err(NgWalletError::InvalidSecurityText);
    }

    // check validity of image
    let decoded_img = ImageReader::new(Cursor::new(&params.security_img))
        .with_guessed_format()
        .map_err(|e| NgWalletError::InvalidSecurityImage)?
        .decode()
        .map_err(|e| NgWalletError::InvalidSecurityImage)?;

    if decoded_img.height() < 150 || decoded_img.width() < 150 {
        return Err(NgWalletError::InvalidSecurityImage);
    }

    let resized_img = if decoded_img.height() == 400 && decoded_img.width() == 400 {
        decoded_img
    } else {
        decoded_img.resize_to_fill(400, 400, FilterType::Triangle)
    };

    let buffer: Vec<u8> = Vec::with_capacity(100000);
    let mut cursor = Cursor::new(buffer);
    resized_img
        .write_to(&mut cursor, ImageOutputFormat::Jpeg(72))
        .map_err(|e| NgWalletError::InvalidSecurityImage)?;

    // creating the wallet keys

    let (wallet_privkey, wallet_id) = generate_keypair();

    let site = SiteV0::create(SiteType::Individual).map_err(|e| NgWalletError::InternalError)?;

    // let mut pazzle_random = vec![0u8; pazzle_length.into()];
    // getrandom::getrandom(&mut pazzle_random).map_err(|e| NgWalletError::InternalError)?;

    let mut ran = thread_rng();

    let mut category_indices: Vec<u8> = (0..params.pazzle_length).collect();
    category_indices.shuffle(&mut ran);

    let mut pazzle = vec![0u8; params.pazzle_length.into()];
    for (ix, i) in pazzle.iter_mut().enumerate() {
        *i = ran.gen_range(0, 15) + (category_indices[ix] << 4);
    }

    //log_debug!("pazzle {:?}", pazzle);

    let mut mnemonic = [0u16; 12];
    for i in &mut mnemonic {
        *i = ran.gen_range(0, 2048);
    }

    //log_debug!("mnemonic {:?}", display_mnemonic(&mnemonic));

    //slice_as_array!(&mnemonic, [String; 12])
    //.ok_or(NgWalletError::InternalError)?
    //.clone(),

    let user = site.site_key.to_pub();

    // Creating a new client
    let client = ClientV0::new(user);

    let create_op = WalletOpCreateV0 {
        wallet_privkey: wallet_privkey.clone(),
        pazzle: pazzle.clone(),
        mnemonic,
        pin: params.pin,
        personal_site: site,
        save_to_ng_one: if params.send_wallet {
            SaveToNGOne::Wallet
        } else if params.send_bootstrap {
            SaveToNGOne::Bootstrap
        } else {
            SaveToNGOne::No
        },
        client: client.clone(),
    };

    //Creating a new peerId for this Client and User
    let peer = generate_keypair();

    let mut wallet_log = WalletLog::new_v0(create_op);

    // adding some more operations in the log

    // pub core_bootstrap: BootstrapContentV0,
    // #[zeroize(skip)]
    // pub core_registration: Option<[u8; 32]>,
    // #[zeroize(skip)]
    // pub additional_bootstrap: Option<BootstrapContentV0>,

    wallet_log.add(WalletOperation::AddSiteCoreV0((
        user,
        params
            .core_bootstrap
            .get_first_peer_id()
            .ok_or(NgWalletError::InvalidBootstrap)?,
        params.core_registration,
    )));

    if let Some(additional) = &params.additional_bootstrap {
        params.core_bootstrap.merge(additional);
    }

    for server in &params.core_bootstrap.servers {
        wallet_log.add(WalletOperation::AddBrokerServerV0(server.clone()));
        wallet_log.add(WalletOperation::AddSiteBootstrapV0((user, server.peer_id)));
    }

    let mut master_key = [0u8; 32];
    getrandom::getrandom(&mut master_key).map_err(|e| NgWalletError::InternalError)?;

    let mut salt_pazzle = [0u8; 16];
    let mut enc_master_key_pazzle = [0u8; 48];
    if params.pazzle_length > 0 {
        getrandom::getrandom(&mut salt_pazzle).map_err(|e| NgWalletError::InternalError)?;

        let mut pazzle_key = derive_key_from_pass(
            [pazzle.clone(), params.pin.to_vec()].concat(),
            salt_pazzle,
            wallet_id,
        );

        enc_master_key_pazzle = enc_master_key(&master_key, &pazzle_key, 0, wallet_id)?;
        pazzle_key.zeroize();
    }

    let mut salt_mnemonic = [0u8; 16];
    getrandom::getrandom(&mut salt_mnemonic).map_err(|e| NgWalletError::InternalError)?;

    //log_debug!("salt_pazzle {:?}", salt_pazzle);
    //log_debug!("salt_mnemonic {:?}", salt_mnemonic);

    let mut mnemonic_key = derive_key_from_pass(
        [transmute_to_bytes(&mnemonic), &params.pin].concat(),
        salt_mnemonic,
        wallet_id,
    );

    let enc_master_key_mnemonic = enc_master_key(&master_key, &mnemonic_key, 0, wallet_id)?;
    mnemonic_key.zeroize();

    let timestamp = now_timestamp();

    let encrypted = enc_wallet_log(&wallet_log, &master_key, peer.1, 0, timestamp, wallet_id)?;
    master_key.zeroize();

    let wallet_content = WalletContentV0 {
        security_img: cursor.into_inner(),
        security_txt: new_string,
        pazzle_length: params.pazzle_length,
        salt_pazzle,
        salt_mnemonic,
        enc_master_key_pazzle,
        enc_master_key_mnemonic,
        master_nonce: 0,
        timestamp,
        peer_id: peer.1,
        nonce: 0,
        encrypted,
    };

    let ser_wallet = serde_bare::to_vec(&wallet_content).unwrap();

    let sig = sign(&wallet_privkey, &wallet_id, &ser_wallet).unwrap();

    let wallet_v0 = WalletV0 {
        /// ID
        id: wallet_id,
        /// Content
        content: wallet_content,
        /// Signature over content by wallet's private key
        sig,
    };

    // let content = BootstrapContentV0 { servers: vec![] };
    // let ser = serde_bare::to_vec(&content).unwrap();
    // let sig = sign(wallet_key, wallet_id, &ser).unwrap();

    // let bootstrap = Bootstrap::V0(BootstrapV0 {
    //     id: wallet_id,
    //     content,
    //     sig,
    // });

    log_debug!(
        "creating of wallet took: {} ms",
        creating_pazzle.elapsed().as_millis()
    );
    let wallet = Wallet::V0(wallet_v0);
    let wallet_file = match params.result_with_wallet_file {
        false => vec![], // TODO: save locally
        true => to_vec(&NgFile::V0(NgFileV0::Wallet(wallet.clone()))).unwrap(),
    };
    Ok(CreateWalletResultV0 {
        wallet: wallet,
        wallet_file,
        pazzle,
        mnemonic: mnemonic.clone(),
        wallet_name: base64_url::encode(&wallet_id.slice()),
        peer_id: peer.1,
        peer_key: peer.0,
        nonce: 0,
        client,
        user,
    })
}

#[cfg(test)]
mod test {
    use super::*;
    use p2p_net::types::BootstrapContentV0;
    use std::fs::File;
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;
    use std::time::Instant;

    // #[test]
    // fn random_pass() {
    //     super::random_pass()
    // }

    #[test]
    fn test_gen_shuffle() {
        let shuffle = gen_shuffle_for_pazzle_opening(9);
        log_debug!("{:?}", shuffle);
        let shuffle = gen_shuffle_for_pazzle_opening(12);
        log_debug!("{:?}", shuffle);
        let shuffle = gen_shuffle_for_pazzle_opening(15);
        log_debug!("{:?}", shuffle);
        let digits = gen_shuffle_for_pin();
        let digits = gen_shuffle_for_pin();
    }

    #[async_std::test]
    async fn create_wallet() {
        // loading an image file from disk
        let f = File::open("tests/valid_security_image.jpg")
            .expect("open of tests/valid_security_image.jpg");
        let mut reader = BufReader::new(f);
        let mut img_buffer = Vec::new();
        // Read file into vector.
        reader
            .read_to_end(&mut img_buffer)
            .expect("read of valid_security_image.jpg");

        let pin = [5, 2, 9, 1];

        let creation = Instant::now();

        let res = create_wallet_v0(CreateWalletV0::new(
            img_buffer,
            "   know     yourself  ".to_string(),
            pin,
            9,
            false,
            false,
            BootstrapContentV0::new(),
            None,
            None,
        ))
        .await
        .expect("create_wallet_v0");

        log_debug!(
            "creation of wallet took: {} ms",
            creation.elapsed().as_millis()
        );
        log_debug!("-----------------------------");

        let mut file = File::create("tests/wallet.ngw").expect("open wallet write file");
        let ser_wallet = to_vec(&NgFile::V0(NgFileV0::Wallet(res.wallet.clone()))).unwrap();
        file.write_all(&ser_wallet);

        log_debug!(
            "wallet id: {:?}",
            base64_url::encode(&res.wallet.id().slice())
        );
        log_debug!("pazzle {:?}", display_pazzle(&res.pazzle));
        log_debug!("mnemonic {:?}", display_mnemonic(&res.mnemonic));
        log_debug!("pin {:?}", pin);

        if let Wallet::V0(v0) = &res.wallet {
            log_debug!("security text: {:?}", v0.content.security_txt);

            let mut file =
                File::create("tests/generated_security_image.jpg").expect("open write file");
            file.write_all(&v0.content.security_img);

            let f = File::open("tests/generated_security_image.jpg.compare")
                .expect("open of generated_security_image.jpg.compare");
            let mut reader = BufReader::new(f);
            let mut generated_security_image_compare = Vec::new();
            // Read file into vector.
            reader
                .read_to_end(&mut generated_security_image_compare)
                .expect("read of generated_security_image.jpg.compare");

            assert_eq!(v0.content.security_img, generated_security_image_compare);

            let opening_mnemonic = Instant::now();

            let w = open_wallet_with_mnemonic(Wallet::V0(v0.clone()), res.mnemonic, pin.clone())
                .expect("open with mnemonic");
            //log_debug!("encrypted part {:?}", w);

            log_debug!(
                "opening of wallet with mnemonic took: {} ms",
                opening_mnemonic.elapsed().as_millis()
            );

            if v0.content.pazzle_length > 0 {
                let opening_pazzle = Instant::now();
                let w = open_wallet_with_pazzle(Wallet::V0(v0.clone()), res.pazzle.clone(), pin)
                    .expect("open with pazzle");
                log_debug!(
                    "opening of wallet with pazzle took: {} ms",
                    opening_pazzle.elapsed().as_millis()
                );
            }
            log_debug!("encrypted part {:?}", w);
        }
    }
}
