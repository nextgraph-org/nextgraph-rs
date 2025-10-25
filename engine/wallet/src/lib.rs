// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

#[macro_use]
extern crate lazy_static;

pub mod types;

pub mod bip39;

pub mod emojis;

pub mod permissions;

use std::{collections::HashMap, io::Cursor};

use aes_gcm_siv::{
    aead::{heapless::Vec as HeaplessVec, AeadInPlace, KeyInit},
    Aes256GcmSiv, Nonce,
};
use argon2::{Algorithm, Argon2, AssociatedData, ParamsBuilder, Version};
use chacha20poly1305::XChaCha20Poly1305;
use image::{imageops::FilterType, io::Reader as ImageReader, ImageOutputFormat};
use ng_net::types::Locator;
use rand::distributions::{Distribution, Uniform};
use rand::prelude::*;
use safe_transmute::transmute_to_bytes;
use serde_bare::{from_slice, to_vec};
#[cfg(debug_assertions)]
use web_time::Instant;
use zeroize::Zeroize;

use ng_repo::types::*;
use ng_repo::utils::{generate_keypair, now_timestamp, sign, verify};
use ng_repo::{log::*, types::PrivKey};

use ng_verifier::{site::SiteV0, verifier::Verifier};

use crate::bip39::bip39_wordlist;
use crate::types::*;

impl Wallet {
    pub fn id(&self) -> WalletId {
        match self {
            Wallet::V0(v0) => v0.id,
            _ => unimplemented!(),
        }
    }
    pub fn content_as_bytes(&self) -> Vec<u8> {
        match self {
            Wallet::V0(v0) => serde_bare::to_vec(&v0.content).unwrap(),
            _ => unimplemented!(),
        }
    }
    pub fn sig(&self) -> Sig {
        match self {
            Wallet::V0(v0) => v0.sig,
            _ => unimplemented!(),
        }
    }
    pub fn pazzle_length(&self) -> u8 {
        match self {
            Wallet::V0(v0) => v0.content.pazzle_length,
            _ => unimplemented!(),
        }
    }
    pub fn name(&self) -> String {
        match self {
            Wallet::V0(v0) => v0.id.to_string(),
            _ => unimplemented!(),
        }
    }

    /// `nonce` : The current nonce used for encrypting this wallet by the user on this device.
    /// It should be incremented BEFORE encrypting the wallet again
    /// when some new operations have been added to the log of the Wallet.
    /// The nonce is by PeerId. It is saved together with the PeerId in the SessionPeerStorage.
    /// If the session is not saved (in-memory) it is lost, but it is fine, as the PeerId is also lost, and a new one
    /// will be generated for the next session.
    pub fn encrypt(
        &self,
        wallet_log: &WalletLog,
        master_key: &[u8; 32],
        peer_id: PubKey,
        nonce: u64,
        wallet_privkey: PrivKey,
    ) -> Result<Self, NgWalletError> {
        let timestamp = now_timestamp();
        let wallet_id = self.id();
        let encrypted =
            enc_wallet_log(wallet_log, master_key, peer_id, nonce, timestamp, wallet_id)?;

        let mut wallet_content = match self {
            Wallet::V0(v0) => v0.content.clone(),
            _ => unimplemented!(),
        };

        wallet_content.timestamp = timestamp;
        wallet_content.peer_id = peer_id;
        wallet_content.nonce = nonce;
        wallet_content.encrypted = encrypted;

        let ser_wallet = serde_bare::to_vec(&wallet_content).unwrap();

        let sig = sign(&wallet_privkey, &wallet_id, &ser_wallet).unwrap();

        let wallet_v0 = WalletV0 {
            // ID
            id: wallet_id,
            // Content
            content: wallet_content,
            // Signature over content by wallet's private key
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

        Ok(Wallet::V0(wallet_v0))
    }
}

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
    buffer
        .extend_from_slice(master_key)
        .map_err(|_| NgWalletError::InternalError)?;

