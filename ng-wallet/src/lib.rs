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
extern crate p2p_net;

pub mod types;

pub mod bip39;

use std::io::Cursor;

use crate::bip39::bip39_wordlist;
use crate::types::*;
use aes_gcm_siv::{
    aead::{heapless::Vec as HeaplessVec, AeadInPlace, KeyInit},
    Aes256GcmSiv, Nonce,
};
use argon2::{Algorithm, Argon2, AssociatedData, ParamsBuilder, Version};
use chacha20poly1305::XChaCha20Poly1305;

use image::{imageops::FilterType, io::Reader as ImageReader, ImageOutputFormat};
use safe_transmute::transmute_to_bytes;

use p2p_repo::types::{PubKey, Site, SiteType, Timestamp};
use p2p_repo::utils::{generate_keypair, now_timestamp, sign, verify};
use rand::{thread_rng, Rng};
use serde_bare::{from_slice, to_vec};

pub fn enc_master_key(
    master_key: [u8; 32],
    key: [u8; 32],
    nonce: u8,
    wallet_id: WalletId,
) -> Result<[u8; 48], NgWalletError> {
    let cipher = Aes256GcmSiv::new(&key.into());
    let mut nonce_buffer = [0u8; 12];
    nonce_buffer[0] = nonce;
    let nonce = Nonce::from_slice(&nonce_buffer);

    let mut buffer: HeaplessVec<u8, 48> = HeaplessVec::new(); // Note: buffer needs 16-bytes overhead for auth tag
    buffer.extend_from_slice(&master_key);

    // Encrypt `buffer` in-place, replacing the plaintext contents with ciphertext
    cipher
        .encrypt_in_place(nonce, &to_vec(&wallet_id).unwrap(), &mut buffer)
        .map_err(|e| NgWalletError::EncryptionError)?;

    // `buffer` now contains the encrypted master key
    // println!("cipher {:?}", buffer);
    Ok(buffer.into_array::<48>().unwrap())
}

pub fn dec_master_key(
    ciphertext: [u8; 48],
    key: [u8; 32],
    nonce: u8,
    wallet_id: WalletId,
) -> Result<[u8; 32], NgWalletError> {
    let cipher = Aes256GcmSiv::new(&key.into());
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

pub fn enc_encrypted_block(
    block: &EncryptedWalletV0,
    master_key: [u8; 32],
    peer_id: PubKey,
    nonce: u64,
    timestamp: Timestamp,
    wallet_id: WalletId,
) -> Result<Vec<u8>, NgWalletError> {
    let ser_encrypted_block = to_vec(block).map_err(|e| NgWalletError::InternalError)?;

    let nonce_buffer: [u8; 24] = gen_nonce(peer_id, nonce);

    let cipher = XChaCha20Poly1305::new(&master_key.into());

    let mut buffer: Vec<u8> = Vec::with_capacity(ser_encrypted_block.len() + 16); // Note: buffer needs 16-bytes overhead for auth tag
    buffer.extend_from_slice(&ser_encrypted_block);

    // Encrypt `buffer` in-place, replacing the plaintext contents with ciphertext
    cipher
        .encrypt_in_place(
            &nonce_buffer.into(),
            &gen_associated_data(timestamp, wallet_id),
            &mut buffer,
        )
        .map_err(|e| NgWalletError::EncryptionError)?;

    // `buffer` now contains the message ciphertext
    // println!("encrypted_block ciphertext {:?}", buffer);

    Ok(buffer)
}

pub fn dec_encrypted_block(
    mut ciphertext: Vec<u8>,
    master_key: [u8; 32],
    peer_id: PubKey,
    nonce: u64,
    timestamp: Timestamp,
    wallet_id: WalletId,
) -> Result<EncryptedWalletV0, NgWalletError> {
    let nonce_buffer: [u8; 24] = gen_nonce(peer_id, nonce);

    let cipher = XChaCha20Poly1305::new(&master_key.into());

    // Decrypt `ciphertext` in-place, replacing its ciphertext context with the original plaintext
    cipher
        .decrypt_in_place(
            &nonce_buffer.into(),
            &gen_associated_data(timestamp, wallet_id),
            &mut ciphertext,
        )
        .map_err(|e| NgWalletError::DecryptionError)?;

    // `ciphertext` now contains the decrypted block
    //println!("decrypted_block {:?}", ciphertext);

    let decrypted_block =
        from_slice::<EncryptedWalletV0>(&ciphertext).map_err(|e| NgWalletError::DecryptionError)?;

    Ok(decrypted_block)
}

pub fn derive_key_from_pass(pass: Vec<u8>, salt: [u8; 16], wallet_id: WalletId) -> [u8; 32] {
    let params = ParamsBuilder::new()
        .m_cost(50 * 1024)
        .t_cost(2)
        .p_cost(1)
        .data(AssociatedData::new(wallet_id.slice()).unwrap())
        .output_len(32)
        .build()
        .unwrap();
    let argon = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8; 32];
    argon.hash_password_into(&pass, &salt, &mut out).unwrap();
    out
}

