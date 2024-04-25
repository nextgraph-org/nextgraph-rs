// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Event, a message sent in the PUB/SUB

use zeroize::Zeroize;

use crate::block_storage::*;
use crate::errors::*;
use crate::object::*;
use crate::repo::BranchInfo;
use crate::repo::Repo;
use crate::store::Store;
use crate::types::*;
use crate::utils::*;
use core::fmt;
use std::sync::Arc;
use std::sync::RwLockWriteGuard;

use chacha20::cipher::{KeyIvInit, StreamCipher};
use chacha20::ChaCha20;

impl fmt::Display for Event {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V0(v0) => {
                writeln!(f, "V0")?;
                writeln!(f, "topic_sig:      {}", v0.topic_sig)?;
                writeln!(f, "peer_sig:      {}", v0.peer_sig)?;
                write!(f, "content:  {}", v0.content)?;
                Ok(())
            }
        }
    }
}

impl fmt::Display for EventContentV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "V0")?;
        writeln!(f, "topic:      {}", self.topic)?;
        writeln!(f, "publisher:  {}", self.publisher)?;
        writeln!(f, "seq:        {}", self.seq)?;
        writeln!(f, "blocks:     {}", self.blocks.len())?;
        let mut i = 0;
        for block in &self.blocks {
            writeln!(f, "========== {:03}: {}", i, block.id())?;
            i += 1;
        }
        writeln!(f, "file ids:     {}", self.file_ids.len())?;
        let mut i = 0;
        for file in &self.file_ids {
            writeln!(f, "========== {:03}: {}", i, file)?;
            i += 1;
        }
        writeln!(f, "key:  {:?}", self.key)?;
        Ok(())
    }
}

impl Event {
    pub fn new(
        publisher: &PrivKey,
        seq: u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo: &Repo,
    ) -> Result<Event, NgError> {
        Ok(Event::V0(EventV0::new(
            publisher,
            seq,
            commit,
            additional_blocks,
            repo,
        )?))
    }

    pub fn seq_num(&self) -> u64 {
        match self {
            Event::V0(v0) => v0.content.seq,
        }
    }

    pub fn topic_id(&self) -> &TopicId {
        match self {
            Event::V0(v0) => &v0.content.topic,
        }
    }

    /// opens an event with the key derived from information kept in Repo.
    ///
    /// returns the Commit object and optional list of additional block IDs.
    /// Those blocks have been added to the storage of store of repo so they can be retrieved.
    pub fn open_with_info(&self, repo: &Repo, branch: &BranchInfo) -> Result<Commit, NgError> {
        match self {
            Self::V0(v0) => v0.open_with_info(repo, branch),
        }
    }

    pub fn open(
        &self,
        store: &Store,
        repo_id: &RepoId,
        branch_id: &BranchId,
        branch_secret: &ReadCapSecret,
    ) -> Result<Commit, NgError> {
        match self {
            Self::V0(v0) => v0.open(store, repo_id, branch_id, branch_secret),
        }
    }

    // pub fn put_blocks<'a>(
    //     &self,
    //     overlay: &OverlayId,
    //     storage: &RwLockWriteGuard<'a, dyn BlockStorage + Send + Sync + 'static>,
    // ) -> Result<ObjectId, NgError> {
    //     match self {
    //         Self::V0(v0) => v0.put_blocks(overlay, storage),
    //     }
    // }
}

impl EventV0 {
    pub fn derive_key(
        repo_id: &RepoId,
        branch_id: &BranchId,
        branch_secret: &ReadCapSecret,
        publisher: &PubKey,
    ) -> [u8; blake3::OUT_LEN] {
        let mut key_material = match (*repo_id, *branch_id, branch_secret.clone(), *publisher) {
            (
                PubKey::Ed25519PubKey(repo),
                PubKey::Ed25519PubKey(branch),
                SymKey::ChaCha20Key(branch_sec),
                PubKey::Ed25519PubKey(publ),
            ) => [repo, branch, branch_sec, publ].concat(),
            (_, _, _, _) => panic!("cannot derive key with Montgomery key"),
        };
        let res = blake3::derive_key(
            "NextGraph Event Commit ObjectKey ChaCha20 key",
            key_material.as_slice(),
        );
        key_material.zeroize();
        res
    }