    // Encrypt `buffer` in-place, replacing the plaintext contents with ciphertext
    cipher
        .encrypt_in_place(nonce, &to_vec(&wallet_id).unwrap(), &mut buffer)
        .map_err(|_e| NgWalletError::EncryptionError)?;

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
        .map_err(|_e| NgWalletError::DecryptionError)?;
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
    let ser_log = to_vec(log).map_err(|_e| NgWalletError::InternalError)?;

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
        .map_err(|_e| NgWalletError::EncryptionError)?;

    // `buffer` now contains the message ciphertext
    // log_debug!("encrypted_block ciphertext {:?}", buffer);

    Ok(buffer)
}

// pub fn dec_session(key: PrivKey, vec: &Vec<u8>) -> Result<SessionWalletStorageV0, NgWalletError> {
//     let session_ser = crypto_box::seal_open(&(*key.to_dh().slice()).into(), vec)
//         .map_err(|_| NgWalletError::DecryptionError)?;
//     let session: SessionWalletStorage =
//         serde_bare::from_slice(&session_ser).map_err(|_| NgWalletError::SerializationError)?;
//     let SessionWalletStorage::V0(v0) = session;
//     Ok(v0)
// }

// pub fn create_new_session(
//     wallet_id: PubKey,
//     user: PubKey,
// ) -> Result<(SessionWalletStorageV0, Vec<u8>), NgWalletError> {
//     let peer = generate_keypair();
//     let mut sws = SessionWalletStorageV0::new();
//     let sps = SessionPeerStorageV0 {
//         user,
//         peer_key: peer.0,
//         last_wallet_nonce: 0,
//     };
//     sws.users.insert(user.to_string(), sps);
//     let sws_ser = serde_bare::to_vec(&SessionWalletStorage::V0(sws.clone())).unwrap();
//     let mut rng = crypto_box::aead::OsRng {};
//     let cipher = crypto_box::seal(&mut rng, &wallet_id.to_dh_slice().into(), &sws_ser)
//         .map_err(|_| NgWalletError::EncryptionError)?;
//     Ok((sws, cipher))
// }

pub fn dec_encrypted_block(
    mut ciphertext: Vec<u8>,
    master_key: [u8; 32],
    peer_id: PubKey,
    nonce: u64,
    timestamp: Timestamp,
    wallet_id: WalletId,
) -> Result<SensitiveWalletV0, NgWalletError> {
    let nonce_buffer: [u8; 24] = gen_nonce(peer_id, nonce);

    let cipher = XChaCha20Poly1305::new(master_key.as_ref().into());

    // Decrypt `ciphertext` in-place, replacing its ciphertext context with the original plaintext
    cipher
        .decrypt_in_place(
            &nonce_buffer.into(),
            &gen_associated_data(timestamp, wallet_id),
            &mut ciphertext,
        )
        .map_err(|_e| NgWalletError::DecryptionError)?;

    let decrypted_log =
        from_slice::<WalletLog>(&ciphertext).map_err(|_e| NgWalletError::DecryptionError)?;

    //master_key.zeroize(); // this is now done in the SensitiveWalletV0

    // `ciphertext` now contains the decrypted block
    //log_debug!("decrypted_block {:?}", ciphertext);
    ciphertext.zeroize();

    match decrypted_log {
        WalletLog::V0(v0) => v0.reduce(master_key),
    }
}

