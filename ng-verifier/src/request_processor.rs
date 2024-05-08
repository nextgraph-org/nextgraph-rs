// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Processor for each type of AppRequest

use futures::channel::mpsc;
use futures::SinkExt;
use futures::StreamExt;
use ng_net::utils::ResultSend;
use std::sync::Arc;

use crate::types::*;

use crate::verifier::*;

use ng_net::utils::{spawn_and_log_error, Receiver, Sender};

use ng_repo::errors::*;
use ng_repo::file::{RandomAccessFile, ReadFile};
use ng_repo::types::BranchId;
use ng_repo::types::*;

use ng_repo::log::*;
use ng_repo::types::StoreRepo;

impl AppRequestCommandV0 {
    pub(crate) async fn process_stream(
        &self,
        verifier: &mut Verifier,
        nuri: &NuriV0,
        payload: &Option<AppRequestPayload>,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        match self {
            Self::Fetch(fetch) => match fetch {
                AppFetchContentV0::Subscribe => {
                    let (_, branch_id, _) =
                        Self::open_for_target(verifier, &nuri.target, false).await?;
                    Ok(verifier
                        .create_branch_subscription(branch_id, false)
                        .await?)
                }
                _ => unimplemented!(),
            },
            Self::FileGet => {
                if nuri.access.len() < 1 || nuri.object.is_none() {
                    return Err(NgError::InvalidArgument);
                }
                let (repo_id, _, store_repo) = Self::resolve_target(verifier, &nuri.target)?;
                let access = nuri.access.get(0).unwrap();
                if let NgAccessV0::Key(key) = access {
                    let repo = verifier.get_repo(&repo_id, &store_repo)?;
                    let obj_id = nuri.object.unwrap();
                    if let Some(mut stream) = verifier
                        .fetch_blocks_if_needed(&obj_id, &repo_id, &store_repo)
                        .await?
                    {
                        // TODO: start opening the file and running the sending_loop after we received 10 (3 mandatory and 7 depths max) blocks.
                        // for files below 10MB we wont see a difference, but for big files, we can start sending out some AppResponse earlier.
                        while let Some(block) = stream.next().await {
                            repo.store.put(&block)?;
                        }
                    }
                    let file =
                        RandomAccessFile::open(obj_id, key.clone(), Arc::clone(&repo.store))?;

                    let (mut tx, rx) = mpsc::unbounded::<AppResponse>();
                    tx.send(AppResponse::V0(AppResponseV0::FileMeta(FileMetaV0 {
                        content_type: file.meta().content_type().clone(),
                        size: file.meta().total_size(),
                    })))
                    .await
                    .map_err(|_| NgError::InternalError)?;

                    async fn sending_loop(
                        file: Arc<RandomAccessFile>,
                        mut tx: Sender<AppResponse>,
                    ) -> ResultSend<()> {
                        let mut pos = 0;
                        loop {
                            let res = file.read(pos, 1048564);

                            if res.is_err() {
                                //log_info!("ERR={:?}", res.unwrap_err());
                                let _ = tx
                                    .send(AppResponse::V0(AppResponseV0::FileBinary(vec![])))
                                    .await;
                                break;
                            }
                            let res = res.unwrap();
                            //log_info!("reading={} {}", pos, res.len());
                            pos += res.len();
                            if let Err(_) = tx
                                .send(AppResponse::V0(AppResponseV0::FileBinary(res)))
                                .await
                            {
                                break;
                            }
                        }
                        Ok(())
                    }

                    spawn_and_log_error(sending_loop(Arc::new(file), tx.clone()));
                    let fnonce = Box::new(move || {
                        tx.close_channel();
                    });
                    Ok((rx, fnonce))
                } else {
                    return Err(NgError::InvalidArgument);
                }
            }
            _ => unimplemented!(),
        }
    }

    fn resolve_target(
        verifier: &mut Verifier,
        target: &NuriTargetV0,
    ) -> Result<(RepoId, BranchId, StoreRepo), NgError> {
        match target {
            NuriTargetV0::PrivateStore => {
                let repo_id = verifier.config.private_store_id.unwrap();
                let (branch, store_repo) = {
                    let repo = verifier.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
                    let branch = repo.main_branch().ok_or(NgError::BranchNotFound)?;
                    (branch.id, repo.store.get_store_repo().clone())
                };
                Ok((repo_id, branch, store_repo))
            }
            _ => unimplemented!(),
        }
    }

    async fn open_for_target(
        verifier: &mut Verifier,
        target: &NuriTargetV0,
        as_publisher: bool,
    ) -> Result<(RepoId, BranchId, StoreRepo), NgError> {
        let (repo_id, branch, store_repo) = Self::resolve_target(verifier, target)?;
        verifier
            .open_branch(&repo_id, &branch, as_publisher)
            .await?;
        Ok((repo_id, branch, store_repo))
    }

    pub(crate) async fn process(
        &self,
        verifier: &mut Verifier,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
    ) -> Result<AppResponse, NgError> {
        match self {
            Self::FilePut => match payload {
                None => return Err(NgError::InvalidPayload),
                Some(AppRequestPayload::V0(v0)) => match v0 {
                    AppRequestPayloadV0::AddFile(add) => {
                        let (repo_id, branch, store_repo) =
                            Self::open_for_target(verifier, &nuri.target, true).await?;
                        //log_info!("GOT ADD FILE {:?}", add);
                        let repo = verifier.get_repo(&repo_id, &store_repo)?;
                        // check that the referenced object exists locally.
                        repo.store.has(&add.object.id)?;
                        // we send all the blocks to the broker.
                        let file = RandomAccessFile::open(
                            add.object.id.clone(),
                            add.object.key.clone(),
                            Arc::clone(&repo.store),
                        )?;
                        let blocks = file.get_all_blocks_ids()?;
                        let found = verifier.has_blocks(blocks, repo).await?;
                        for block_id in found.missing() {
                            let block = repo.store.get(block_id)?;
                            verifier.put_blocks(vec![block], repo).await?;
                        }

                        let add_file_commit_body = CommitBodyV0::AddFile(AddFile::V0(AddFileV0 {
                            name: add.filename,
                            metadata: vec![],
                        }));

                        verifier
                            .new_commit(
                                add_file_commit_body,
                                &repo_id,
                                &branch,
                                &store_repo,
                                &vec![],
                                vec![],
                                vec![add.object],
                            )
                            .await?;
                    }
                    AppRequestPayloadV0::SmallFilePut(small) => {}
                    AppRequestPayloadV0::RandomAccessFilePut(content_type) => {
                        let (repo_id, _, store_repo) =
                            Self::resolve_target(verifier, &nuri.target)?;
                        let repo = verifier.get_repo(&repo_id, &store_repo)?;
                        let id = verifier.start_upload(content_type, Arc::clone(&repo.store));
                        return Ok(AppResponse::V0(AppResponseV0::FileUploading(id)));
                    }
                    AppRequestPayloadV0::RandomAccessFilePutChunk((id, chunk)) => {
                        if chunk.len() > 0 {
                            verifier.continue_upload(id, &chunk)?;
                        } else {
                            let reference = verifier.finish_upload(id)?;
                            return Ok(AppResponse::V0(AppResponseV0::FileUploaded(reference)));
                        }
                    }
                    _ => return Err(NgError::InvalidPayload),
                },
            },

            _ => unimplemented!(),
        }
        Ok(AppResponse::V0(AppResponseV0::Ok))
    }
}