    pub fn new(
        publisher: &PrivKey,
        seq: u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        repo: &Repo,
    ) -> Result<EventV0, NgError> {
        let branch_id = commit.branch();
        let repo_id = repo.id;
        let store = Arc::clone(&repo.store);
        let branch = repo.branch(branch_id)?;
        let topic_id = &branch.topic;
        let topic_priv_key = branch
            .topic_priv_key
            .as_ref()
            .ok_or(NgError::PermissionDenied)?;
        let publisher_pubkey = publisher.to_pub();
        let key = Self::derive_key(&repo_id, branch_id, &branch.read_cap.key, &publisher_pubkey);
        let commit_key = commit.key().unwrap();
        let mut encrypted_commit_key = Vec::from(commit_key.slice());
        let mut nonce = seq.to_le_bytes().to_vec();
        nonce.append(&mut vec![0; 4]);
        let mut cipher = ChaCha20::new((&key).into(), (nonce.as_slice()).into());
        cipher.apply_keystream(encrypted_commit_key.as_mut_slice());

        let mut blocks = vec![];
        for bid in commit.blocks().iter() {
            blocks.push(store.get(bid)?);
        }
        for bid in additional_blocks.iter() {
            blocks.push(store.get(bid)?);
        }
        let event_content = EventContentV0 {
            topic: *topic_id,
            publisher: PeerId::Forwarded(publisher_pubkey),
            seq,
            blocks,
            file_ids: commit
                .header()
                .as_ref()
                .map_or_else(|| vec![], |h| h.files().to_vec()),
            key: encrypted_commit_key,
        };
        let event_content_ser = serde_bare::to_vec(&event_content).unwrap();
        let topic_sig = sign(topic_priv_key, topic_id, &event_content_ser)?;
        let peer_sig = sign(publisher, &publisher_pubkey, &event_content_ser)?;
        Ok(EventV0 {
            content: event_content,
            topic_sig,
            peer_sig,
        })
    }

    // pub fn put_blocks<'a>(
    //     &self,
    //     overlay: &OverlayId,
    //     storage: &RwLockWriteGuard<'a, dyn BlockStorage + Send + Sync + 'static>,
    // ) -> Result<ObjectId, NgError> {
    //     let mut first_id = None;
    //     for block in &self.content.blocks {
    //         let id = storage.put(overlay, block)?;
    //         if first_id.is_none() {
    //             first_id = Some(id)
    //         }
    //     }
    //     first_id.ok_or(NgError::CommitLoadError(CommitLoadError::NotACommit))
    // }

    /// opens an event with the key derived from information kept in Repo.
    ///
    /// returns the Commit object and optional list of additional block IDs.
    /// Those blocks have been added to the storage of store of repo so they can be retrieved.
    pub fn open_with_info(&self, repo: &Repo, branch: &BranchInfo) -> Result<Commit, NgError> {
        self.open(&repo.store, &repo.id, &branch.id, &branch.read_cap.key)
    }

    pub fn open(
        &self,
        store: &Store,
        repo_id: &RepoId,
        branch_id: &BranchId,
        branch_secret: &ReadCapSecret,
    ) -> Result<Commit, NgError> {
        // TODO: verifier event signature

        let publisher_pubkey = self.content.publisher.get_pub_key();
        let key = Self::derive_key(repo_id, branch_id, branch_secret, &publisher_pubkey);
        let mut encrypted_commit_key = self.content.key.clone();
        let mut nonce = self.content.seq.to_le_bytes().to_vec();
        nonce.append(&mut vec![0; 4]);
        let mut cipher = ChaCha20::new((&key).into(), (nonce.as_slice()).into());
        cipher.apply_keystream(encrypted_commit_key.as_mut_slice());

        let commit_key: SymKey = encrypted_commit_key.as_slice().try_into()?;

        let mut first_id = None;
        for block in &self.content.blocks {
            let id = store.put(block)?;
            if first_id.is_none() {
                first_id = Some(id)
            }
        }
        let commit_ref = ObjectRef::from_id_key(first_id.unwrap(), commit_key);
        Ok(Commit::load(commit_ref, &store, true)?)
    }
}