pub fn open_wallet_with_pazzle(
    wallet: Wallet,
    pazzle: Vec<u8>,
    pin: [u8; 4],
) -> Result<EncryptedWallet, NgWalletError> {
    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let pazzle_key = derive_key_from_pass(
                [pazzle, pin.to_vec()].concat(),
                v0.content.salt_pazzle,
                v0.id,
            );

            let master_key = dec_master_key(
                v0.content.enc_master_key_pazzle,
                pazzle_key,
                v0.content.master_nonce,
                v0.id,
            )?;

            Ok(EncryptedWallet::V0(dec_encrypted_block(
                v0.content.encrypted,
                master_key,
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
    mnemonic: [u16; 12],
    pin: [u8; 4],
) -> Result<EncryptedWallet, NgWalletError> {
    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let mnemonic_key = derive_key_from_pass(
                [transmute_to_bytes(&mnemonic), &pin].concat(),
                v0.content.salt_mnemonic,
                v0.id,
            );

            let master_key = dec_master_key(
                v0.content.enc_master_key_mnemonic,
                mnemonic_key,
                v0.content.master_nonce,
                v0.id,
            )?;

            Ok(EncryptedWallet::V0(dec_encrypted_block(
                v0.content.encrypted,
                master_key,
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

/// creates a Wallet from a pin, a security text and image (with option to send the bootstrap and wallet to nextgraph.one)
/// and returns the Wallet, the pazzle and the mnemonic
pub fn create_wallet_v0(
    security_img: Vec<u8>,
    security_txt: String,
    pin: [u8; 4],
    pazzle_length: u8,
    send_bootstrap: Option<&Bootstrap>,
    send_wallet: bool,
    peer_id: PubKey,
    nonce: u64,
) -> Result<(Wallet, Vec<u8>, [u16; 12]), NgWalletError> {
    // TODO : use some automatically zeroed variable for the 2 first arguments, and for the returned values

    // pazzle_length can only be 9, 12, or 15
    if (pazzle_length != 9 && pazzle_length != 12 && pazzle_length != 15) {
        return Err(NgWalletError::InvalidPazzleLength);
    }

    // cannot submit wallet if we don't submit also the bootstrap
    if send_bootstrap.is_none() && send_wallet {
        return Err(NgWalletError::SubmissionError);
    }

    // check validity of PIN

    // shouldn't start with 0
    if pin[0] == 0 {
        return Err(NgWalletError::InvalidPin);
    }

    // each digit shouldnt be greater than 9
    if pin[0] > 9 || pin[1] > 9 || pin[2] > 9 || pin[3] > 9 {
        return Err(NgWalletError::InvalidPin);
    }

    // check for uniqueness of each digit
    if pin[1] == pin[0]
        || pin[1] == pin[2]
        || pin[1] == pin[3]
        || pin[2] == pin[0]
        || pin[2] == pin[3]
        || pin[3] == pin[0]
    {
        return Err(NgWalletError::InvalidPin);
    }

    // check for ascending series
    if pin[1] == pin[0] + 1 && pin[2] == pin[1] + 1 && pin[3] == pin[2] + 1 {
        return Err(NgWalletError::InvalidPin);
    }

    // check for descending series
    if pin[3] >= 3 && pin[2] == pin[3] - 1 && pin[1] == pin[2] - 1 && pin[0] == pin[1] - 1 {
        return Err(NgWalletError::InvalidPin);
    }

    // check validity of security text
    let words: Vec<_> = security_txt.split_whitespace().collect();
    let new_string = words.join(" ");
    let count = new_string.chars().count();
    if count < 10 || count > 100 {
        return Err(NgWalletError::InvalidSecurityText);
    }

    // check validity of image
    let decoded_img = ImageReader::new(Cursor::new(security_img))
        .with_guessed_format()
        .map_err(|e| NgWalletError::InvalidSecurityImage)?
        .decode()
        .map_err(|e| NgWalletError::InvalidSecurityImage)?;

    if decoded_img.height() < 150 || decoded_img.width() < 150 {
        return Err(NgWalletError::InvalidSecurityImage);
    }

    let resized_img = decoded_img.resize_to_fill(400, 400, FilterType::Triangle);

    let buffer: Vec<u8> = Vec::with_capacity(100000);
    let mut cursor = Cursor::new(buffer);
    resized_img
        .write_to(&mut cursor, ImageOutputFormat::Jpeg(72))
        .map_err(|e| NgWalletError::InvalidSecurityImage)?;

    // creating the wallet keys

    let (wallet_key, wallet_id) = generate_keypair();

    let site = Site::create(SiteType::Individual).map_err(|e| NgWalletError::InternalError)?;

    // let mut pazzle_random = vec![0u8; pazzle_length.into()];
    // getrandom::getrandom(&mut pazzle_random).map_err(|e| NgWalletError::InternalError)?;

    let mut pazzle = vec![0u8; pazzle_length.into()];
    let mut ran = thread_rng();
    for i in &mut pazzle {
        *i = ran.gen_range(0, 16);
    }

    //println!("pazzle {:?}", pazzle);

    let mut mnemonic = [0u16; 12];
    for i in &mut mnemonic {
        *i = ran.gen_range(0, 2048);
    }

    //println!("mnemonic {:?}", display_mnemonic(&mnemonic));

    //slice_as_array!(&mnemonic, [String; 12])
    //.ok_or(NgWalletError::InternalError)?
    //.clone(),

    let encrypted_block = EncryptedWalletV0 {
        pazzle: pazzle.clone(),
        mnemonic,
        pin,
        sites: vec![site],
    };

    let mut salt_pazzle = [0u8; 16];
    getrandom::getrandom(&mut salt_pazzle).map_err(|e| NgWalletError::InternalError)?;

    let mut salt_mnemonic = [0u8; 16];
    getrandom::getrandom(&mut salt_mnemonic).map_err(|e| NgWalletError::InternalError)?;

    //println!("salt_pazzle {:?}", salt_pazzle);
    //println!("salt_mnemonic {:?}", salt_mnemonic);

    let pazzle_key = derive_key_from_pass(
        [pazzle.clone(), pin.to_vec()].concat(),
        salt_pazzle,
        wallet_id,
    );

    let mnemonic_key = derive_key_from_pass(
        [transmute_to_bytes(&mnemonic), &pin].concat(),
        salt_mnemonic,
        wallet_id,
    );

    let mut master_key = [0u8; 32];
    getrandom::getrandom(&mut master_key).map_err(|e| NgWalletError::InternalError)?;

    let enc_master_key_pazzle = enc_master_key(master_key, pazzle_key, 0, wallet_id)?;

    let enc_master_key_mnemonic = enc_master_key(master_key, mnemonic_key, 0, wallet_id)?;

    let timestamp = now_timestamp();
    let encrypted = enc_encrypted_block(
        &encrypted_block,
        master_key,
        peer_id,
        nonce,
        timestamp,
        wallet_id,
    )?;

    let wallet_content = WalletContentV0 {
        security_img: cursor.into_inner(),
        security_txt: new_string,
        salt_pazzle,
        salt_mnemonic,
        enc_master_key_pazzle,
        enc_master_key_mnemonic,
        master_nonce: 0,
        timestamp,
        peer_id,
        nonce,
        encrypted,
    };

    let ser_wallet = serde_bare::to_vec(&wallet_content).unwrap();
    let sig = sign(wallet_key, wallet_id, &ser_wallet).unwrap();

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

    // TODO send bootstrap (if)
    // TODO send wallet (if)

    Ok((Wallet::V0(wallet_v0), pazzle, mnemonic))
}

#[cfg(test)]
mod tests {
    use super::*;
    use p2p_repo::utils::generate_keypair;
    use std::fs::File;
    use std::io::BufReader;
    use std::io::Read;
    use std::io::Write;
    use std::time::Instant;

    #[test]
    fn create_wallet() {
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

        let res = create_wallet_v0(
            img_buffer,
            "   know     yourself  ".to_string(),
            pin,
            9,
            None,
            false,
            PubKey::Ed25519PubKey([
                119, 251, 253, 29, 135, 199, 254, 50, 134, 67, 1, 208, 117, 196, 167, 107, 2, 113,
                98, 243, 49, 90, 7, 0, 157, 58, 14, 187, 14, 3, 116, 86,
            ]),
            0,
        )
        .expect("create_wallet_v0");

        log!(
            "creation of wallet took: {} ms",
            creation.elapsed().as_millis()
        );
        log!("-----------------------------");

        let (wallet, pazzle, mnemonic) = res;

        let mut file = File::create("tests/wallet.ngw").expect("open wallet write file");
        let ser_wallet = to_vec(&NgFile::V0(NgFileV0::Wallet(wallet.clone()))).unwrap();
        file.write_all(&ser_wallet);

        log!("wallet id: {:?}", base64_url::encode(&wallet.id().slice()));
        log!("pazzle {:?}", pazzle);
        log!("mnemonic {:?}", display_mnemonic(&mnemonic));
        log!("pin {:?}", pin);

        if let Wallet::V0(v0) = wallet {
            log!("security text: {:?}", v0.content.security_txt);

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

            let w = open_wallet_with_mnemonic(Wallet::V0(v0.clone()), mnemonic, pin)
                .expect("open with mnemonic");
            //println!("encrypted part {:?}", w);

            log!(
                "opening of wallet with mnemonic took: {} ms",
                opening_mnemonic.elapsed().as_millis()
            );
            let opening_pazzle = Instant::now();

            let w = open_wallet_with_pazzle(Wallet::V0(v0.clone()), pazzle, pin)
                .expect("open with pazzle");
            //println!("encrypted part {:?}", w);

            log!(
                "opening of wallet with pazzle took: {} ms",
                opening_pazzle.elapsed().as_millis()
            );
        }
    }
}