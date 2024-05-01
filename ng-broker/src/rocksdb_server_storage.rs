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
use std::sync::{Arc, Mutex};

use crate::server_broker::*;
use crate::server_storage::admin::account::Account;
use crate::server_storage::admin::invitation::Invitation;
use crate::server_storage::admin::wallet::Wallet;
use crate::server_storage::core::*;
use crate::types::*;
use ng_net::types::*;
use ng_repo::block_storage::{BlockStorage, HashMapBlockStorage};
use ng_repo::errors::{ProtocolError, ServerError, StorageError};

use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::store::Store;
use ng_repo::types::*;
use ng_storage_rocksdb::block_storage::RocksDbBlockStorage;
use ng_storage_rocksdb::kcv_storage::RocksDbKCVStorage;

pub(crate) struct RocksDbServerStorage {
    wallet_storage: RocksDbKCVStorage,
    accounts_storage: RocksDbKCVStorage,
    //peers_storage: RocksDbKCVStorage,
    peers_last_seq_path: PathBuf,
    peers_last_seq: Mutex<HashMap<PeerId, u64>>,
    block_storage: RocksDbBlockStorage,
    core_storage: RocksDbKCVStorage,
}

impl RocksDbServerStorage {
    pub(crate) fn open(
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
        let mut wallet_storage = RocksDbKCVStorage::open(&wallet_path, master_key.slice().clone())?;
        let wallet = Wallet::open(&wallet_storage);

        // create/open the ACCOUNTS storage
        let mut accounts_path = path.clone();
        let accounts_key;
        accounts_path.push("accounts");

        if admin_invite.is_some() && !accounts_path.exists() && !wallet.exists_accounts_key() {
            accounts_key = wallet.create_accounts_key()?;
            std::fs::create_dir_all(accounts_path.clone()).unwrap();
            let accounts_storage =
                RocksDbKCVStorage::open(&accounts_path, accounts_key.slice().clone())?;
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
        let mut accounts_storage =
            RocksDbKCVStorage::open(&accounts_path, accounts_key.slice().clone())?;

        // create/open the PEERS storage
        // log_debug!("opening peers DB");
        // let peers_key = wallet.get_or_create_peers_key()?;
        // let mut peers_path = path.clone();
        // peers_path.push("peers");
        // std::fs::create_dir_all(peers_path.clone()).unwrap();
        // //TODO redo the whole key passing mechanism in RKV so it uses zeroize all the way
        // let peers_storage = RocksDbKCVStorage::open(&peers_path, peers_key.slice().clone())?;

        // creates the path for peers_last_seq
        let mut peers_last_seq_path = path.clone();
        peers_last_seq_path.push("peers_last_seq");
        std::fs::create_dir_all(peers_last_seq_path.clone()).unwrap();

        // opening block_storage
        let mut blocks_path = path.clone();
        blocks_path.push("blocks");
        std::fs::create_dir_all(blocks_path.clone()).unwrap();
        let blocks_key = wallet.get_or_create_blocks_key()?;
        let block_storage = RocksDbBlockStorage::open(&blocks_path, *blocks_key.slice())?;

        // create/open the PEERS storage
        log_debug!("opening core DB");
        let core_key = wallet.get_or_create_core_key()?;
        let mut core_path = path.clone();
        core_path.push("core");
        std::fs::create_dir_all(core_path.clone()).unwrap();
        //TODO redo the whole key passing mechanism in RKV so it uses zeroize all the way
        let mut core_storage = RocksDbKCVStorage::open(&core_path, core_key.slice().clone())?;

        // check unicity of class prefixes, by storage
        #[cfg(debug_assertions)]
        {
            // TODO: refactor the wallet and accounts with Class and the new OKM mechanism, then include them uncomment the following lines
            //log_debug!("CHECKING...");
            // wallet_storage.add_class(&Wallet::CLASS);
            // wallet_storage.check_prefixes();
            // accounts_storage.add_class(&Account::CLASS);
            // accounts_storage.add_class(&Invitation::CLASS);
            // accounts_storage.check_prefixes();
            core_storage.add_class(&TopicStorage::CLASS);
            core_storage.add_class(&RepoHashStorage::CLASS);
            core_storage.add_class(&OverlayStorage::CLASS);
            core_storage.add_class(&CommitStorage::CLASS);
            core_storage.check_prefixes();
        }

        Ok(RocksDbServerStorage {
            wallet_storage,
            accounts_storage,
            //peers_storage,
            peers_last_seq_path,
            peers_last_seq: Mutex::new(HashMap::new()),
            block_storage,
            core_storage,
        })
    }

    pub(crate) fn next_seq_for_peer(&self, peer: &PeerId, seq: u64) -> Result<(), ServerError> {
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

    pub(crate) fn get_user(&self, user_id: PubKey) -> Result<bool, ProtocolError> {
        log_debug!("get_user {user_id}");
        Ok(Account::open(&user_id, &self.accounts_storage)?.is_admin()?)
    }
    pub(crate) fn add_user(&self, user_id: PubKey, is_admin: bool) -> Result<(), ProtocolError> {
        log_debug!("add_user {user_id} is admin {is_admin}");
        Account::create(&user_id, is_admin, &self.accounts_storage)?;
        Ok(())
    }
    pub(crate) fn del_user(&self, user_id: PubKey) -> Result<(), ProtocolError> {
        log_debug!("del_user {user_id}");
        let acc = Account::open(&user_id, &self.accounts_storage)?;
        acc.del()?;
        Ok(())
    }
    pub(crate) fn list_users(&self, admins: bool) -> Result<Vec<PubKey>, ProtocolError> {
        log_debug!("list_users that are admin == {admins}");
        Ok(Account::get_all_users(admins, &self.accounts_storage)?)
    }
    pub(crate) fn list_invitations(
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
    pub(crate) fn add_invitation(
        &self,
        invite_code: &InvitationCode,
        expiry: u32,
        memo: &Option<String>,
    ) -> Result<(), ProtocolError> {
        log_debug!("add_invitation {invite_code} expiry {expiry}");
        Invitation::create(invite_code, expiry, memo, &self.accounts_storage)?;
        Ok(())
    }
    pub(crate) fn get_invitation_type(&self, invite_code: [u8; 32]) -> Result<u8, ProtocolError> {
        log_debug!("get_invitation_type {:?}", invite_code);
        let inv = Invitation::open(&invite_code, &self.accounts_storage)?;
        inv.get_type()
    }
    pub(crate) fn remove_invitation(&self, invite_code: [u8; 32]) -> Result<(), ProtocolError> {
        log_debug!("remove_invitation {:?}", invite_code);
        let inv = Invitation::open(&invite_code, &self.accounts_storage)?;
        inv.del()?;
        Ok(())
    }
    pub(crate) fn get_repo_pin_status(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user: &UserId,
    ) -> Result<RepoPinStatus, ServerError> {
        let repo_info = RepoHashStorage::load_for_user(user, repo, overlay, &self.core_storage)?;
        let mut topics = vec![];
        for topic in repo_info.topics {
            if let Ok(mut model) = TopicStorage::open(&topic, overlay, &self.core_storage) {
                match TopicStorage::USERS.get(&mut model, user) {
                    Err(_) => {}
                    Ok(publisher) => topics.push(TopicSubRes::new_from_heads(
                        TopicStorage::get_all_heads(&mut model)?,
                        publisher,
                        topic,
                    )),
                }
            }
        }
        if topics.len() == 0 {
            return Err(ServerError::False);
        }

        Ok(RepoPinStatus::V0(RepoPinStatusV0 {
            hash: repo.clone(),
            expose_outer: repo_info.expose_outer.len() > 0,
            topics,
        }))
    }

    pub(crate) fn pin_repo_write(
        &self,
        overlay_access: &OverlayAccess,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
        rw_topics: &Vec<PublisherAdvert>,
        overlay_root_topic: &Option<TopicId>,
        expose_outer: bool,
    ) -> Result<RepoOpened, ServerError> {
        assert!(!overlay_access.is_read_only());

        // TODO: all the below DB operations should be done inside a single transaction. need refactor of Object-KCV-Mapping to take an optional transaction.

        let inner_overlay = overlay_access.overlay_id_for_client_protocol_purpose();
        let mut inner_overlay_storage =
            match OverlayStorage::open(inner_overlay, &self.core_storage) {
                Err(StorageError::NotFound) => {
                    // inner overlay doesn't exist, we need to create it
                    OverlayStorage::create(
                        inner_overlay,
                        &(*overlay_access).into(),
                        &self.core_storage,
                    )?
                }
                Err(e) => return Err(e.into()),
                Ok(os) => os,
            };
        // the overlay we use to store all the info is: the outer for a RW access, and the inner for a WO access.
        let overlay = match inner_overlay_storage.overlay_type() {
            OverlayType::Outer(_) => {
                panic!("shouldnt happen: we are pinning to an inner overlay. why is it outer type?")
            }
            OverlayType::Inner(outer) => outer,
            OverlayType::InnerOnly => inner_overlay,
        }
        .clone();

        // if an overlay_root_topic was provided, we update it in the DB:
        // this information is stored on the inner overlay record, contrary to the rest of the info below, that is stored on the outer (except for WO)
        if overlay_root_topic.is_some() {
            OverlayStorage::TOPIC.set(
                &mut inner_overlay_storage,
                overlay_root_topic.as_ref().unwrap(),
            )?;
        }

        // we now do the pinning :

        let mut result: RepoOpened = vec![];
        let mut repo_info = RepoHashStorage::open(repo, &overlay, &self.core_storage)?;

        if expose_outer {
            RepoHashStorage::EXPOSE_OUTER.add(&mut repo_info, user_id)?;
        }

        let mut rw_topics_added: HashMap<TopicId, TopicSubRes> =
            HashMap::with_capacity(rw_topics.len());
        for topic in rw_topics {
            let topic_id = topic.topic_id();
            let mut topic_storage =
                TopicStorage::create(topic_id, &overlay, repo, &self.core_storage, true)?;

            RepoHashStorage::TOPICS.add_lazy(&mut repo_info, topic_id)?;

            let _ = TopicStorage::ADVERT.get_or_set(&mut topic_storage, topic)?;

            TopicStorage::USERS.add_or_change(&mut topic_storage, user_id, &true)?;

            rw_topics_added.insert(
                *topic_id,
                TopicSubRes::new_from_heads(
                    TopicStorage::get_all_heads(&mut topic_storage)?,
                    true,
                    *topic_id,
                ),
            );
        }

        for topic in ro_topics {
            if rw_topics_added.contains_key(topic) {
                continue;
                //we do not want to add again as read_only, a topic that was just opened as RW (publisher)
            }

            let mut topic_storage =
                TopicStorage::create(topic, &overlay, repo, &self.core_storage, true)?;

            RepoHashStorage::TOPICS.add_lazy(&mut repo_info, topic)?;

            let _ = TopicStorage::USERS.get_or_add(&mut topic_storage, user_id, &false)?;

            result.push(TopicSubRes::new_from_heads(
                TopicStorage::get_all_heads(&mut topic_storage)?,
                false,
                *topic,
            ));
        }
        result.extend(rw_topics_added.into_values());
        Ok(result)
    }

    pub(crate) fn pin_repo_read(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        user_id: &UserId,
        ro_topics: &Vec<TopicId>,
    ) -> Result<RepoOpened, ServerError> {
        let mut overlay_storage = OverlayStorage::open(overlay, &self.core_storage)?;
        match overlay_storage.overlay_type() {
            OverlayType::Outer(_) => {
                let mut result: RepoOpened = vec![];
                let repo_info = RepoHashStorage::load_topics(repo, overlay, &self.core_storage)?;
                for topic in ro_topics {
                    if repo_info.topics.contains(topic) {
                        let mut topic_storage =
                            TopicStorage::open(topic, overlay, &self.core_storage)?;
                        let _ =
                            TopicStorage::USERS.get_or_add(&mut topic_storage, user_id, &false)?;

                        result.push(TopicSubRes::new_from_heads(
                            TopicStorage::get_all_heads(&mut topic_storage)?,
                            false,
                            *topic,
                        ));
                    }
                }
                Ok(result)
            }
            _ => return Err(ServerError::NotFound),
        }
    }

    fn check_overlay(&self, overlay: &OverlayId) -> Result<OverlayId, ServerError> {
        let mut overlay_storage =
            OverlayStorage::open(overlay, &self.core_storage).map_err(|e| match e {
                StorageError::NotFound => ServerError::OverlayNotFound,
                _ => e.into(),
            })?;
        Ok(match overlay_storage.overlay_type() {
            OverlayType::Outer(_) => {
                if overlay.is_outer() {
                    *overlay
                } else {
                    return Err(ServerError::OverlayMismatch);
                }
            }
            OverlayType::Inner(outer) => {
                if outer.is_outer() {
                    *outer
                } else {
                    return Err(ServerError::OverlayMismatch);
                }
            }
            OverlayType::InnerOnly => {
                if overlay.is_inner() {
                    *overlay
                } else {
                    return Err(ServerError::OverlayMismatch);
                }
            }
        })
    }

    pub(crate) fn topic_sub(
        &self,
        overlay: &OverlayId,
        repo: &RepoHash,
        topic: &TopicId,
        user_id: &UserId,
        publisher: Option<&PublisherAdvert>,
    ) -> Result<TopicSubRes, ServerError> {
        let overlay = self.check_overlay(overlay)?;
        // now we check that the repo was previously pinned.
        // if it was opened but not pinned, then this should be deal with in the ServerBroker, in memory, not here)

        let is_publisher = publisher.is_some();
        // (we already checked that the advert is valid)

        let mut topic_storage =
            TopicStorage::create(topic, &overlay, repo, &self.core_storage, true)?;
        let _ = TopicStorage::USERS.get_or_add(&mut topic_storage, user_id, &is_publisher)?;

        if is_publisher {
            let _ = TopicStorage::ADVERT.get_or_set(&mut topic_storage, publisher.unwrap())?;
        }

        let mut repo_info = RepoHashStorage::open(repo, &overlay, &self.core_storage)?;
        RepoHashStorage::TOPICS.add_lazy(&mut repo_info, topic)?;

        Ok(TopicSubRes::new_from_heads(
            TopicStorage::get_all_heads(&mut topic_storage)?,
            is_publisher,
            *topic,
        ))
    }

    pub(crate) fn get_commit(
        &self,
        overlay: &OverlayId,
        id: &ObjectId,
    ) -> Result<Vec<Block>, ServerError> {
        //TODO: implement correctly !
        Ok(vec![Block::dummy()])
    }

    fn add_block(
        &self,
        overlay_id: &OverlayId,
        overlay_storage: &mut OverlayStorage,
        block: Block,
    ) -> Result<BlockId, StorageError> {
        let block_id = self.block_storage.put(overlay_id, &block, true)?;
        OverlayStorage::BLOCKS.increment(overlay_storage, &block_id)?;
        Ok(block_id)
    }

    pub(crate) fn save_event(
        &self,
        overlay: &OverlayId,
        mut event: Event,
        user_id: &UserId,
    ) -> Result<(), ServerError> {
        if overlay.is_outer() {
            // we don't publish events on the outer overlay!
            return Err(ServerError::OverlayMismatch);
        }
        let overlay = self.check_overlay(overlay)?;
        let overlay = &overlay;

        // check that the sequence number is correct

        // check that the topic exists and that this user has pinned it as publisher
        let mut topic_storage = TopicStorage::open(event.topic_id(), overlay, &self.core_storage)
            .map_err(|e| match e {
            StorageError::NotFound => ServerError::TopicNotFound,
            _ => e.into(),
        })?;
        let is_publisher = TopicStorage::USERS
            .get(&mut topic_storage, user_id)
            .map_err(|e| match e {
                StorageError::NotFound => ServerError::AccessDenied,
                _ => e.into(),
            })?;
        if !is_publisher {
            return Err(ServerError::AccessDenied);
        }

        // remove the blocks from inside the event, and save the empty event and each block separately.
        match event {
            Event::V0(mut v0) => {
                let mut overlay_storage = OverlayStorage::new(overlay, &self.core_storage);
                let mut extracted_blocks_ids = Vec::with_capacity(v0.content.blocks.len());
                let first_block_copy = v0.content.blocks[0].clone();
                let temp_mini_block_storage = HashMapBlockStorage::new();
                for block in v0.content.blocks {
                    let _ = temp_mini_block_storage.put(overlay, &block, false)?;
                    extracted_blocks_ids.push(self.add_block(
                        overlay,
                        &mut overlay_storage,
                        block,
                    )?);
                }

                // creating a temporary store to access the blocks
                let temp_store = Store::new_from_overlay_id(
                    overlay,
                    Arc::new(std::sync::RwLock::new(temp_mini_block_storage)),
                );
                let commit_id = extracted_blocks_ids[0];
                let header = Object::load_header(&first_block_copy, &temp_store)
                    .map_err(|_| ServerError::InvalidHeader)?;

                v0.content.blocks = vec![];
                let event_info = EventInfo {
                    event: Event::V0(v0),
                    blocks: extracted_blocks_ids,
                };

                CommitStorage::create(
                    &commit_id,
                    overlay,
                    event_info,
                    &header,
                    true,
                    &self.core_storage,
                )?;
            }
        }

        Ok(())
    }
}
