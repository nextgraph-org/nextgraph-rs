/*
 * Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
 */

use std::collections::HashMap;
use std::fs::{read, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::broker_storage::account::Account;
use crate::broker_storage::invitation::Invitation;
use crate::broker_storage::wallet::Wallet;
use crate::types::*;
use ng_net::errors::{ProtocolError, ServerError};
use ng_net::server_storage::*;
use ng_net::types::{BootstrapContentV0, InvitationCode, InvitationV0};
use ng_repo::errors::StorageError;
use ng_repo::kcv_storage::KCVStore;
use ng_repo::log::*;
use ng_repo::types::{PeerId, PubKey, SymKey};
use ng_storage_rocksdb::kcv_storage::RocksdbKCVStore;

pub struct RocksdbServerStorage {
    wallet_storage: RocksdbKCVStore,
    accounts_storage: RocksdbKCVStore,
    peers_storage: RocksdbKCVStore,
    peers_last_seq_path: PathBuf,
    peers_last_seq: Mutex<HashMap<PeerId, u64>>,
}

impl RocksdbServerStorage {
    pub fn open(
        path: &mut PathBuf,
        master_key: SymKey,
        admin_invite: Option<BootstrapContentV0>,
    ) -> Result<Self, StorageError> {
        // create/open the WALLET
        let mut wallet_path = path.clone();
        wallet_path.push("wallet");
        std::fs::create_dir_all(wallet_path.clone()).unwrap();
        log_debug!("opening wallet DB");
        //TODO redo the whole key passing mechanism in RKV so it uses zeroize all the way
        let wallet_storage = RocksdbKCVStore::open(&wallet_path, master_key.slice().clone())?;
        let wallet = Wallet::open(&wallet_storage);

        // create/open the ACCOUNTS storage
        let mut accounts_path = path.clone();
        let accounts_key;
        accounts_path.push("accounts");

        if admin_invite.is_some() && !accounts_path.exists() && !wallet.exists_accounts_key() {
            accounts_key = wallet.create_accounts_key()?;
            std::fs::create_dir_all(accounts_path.clone()).unwrap();
            let accounts_storage =
                RocksdbKCVStore::open(&accounts_path, accounts_key.slice().clone())?;
            let symkey = SymKey::random();
            let invite_code = InvitationCode::Admin(symkey.clone());
            let _ = Invitation::create(
                &invite_code,
                0,
                &Some("admin user automatically invited at first startup".to_string()),
                &accounts_storage,
            )?;
            let invitation = ng_net::types::Invitation::V0(InvitationV0 {
                code: Some(symkey),
                name: Some("your NG Box, as admin".into()),
                url: None,
                bootstrap: admin_invite.unwrap(),
            });
            for link in invitation.get_urls() {
                println!("The admin invitation link is: {}", link)
            }
        } else {
            if admin_invite.is_some() {
                log_warn!("Cannot add an admin invitation anymore, as it is not the first start of the server.");
            }
            accounts_key = wallet.get_or_create_accounts_key()?;
        }
        log_debug!("opening accounts DB");
        std::fs::create_dir_all(accounts_path.clone()).unwrap();
        //TODO redo the whole key passing mechanism in RKV so it uses zeroize all the way
        let accounts_storage = RocksdbKCVStore::open(&accounts_path, accounts_key.slice().clone())?;

        // create/open the PEERS storage
        log_debug!("opening peers DB");
        let peers_key = wallet.get_or_create_peers_key()?;
        let mut peers_path = path.clone();
        peers_path.push("peers");
        std::fs::create_dir_all(peers_path.clone()).unwrap();
        //TODO redo the whole key passing mechanism in RKV so it uses zeroize all the way
        let peers_storage = RocksdbKCVStore::open(&peers_path, peers_key.slice().clone())?;

        // creates the path for peers_last_seq
        let mut peers_last_seq_path = path.clone();
        peers_last_seq_path.push("peers_last_seq");
        std::fs::create_dir_all(peers_last_seq_path.clone()).unwrap();

        Ok(RocksdbServerStorage {
            wallet_storage,
            accounts_storage,
            peers_storage,
            peers_last_seq_path,
            peers_last_seq: Mutex::new(HashMap::new()),
        })
    }
}

impl ServerStorage for RocksdbServerStorage {
    fn next_seq_for_peer(&self, peer: &PeerId, seq: u64) -> Result<(), ServerError> {
        // for now we don't use the hashmap.
        // TODO: let's see if the lock is even needed
        let _ = self.peers_last_seq.lock();

        let mut filename = self.peers_last_seq_path.clone();
        filename.push(format!("{}", peer));
        let file = read(filename.clone());
        let mut file_save = match file {
            Ok(ser) => {
                let last: u64 = serde_bare::from_slice(&ser).map_err(|e| ServerError::FileError)?;
                if last >= seq {
                    return Err(ServerError::SequenceMismatch);
                }
                OpenOptions::new()
                    .write(true)
                    .open(filename)
                    .map_err(|e| ServerError::FileError)?
            }
            Err(_) => File::create(filename).map_err(|e| ServerError::FileError)?,
        };
        let ser = serde_bare::to_vec(&seq).unwrap();
        file_save
            .write_all(&ser)
            .map_err(|e| ServerError::FileError)?;

        file_save.sync_data().map_err(|e| ServerError::FileError)?;
        Ok(())
    }

    fn get_user(&self, user_id: PubKey) -> Result<bool, ProtocolError> {
        log_debug!("get_user {user_id}");
        Ok(Account::open(&user_id, &self.accounts_storage)?.is_admin()?)
    }
    fn add_user(&self, user_id: PubKey, is_admin: bool) -> Result<(), ProtocolError> {
        log_debug!("add_user {user_id} is admin {is_admin}");
        Account::create(&user_id, is_admin, &self.accounts_storage)?;
        Ok(())
    }
    fn del_user(&self, user_id: PubKey) -> Result<(), ProtocolError> {
        log_debug!("del_user {user_id}");
        let acc = Account::open(&user_id, &self.accounts_storage)?;
        acc.del()?;
        Ok(())
    }
    fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError> {
        log_debug!("list_users that are admin == {admins}");
        Ok(Account::get_all_users(admins, &self.accounts_storage)?)
    }
    fn list_invitations(
        &self,
        admin: bool,
        unique: bool,
        multi: bool,
    ) -> Result<Vec<(InvitationCode, u32, Option<String>)>, ProtocolError> {
        log_debug!("list_invitations admin={admin} unique={unique} multi={multi}");
        Ok(Invitation::get_all_invitations(
            &self.accounts_storage,
            admin,
            unique,
            multi,
        )?)
    }
    fn add_invitation(
        &self,
        invite_code: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
    ) -> Result<(), ProtocolError> {
        log_debug!("add_invitation {invite_code} expiry {expiry}");
        Invitation::create(invite_code, expiry, memo, &self.accounts_storage)?;
        Ok(())
    }
    fn get_invitation_type(&self, invite_code: [u8; 32]) -> Result<u8, ProtocolError> {
        log_debug!("get_invitation_type {:?}", invite_code);
        let inv = Invitation::open(&invite_code, &self.accounts_storage)?;
        inv.get_type()
    }
    fn remove_invitation(&self, invite_code: [u8; 32]) -> Result<(), ProtocolError> {
        log_debug!("remove_invitation {:?}", invite_code);
        let inv = Invitation::open(&invite_code, &self.accounts_storage)?;
        inv.del()?;
        Ok(())
    }
}