// FIXME: An important note on the cost parameters !!!
// here they are set to quite high values because the code gets optimized (unfortunately) so the cost params take that into account.
// on native apps in debug mode (dev mode), the rust code is not optimized and we get a timing above 1 min, which is way too much
// once compiled for release (prod), the timing goes down to 8 sec on native apps because of the Rust optimization.
// on the WASM32 target, the wasm-pack has optimization disabled (wasm-opt = false) but we suspect the optimization happens on the V8 runtime, in the browser or node.
// we get 10 secs on the same machine for web based app. which is acceptable.
// we should have a look at https://blog.trailofbits.com/2022/01/26/part-1-the-life-of-an-optimization-barrier/
// and https://blog.trailofbits.com/2022/02/01/part-2-rusty-crypto/
// the memory size could be too high for iOS which seems to have a limit of 120MB in total for the whole app.
// we haven't test it yet. https://community.bitwarden.com/t/recommended-settings-for-argon2/50901/16?page=4
pub fn derive_key_from_pass(mut pass: Vec<u8>, salt: [u8; 16], wallet_id: WalletId) -> [u8; 32] {
    let params = ParamsBuilder::new()
        .m_cost(40 * 1024)
        .t_cost(40)
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
    wallet: &Wallet,
    mut pazzle: Vec<u8>,
    mut pin: [u8; 4],
) -> Result<SensitiveWallet, NgWalletError> {
    // each digit shouldnt be greater than 9
    if pin[0] > 9 || pin[1] > 9 || pin[2] > 9 || pin[3] > 9 {
        return Err(NgWalletError::InvalidPin);
    }

    //log_info!("pazzle={:?}", pazzle);

    #[cfg(debug_assertions)]
    let opening_pazzle = Instant::now();

    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|_e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let login = v0
                .content
                .pazzle
                .as_ref()
                .ok_or(NgWalletError::LoginMethodNotSupported)?;
            pazzle.extend_from_slice(&pin);
            let mut pazzle_key = derive_key_from_pass(pazzle, login.salt, v0.id);
            // pazzle is zeroized in derive_key_from_pass
            pin.zeroize();

            let master_key = dec_master_key(
                login.enc_master_key,
                &pazzle_key,
                v0.content.master_nonce,
                v0.id,
            )?;
            pazzle_key.zeroize();

            #[cfg(debug_assertions)]
            log_debug!(
                "opening of wallet with pazzle took: {} ms",
                opening_pazzle.elapsed().as_millis()
            );
            let cipher = v0.content.encrypted.clone();
            Ok(SensitiveWallet::V0(dec_encrypted_block(
                cipher,
                master_key,
                v0.content.peer_id,
                v0.content.nonce,
                v0.content.timestamp,
                v0.id,
            )?))
        }
        _ => unimplemented!(),
    }
}

pub fn open_wallet_with_mnemonic(
    wallet: &Wallet,
    mut mnemonic: [u16; 12],
    mut pin: [u8; 4],
) -> Result<SensitiveWallet, NgWalletError> {
    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|_e| NgWalletError::InvalidSignature)?;

    match wallet {
        Wallet::V0(v0) => {
            let login = v0
                .content
                .mnemonic
                .as_ref()
                .ok_or(NgWalletError::LoginMethodNotSupported)?;
            let mut mnemonic_key = derive_key_from_pass(
                [transmute_to_bytes(&mnemonic), &pin].concat(),
                login.salt,
                v0.id,
            );
            mnemonic.zeroize();
            pin.zeroize();

            let master_key = dec_master_key(
                login.enc_master_key,
                &mnemonic_key,
                v0.content.master_nonce,
                v0.id,
            )?;
            mnemonic_key.zeroize();

            Ok(SensitiveWallet::V0(dec_encrypted_block(
                v0.content.encrypted.clone(),
                master_key,
                v0.content.peer_id,
                v0.content.nonce,
                v0.content.timestamp,
                v0.id,
            )?))
        }
        _ => unimplemented!(),
    }
}

pub fn open_wallet_with_password(
    wallet: &Wallet,
    mut pass: String,
) -> Result<SensitiveWallet, NgWalletError> {
    verify(&wallet.content_as_bytes(), wallet.sig(), wallet.id())
        .map_err(|_e| NgWalletError::InvalidSignature)?;

    let mut password = pass.trim().to_string();
    pass.zeroize();
    match wallet {
        Wallet::V0(v0) => {
            let login = v0
                .content
                .password
                .as_ref()
                .ok_or(NgWalletError::LoginMethodNotSupported)?;

            let mut password_key =
                derive_key_from_pass(password.as_bytes().to_vec(), login.salt, v0.id);
            password.zeroize();

            let master_key = dec_master_key(
                login.enc_master_key,
                &password_key,
                v0.content.master_nonce,
                v0.id,
            )?;
            password_key.zeroize();

            Ok(SensitiveWallet::V0(dec_encrypted_block(
                v0.content.encrypted.clone(),
                master_key,
                v0.content.peer_id,
                v0.content.nonce,
                v0.content.timestamp,
                v0.id,
            )?))
        }
        _ => unimplemented!(),
    }
}

