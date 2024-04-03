// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Event

use crate::errors::*;
use crate::object::*;
use crate::store::*;
use crate::types::*;
use crate::utils::*;
use core::fmt;

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
    pub fn new<'a>(
        publisher: &PrivKey,
        seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        topic_id: TopicId,
        branch_read_cap_secret: ReadCapSecret,
        topic_priv_key: &BranchWriteCapSecret,
        storage: &'a Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Result<Event, NgError> {
        Ok(Event::V0(EventV0::new(
            publisher,
            seq,
            commit,
            additional_blocks,
            topic_id,
            branch_read_cap_secret,
            topic_priv_key,
            storage,
        )?))
    }
}

impl EventV0 {
    pub fn new<'a>(
        publisher: &PrivKey,
        seq: &mut u64,
        commit: &Commit,
        additional_blocks: &Vec<BlockId>,
        topic_id: TopicId,
        branch_read_cap_secret: ReadCapSecret,
        topic_priv_key: &BranchWriteCapSecret,
        storage: &'a Box<dyn RepoStore + Send + Sync + 'a>,
    ) -> Result<EventV0, NgError> {
        let mut blocks = vec![];
        for bid in commit.blocks().iter() {
            blocks.push(storage.get(bid)?);
        }
        for bid in additional_blocks.iter() {
            blocks.push(storage.get(bid)?);
        }
        (*seq) += 1;
        let publisher_pubkey = publisher.to_pub();
        let event_content = EventContentV0 {
            topic: topic_id,
            publisher: PeerId::Forwarded(publisher_pubkey),
            seq: *seq,
            blocks,
            file_ids: commit
                .header()
                .as_ref()
                .map_or_else(|| vec![], |h| h.files().to_vec()),
            key: vec![], // TODO
        };
        let event_content_ser = serde_bare::to_vec(&event_content).unwrap();
        let topic_sig = sign(topic_priv_key, &topic_id, &event_content_ser)?;
        let peer_sig = sign(publisher, &publisher_pubkey, &event_content_ser)?;
        Ok(EventV0 {
            content: event_content,
            topic_sig,
            peer_sig,
        })
    }
}
