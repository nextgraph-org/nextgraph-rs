// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Processor for each type of AppRequest

use std::sync::Arc;

use futures::channel::mpsc;
use futures::SinkExt;
use futures::StreamExt;
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};

use ng_repo::errors::*;
use ng_repo::file::{RandomAccessFile, ReadFile};
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::repo::CommitInfo;
use ng_repo::types::BranchId;
use ng_repo::types::StoreRepo;
use ng_repo::types::*;

use ng_net::app_protocol::*;
use ng_net::utils::ResultSend;
use ng_net::utils::{spawn_and_log_error, Receiver, Sender};

use crate::types::*;
use crate::verifier::*;

impl Verifier {
    pub(crate) async fn process_stream(
        &mut self,
        command: &AppRequestCommandV0,
        nuri: &NuriV0,
        _payload: &Option<AppRequestPayload>,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        match command {
            AppRequestCommandV0::Fetch(fetch) => match fetch {
                AppFetchContentV0::Subscribe => {
                    let (repo_id, branch_id, store_repo) =
                        self.open_for_target(&nuri.target, false).await?;
                    Ok(self
                        .create_branch_subscription(repo_id, branch_id, store_repo)
                        .await?)
                }
                _ => unimplemented!(),
            },
            AppRequestCommandV0::FileGet => {
                if nuri.access.len() < 1 || nuri.object.is_none() {
                    return Err(NgError::InvalidArgument);
                }
                let (repo_id, _, store_repo) = self.resolve_target(&nuri.target)?;
                let access = nuri.access.get(0).unwrap();
                if let NgAccessV0::Key(key) = access {
                    let repo = self.get_repo(&repo_id, &store_repo)?;
                    let obj_id = nuri.object.unwrap();
                    if let Some(mut stream) = self
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
                                let _ = tx.send(AppResponse::V0(AppResponseV0::EndOfStream)).await;
                                tx.close_channel();
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
                        log_debug!("FileGet cancelled");
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
        &self,
        target: &NuriTargetV0,
    ) -> Result<(RepoId, BranchId, StoreRepo), NgError> {
        match target {
            NuriTargetV0::PrivateStore => {
                let repo_id = self.config.private_store_id.unwrap();
                let (branch, store_repo) = {
                    let repo = self.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
                    let branch = repo.main_branch().ok_or(NgError::BranchNotFound)?;
                    (branch.id, repo.store.get_store_repo().clone())
                };
                Ok((repo_id, branch, store_repo))
            }
            NuriTargetV0::Repo(repo_id) => {
                let (branch, store_repo) = {
                    let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
                    let branch = repo.main_branch().ok_or(NgError::BranchNotFound)?;
                    (branch.id, repo.store.get_store_repo().clone())
                };
                Ok((*repo_id, branch, store_repo))
            }
            _ => unimplemented!(),
        }
    }

    pub(crate) fn resolve_target_for_sparql(
        &self,
        target: &NuriTargetV0,
        update: bool,
    ) -> Result<Option<String>, NgError> {
        match target {
            NuriTargetV0::PrivateStore => {
                let repo_id = self.config.private_store_id.unwrap();
                let repo = self.repos.get(&repo_id).ok_or(NgError::RepoNotFound)?;
                let overlay_id = repo.store.overlay_id;
                Ok(Some(NuriV0::repo_graph_name(&repo_id, &overlay_id)))
            }
            NuriTargetV0::Repo(repo_id) => {
                let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
                Ok(Some(NuriV0::repo_graph_name(
                    &repo_id,
                    &repo.store.overlay_id,
                )))
            }
            NuriTargetV0::UserSite | NuriTargetV0::None => {
                if update {
                    return Err(NgError::InvalidTarget);
                } else {
                    //log_info!("QUERYING UNION GRAPH");
                    return Ok(None);
                }
            }
            _ => unimplemented!(),
        }
    }

    async fn open_for_target(
        &mut self,
        target: &NuriTargetV0,
        as_publisher: bool,
    ) -> Result<(RepoId, BranchId, StoreRepo), NgError> {
        let (repo_id, branch, store_repo) = self.resolve_target(target)?;
        self.open_branch(&repo_id, &branch, as_publisher).await?;
        Ok((repo_id, branch, store_repo))
    }

    pub fn handle_query_results(results: QueryResults) -> Result<AppResponse, String> {
        Ok(match results {
            QueryResults::Solutions(solutions) => {
                let serializer = QueryResultsSerializer::from_format(QueryResultsFormat::Json);

                let mut solutions_writer = serializer
                    .serialize_solutions_to_write(Vec::new(), solutions.variables().to_vec())
                    .map_err(|_| "QueryResult serializer error")?;
                for solution in solutions {
                    solutions_writer
                        .write(&solution.map_err(|e| e.to_string())?)
                        .map_err(|_| "QueryResult serializer error")?;
                }
                AppResponse::V0(AppResponseV0::QueryResult(
                    solutions_writer
                        .finish()
                        .map_err(|_| "QueryResult serializer error")?,
                ))
            }
            QueryResults::Boolean(b) => {
                if b {
                    AppResponse::V0(AppResponseV0::True)
                } else {
                    AppResponse::V0(AppResponseV0::False)
                }
            }
            QueryResults::Graph(quads) => {
                let mut results = vec![];
                for quad in quads {
                    match quad {
                        Err(e) => return Ok(AppResponse::error(e.to_string())),
                        Ok(triple) => results.push(triple),
                    }
                }
                AppResponse::V0(AppResponseV0::Graph(serde_bare::to_vec(&results).unwrap()))
            }
        })
    }

    fn history_for_nuri(
        &self,
        target: &NuriTargetV0,
    ) -> Result<(Vec<(ObjectId, CommitInfo)>, Vec<Option<ObjectId>>), VerifierError> {
        let (repo_id, branch_id, store_repo) = self.resolve_target(target)?; // TODO deal with targets that are commit heads
        let repo = self.get_repo(&repo_id, &store_repo)?;
        let branch = repo.branch(&branch_id)?;
        repo.history_at_heads(&branch.current_heads)
    }

    pub(crate) async fn process(
        &mut self,
        command: &AppRequestCommandV0,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
    ) -> Result<AppResponse, NgError> {
        match command {
            AppRequestCommandV0::Fetch(fetch) => match fetch {
                AppFetchContentV0::ReadQuery => {
                    if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Query(DocQuery::V0(
                        query,
                    )))) = payload
                    {
                        //log_debug!("query={}", query);
                        let store = self.graph_dataset.as_ref().unwrap();
                        let parsed = Query::parse(&query, None);
                        if parsed.is_err() {
                            return Ok(AppResponse::error(parsed.unwrap_err().to_string()));
                        }
                        let mut parsed = parsed.unwrap();
                        let dataset = parsed.dataset_mut();
                        if dataset.has_no_default_dataset() {
                            dataset.set_default_graph_as_union();
                        }
                        let results = store
                            .query(parsed, self.resolve_target_for_sparql(&nuri.target, false)?);
                        return Ok(match results {
                            Err(e) => AppResponse::error(e.to_string()),
                            Ok(qr) => {
                                let res = Self::handle_query_results(qr);
                                match res {
                                    Ok(ok) => ok,
                                    Err(s) => AppResponse::error(s),
                                }
                            }
                        });
                    } else {
                        return Err(NgError::InvalidPayload);
                    }
                }
                AppFetchContentV0::WriteQuery => {
                    if !nuri.is_valid_for_sparql_update() {
                        return Err(NgError::InvalidNuri);
                    }
                    return if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Query(
                        DocQuery::V0(query),
                    ))) = payload
                    {
                        Ok(match self.process_sparql_update(&nuri, &query).await {
                            Err(e) => AppResponse::error(e),
                            Ok(_) => AppResponse::ok(),
                        })
                    } else {
                        Err(NgError::InvalidPayload)
                    };
                }
                AppFetchContentV0::RdfDump => {
                    let store = self.graph_dataset.as_ref().unwrap();

                    let results = store.iter();

                    let vec: Vec<String> = results
                        .map(|q| match q {
                            Ok(o) => o.to_string(),
                            Err(e) => e.to_string(),
                        })
                        .collect();

                    return Ok(AppResponse::V0(AppResponseV0::Text(vec.join("\n"))));
                }
                AppFetchContentV0::History => {
                    if !nuri.is_valid_for_sparql_update() {
                        return Err(NgError::InvalidNuri);
                    }

                    return Ok(match self.history_for_nuri(&nuri.target) {
                        Err(e) => AppResponse::error(e.to_string()),
                        Ok(history) => AppResponse::V0(AppResponseV0::History(AppHistory {
                            history: history.0,
                            swimlane_state: history.1,
                        })),
                    });
                }
                _ => unimplemented!(),
            },
            AppRequestCommandV0::FilePut => match payload {
                None => return Err(NgError::InvalidPayload),
                Some(AppRequestPayload::V0(v0)) => match v0 {
                    AppRequestPayloadV0::AddFile(add) => {
                        let (repo_id, branch, store_repo) =
                            self.open_for_target(&nuri.target, true).await?;
                        //log_info!("GOT ADD FILE {:?}", add);

                        if self.connected_broker.is_some() {
                            self.put_all_blocks_of_file(&add.object, &repo_id, &store_repo)
                                .await?;
                        }

                        let add_file_commit_body = CommitBodyV0::AddFile(AddFile::V0(AddFileV0 {
                            name: add.filename,
                            metadata: vec![],
                        }));

                        self.new_commit(
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
                    AppRequestPayloadV0::SmallFilePut(_small) => {
                        unimplemented!();
                    }
                    AppRequestPayloadV0::RandomAccessFilePut(content_type) => {
                        let (repo_id, _, store_repo) = self.resolve_target(&nuri.target)?;
                        let repo = self.get_repo(&repo_id, &store_repo)?;
                        let id = self.start_upload(content_type, Arc::clone(&repo.store));
                        return Ok(AppResponse::V0(AppResponseV0::FileUploading(id)));
                    }
                    AppRequestPayloadV0::RandomAccessFilePutChunk((id, chunk)) => {
                        if chunk.len() > 0 {
                            self.continue_upload(id, &chunk)?;
                        } else {
                            let reference = self.finish_upload(id)?;
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