pub fn display_mnemonic(mnemonic: &[u16; 12]) -> Vec<String> {
    let res: Vec<String> = mnemonic
        .into_iter()
        .map(|i| String::from(bip39_wordlist[*i as usize]))
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

/// creates a Wallet from a pin, a security text and image
/// and returns the Wallet, the pazzle and the mnemonic
pub fn create_wallet_first_step_v0(
    params: CreateWalletV0,
) -> Result<CreateWalletIntermediaryV0, NgWalletError> {
    // pazzle_length can only be 0, 9, 12, or 15
    if params.pazzle_length != 9
        //&& params.pazzle_length != 12
        //&& params.pazzle_length != 15
        && params.pazzle_length != 0
    {
        return Err(NgWalletError::InvalidPazzleLength);
    }

    // check validity of PIN

    // shouldn't start with 0
    // if params.pin[0] == 0 {
    //     return Err(NgWalletError::InvalidPin);
    // }

    if params.pazzle_length == 0 && !params.mnemonic && params.password.is_none() {
        return Err(NgWalletError::NoLoginMethod);
    }

    if let Some(pin) = params.pin {
        // each digit shouldnt be greater than 9
        if pin[0] > 9 || pin[1] > 9 || pin[2] > 9 || pin[3] > 9 {
            return Err(NgWalletError::InvalidPin);
        }

        // check for same digit doesnt appear 3 times
        if (pin[0] == pin[1] && pin[0] == pin[2])
            || (pin[0] == pin[1] && pin[0] == pin[3])
            || (pin[0] == pin[2] && pin[0] == pin[3])
            || (pin[1] == pin[2] && pin[1] == pin[3])
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
    } else if params.pazzle_length > 0 || params.mnemonic {
        return Err(NgWalletError::MnemonicOrPazzleNeedAPin);
    }

    // check validity of security text
    let words: Vec<_> = params.security_txt.split_whitespace().collect();
    let new_string = words.join(" ");
    let count = new_string.chars().count();
    if count < 2 || count > 100 {
        return Err(NgWalletError::InvalidSecurityText);
    }

    // check validity of image
    let img_vec = if let Some(security_img) = &params.security_img {
        let decoded_img = ImageReader::new(Cursor::new(security_img))
            .with_guessed_format()
            .map_err(|_e| NgWalletError::InvalidSecurityImage)?
            .decode()
            .map_err(|_e| NgWalletError::InvalidSecurityImage)?;

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
            .map_err(|_e| NgWalletError::InvalidSecurityImage)?;

        Some(cursor.into_inner())
    } else {
        None
    };

    // creating the wallet keys

    let (wallet_privkey, wallet_id) = generate_keypair();

    // TODO: should be derived from  OwnershipProof
    let user_privkey = PrivKey::random_ed();

    let user = user_privkey.to_pub();

    let client = ClientV0::new_with_auto_open(user);

    let intermediary = CreateWalletIntermediaryV0 {
        wallet_privkey,
        wallet_name: wallet_id.to_string(),
        client,
        user_privkey,
        in_memory: !params.local_save,
        security_img: img_vec,
        security_txt: new_string,
        pazzle_length: params.pazzle_length,
        pin: params.pin,
        password: params.password.as_ref().map(|p| p.trim().to_string()),
        mnemonic: params.mnemonic,
        send_bootstrap: params.send_bootstrap,
        send_wallet: params.send_wallet,
        result_with_wallet_file: params.result_with_wallet_file,
        core_bootstrap: params.core_bootstrap.clone(),
        core_registration: params.core_registration,
        additional_bootstrap: params.additional_bootstrap.clone(),
        pdf: params.pdf,
    };
    Ok(intermediary)
}

pub async fn create_wallet_second_step_v0(
    mut params: CreateWalletIntermediaryV0,
    verifier: &mut Verifier,
) -> Result<
    (
        CreateWalletResultV0,
        SiteV0,
        HashMap<String, Vec<BrokerInfoV0>>,
    ),
    NgWalletError,
> {
    #[cfg(debug_assertions)]
    let creating_pazzle = Instant::now();

    let mut site = SiteV0::create_personal(params.user_privkey.clone(), verifier)
        .await
        .map_err(|e| {
            log_err!("create_personal failed with {e}");
            NgWalletError::InternalError
        })?;

    let user = params.user_privkey.to_pub();

    let wallet_id = params.wallet_privkey.to_pub();

    let mut ran = thread_rng();

    let pazzle = if params.pazzle_length > 0 {
        let mut category_indices: Vec<u8> = (0..params.pazzle_length).collect();
        category_indices.shuffle(&mut ran);

        let between = Uniform::try_from(0..15).unwrap();
        let mut pazzle = vec![0u8; params.pazzle_length.into()];
        for (ix, i) in pazzle.iter_mut().enumerate() {
            //*i = ran.gen_range(0, 15) + (category_indices[ix] << 4);
            *i = between.sample(&mut ran) + (category_indices[ix] << 4);
        }
        //log_debug!("pazzle {:?}", pazzle);
        Some(pazzle)
    } else {
        None
    };

    let mnemonic = if params.mnemonic {
        let between = Uniform::try_from(0..2048).unwrap();
        let mut mnemonic = [0u16; 12];
        for i in &mut mnemonic {
            //*i = ran.gen_range(0, 2048);
            *i = between.sample(&mut ran);
        }
        //log_debug!("mnemonic {:?}", display_mnemonic(&mnemonic));
        Some(mnemonic)
    } else {
        None
    };

    //slice_as_array!(&mnemonic, [String; 12])
    //.ok_or(NgWalletError::InternalError)?
    //.clone(),

    let create_op = WalletOpCreateV0 {
        wallet_privkey: params.wallet_privkey.clone(),
        // pazzle: pazzle.clone(),
        // mnemonic,
        // pin: params.pin,
        personal_site: site.clone(),
        save_recovery_kit: if params.send_wallet {
            SaveToNGOne::Wallet
        } else if params.send_bootstrap {
            SaveToNGOne::Bootstrap
        } else {
            SaveToNGOne::No
        },
        //client: client.clone(),
    };

    //Creating a new peerId for this Client and User. we don't do that anymore
    //let peer = generate_keypair();

    let mut wallet_log = WalletLog::new_v0(create_op);

    // adding some more operations in the log

    // pub core_bootstrap: BootstrapContentV0,
    // #[zeroize(skip)]
    // pub core_registration: Option<[u8; 32]>,
    // #[zeroize(skip)]
    // pub additional_bootstrap: Option<BootstrapContentV0>,

    let mut brokers: HashMap<String, Vec<BrokerInfoV0>> = HashMap::new();

    let core_pubkey = params
        .core_bootstrap
        .get_first_peer_id()
        .ok_or(NgWalletError::InvalidBootstrap)?;
    wallet_log.add(WalletOperation::AddSiteCoreV0((
        user,
        core_pubkey,
        params.core_registration,
    )));

    site.cores.push((core_pubkey, params.core_registration));

    if let Some(additional) = &params.additional_bootstrap {
        params.core_bootstrap.merge(additional);
    }
    let mut locator = Locator::empty();
    for server in &params.core_bootstrap.servers {
        locator.add(server.clone());

        wallet_log.add(WalletOperation::AddBrokerServerV0(server.clone()));
        wallet_log.add(WalletOperation::AddSiteBootstrapV0((user, server.peer_id)));
        site.bootstraps.push(server.peer_id);

        let broker = BrokerInfoV0::ServerV0(server.clone());
        let key = broker.get_id().to_string();
        let mut list = brokers.get_mut(&key);
        if list.is_none() {
            let new_list = vec![];
            brokers.insert(key.clone(), new_list);
            list = brokers.get_mut(&key);
        }
        list.unwrap().push(broker);
    }
    verifier.update_locator(locator);

    let mut master_key = [0u8; 32];
    getrandom::fill(&mut master_key).map_err(|_e| NgWalletError::InternalError)?;

    let pazzle_login = if let Some(pazzle) = &pazzle {
        let mut salt_pazzle = [0u8; 16];

        //log_debug!("salt_pazzle {:?}", salt_pazzle);

        getrandom::fill(&mut salt_pazzle).map_err(|_e| NgWalletError::InternalError)?;

        let mut pazzle_key = derive_key_from_pass(
            [pazzle.clone(), params.pin.unwrap().to_vec()].concat(),
            salt_pazzle,
            wallet_id,
        );

        let enc_master_key_pazzle = enc_master_key(&master_key, &pazzle_key, 0, wallet_id)?;
        pazzle_key.zeroize();
        Some(LoginMethod {
            salt: salt_pazzle,
            enc_master_key: enc_master_key_pazzle,
        })
    } else {
        None
    };

    let mnemonic_login = if let Some(mnemonic) = mnemonic {
        let mut salt_mnemonic = [0u8; 16];
        getrandom::fill(&mut salt_mnemonic).map_err(|_e| NgWalletError::InternalError)?;

        //log_debug!("salt_mnemonic {:?}", salt_mnemonic);

        let mut mnemonic_key = derive_key_from_pass(
            [transmute_to_bytes(&mnemonic), &params.pin.unwrap()].concat(),
            salt_mnemonic,
            wallet_id,
        );

        let enc_master_key_mnemonic = enc_master_key(&master_key, &mnemonic_key, 0, wallet_id)?;
        mnemonic_key.zeroize();

        Some(LoginMethod {
            salt: salt_mnemonic,
            enc_master_key: enc_master_key_mnemonic,
        })
    } else {
        None
    };

    let password = if let Some(password) = &params.password {
        let mut salt_password = [0u8; 16];
        getrandom::fill(&mut salt_password).map_err(|_e| NgWalletError::InternalError)?;

        //log_debug!("salt_password {:?}", salt_password);

        let mut password_key =
            derive_key_from_pass(password.as_bytes().to_vec(), salt_password, wallet_id);

        let enc_master_key_password = enc_master_key(&master_key, &password_key, 0, wallet_id)?;
        password_key.zeroize();

        Some(LoginMethod {
            salt: salt_password,
            enc_master_key: enc_master_key_password,
        })
    } else {
        None
    };

    let timestamp = now_timestamp();

    let encrypted = enc_wallet_log(
        &wallet_log,
        &master_key,
        // the peer_id used to generate the nonce at creation time is always zero
        PubKey::nil(),
        0,
        timestamp,
        wallet_id,
    )?;
    master_key.zeroize();

    let wallet_content = WalletContentV0 {
        security_img: params
            .security_img
            .as_ref()
            .map(|b| serde_bytes::ByteBuf::from(b.as_slice())),
        security_txt: params.security_txt.clone(),
        pazzle_length: params.pazzle_length,
        mnemonic: mnemonic_login,
        pazzle: pazzle_login,
        password,
        master_nonce: 0,
        timestamp,
        peer_id: PubKey::nil(),
        nonce: 0,
        encrypted,
    };

    let ser_wallet = serde_bare::to_vec(&wallet_content).unwrap();

    let sig: Sig = sign(&params.wallet_privkey, &wallet_id, &ser_wallet).unwrap();

    let wallet_v0 = WalletV0 {
        // ID
        id: wallet_id,
        // Content
        content: wallet_content,
        // Signature over content by wallet's private key
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

    #[cfg(debug_assertions)]
    log_debug!(
        "creating of wallet took: {} ms",
        creating_pazzle.elapsed().as_millis()
    );

    let wallet = Wallet::V0(wallet_v0);
    let wallet_file = match params.result_with_wallet_file {
        false => vec![],
        true => to_vec(&NgFile::V0(NgFileV0::Wallet(wallet.clone()))).unwrap(),
    };
    Ok((
        CreateWalletResultV0 {
            wallet: wallet,
            wallet_file,
            pazzle,
            mnemonic: mnemonic.clone(),
            mnemonic_str: mnemonic.map_or(vec![], |m| display_mnemonic(&m)),
            wallet_name: params.wallet_name.clone(),
            client: params.client.clone(),
            user,
            in_memory: params.in_memory,
            session_id: 0,
            pdf_file: vec![],
        },
        site,
        brokers,
    ))
}

#[cfg(test)]
mod test {
    use crate::emojis::display_pazzle_one;

    use super::*;
    use ng_net::types::BootstrapContentV0;
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
        let _shuffle = gen_shuffle_for_pazzle_opening(9);
        log_debug!("{:?}", _shuffle);
        let _shuffle = gen_shuffle_for_pazzle_opening(12);
        log_debug!("{:?}", _shuffle);
        let _shuffle = gen_shuffle_for_pazzle_opening(15);
        log_debug!("{:?}", _shuffle);
        let _digits = gen_shuffle_for_pin();
        log_debug!("{:?}", _digits);
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

        let _creation = Instant::now();

        let res = create_wallet_first_step_v0(CreateWalletV0::new(
            Some(img_buffer),
            "   know     yourself  ".to_string(),
            Some(pin),
            9,
            None,
            true,
            false,
            false,
            BootstrapContentV0::new_localhost(PubKey::nil()),
            None,
            None,
            false,
            "test".to_string(),
        ))
        .expect("create_wallet_first_step_v0");

        let mut verifier = Verifier::new_dummy();
        let (res, _, _) = create_wallet_second_step_v0(res, &mut verifier)
            .await
            .expect("create_wallet_second_step_v0");

        log_info!(
            "creation of wallet took: {} ms",
            _creation.elapsed().as_millis()
        );
        log_debug!("-----------------------------");

        let mut file = File::create("tests/wallet.ngw").expect("open wallet write file");
        let ser_wallet = to_vec(&NgFile::V0(NgFileV0::Wallet(res.wallet.clone()))).unwrap();
        let _ = file.write_all(&ser_wallet);

        log_debug!("wallet id: {}", res.wallet.id());
        log_debug!(
            "pazzle {:?}",
            display_pazzle_one(res.pazzle.as_ref().expect("no pazzle"))
        );
        log_debug!(
            "mnemonic {:?}",
            display_mnemonic(&res.mnemonic.expect("no mnemonic"))
        );
        log_debug!("pin {:?}", pin);

        if let Wallet::V0(v0) = &res.wallet {
            log_debug!("security text: {:?}", v0.content.security_txt);

            let img = v0.content.security_img.as_ref().expect("no securit image");
            let mut file =
                File::create("tests/generated_security_image.jpg").expect("open write file");
            let _ = file.write_all(img);

            let f = File::open("tests/generated_security_image.jpg.compare")
                .expect("open of generated_security_image.jpg.compare");
            let mut reader = BufReader::new(f);
            let mut generated_security_image_compare = Vec::new();
            // Read file into vector.
            reader
                .read_to_end(&mut generated_security_image_compare)
                .expect("read of generated_security_image.jpg.compare");

            assert_eq!(img, &generated_security_image_compare);

            let _opening_mnemonic = Instant::now();

            let _w = open_wallet_with_mnemonic(
                &Wallet::V0(v0.clone()),
                res.mnemonic.expect("no mnemonic"),
                pin.clone(),
            )
            .expect("open with mnemonic");
            //log_debug!("encrypted part {:?}", w);

            log_info!(
                "opening of wallet with mnemonic took: {} ms",
                _opening_mnemonic.elapsed().as_millis()
            );

            if v0.content.pazzle_length > 0 {
                let _opening_pazzle = Instant::now();
                let _w = open_wallet_with_pazzle(
                    &Wallet::V0(v0.clone()),
                    res.pazzle.as_ref().expect("no pazzle").clone(),
                    pin,
                )
                .expect("open with pazzle");
                log_info!(
                    "opening of wallet with pazzle took: {} ms",
                    _opening_pazzle.elapsed().as_millis()
                );
            }
            log_debug!("encrypted part {:?}", _w);
        }
    }
}
