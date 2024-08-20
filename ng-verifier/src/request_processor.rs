// Copyright (c) 2022-2024 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Processor for each type of AppRequest

use std::collections::HashSet;
use std::sync::Arc;

use futures::channel::mpsc;
use futures::SinkExt;
use futures::StreamExt;
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};

use ng_repo::errors::*;
use ng_repo::file::{RandomAccessFile, ReadFile};
#[allow(unused_imports)]
use ng_repo::log::*;
use ng_repo::object::Object;
use ng_repo::repo::CommitInfo;
use ng_repo::store::Store;
use ng_repo::types::BranchId;
use ng_repo::types::StoreRepo;
use ng_repo::types::*;
use ng_repo::PublicKeySet;

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
                if nuri.objects.len() < 1 {
                    return Err(NgError::InvalidArgument);
                }
                let (repo_id, _, store_repo) = self.resolve_target(&nuri.target)?;
                let obj = nuri.objects.get(0).unwrap();
                let repo = self.get_repo(&repo_id, &store_repo)?;
                if let Some(mut stream) = self
                    .fetch_blocks_if_needed(&obj.id, &repo_id, &store_repo)
                    .await?
                {
                    // TODO: start opening the file and running the sending_loop after we received 10 (3 mandatory and 7 depths max) blocks.
                    // for files below 10MB we wont see a difference, but for big files, we can start sending out some AppResponse earlier.
                    while let Some(block) = stream.next().await {
                        repo.store.put(&block)?;
                    }
                }
                let file =
                    RandomAccessFile::open(obj.id, obj.key.clone(), Arc::clone(&repo.store))?;

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
                    //log_debug!("FileGet cancelled");
                    tx.close_channel();
                });
                Ok((rx, fnonce))
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

    async fn signed_snapshot_request(
        &mut self,
        target: &NuriTargetV0,
    ) -> Result<bool, VerifierError> {
        let (repo_id, branch_id, store_repo) = self.resolve_target(target)?; // TODO deal with targets that are commit heads
        let repo = self.get_repo(&repo_id, &store_repo)?;
        let branch = repo.branch(&branch_id)?;

        let snapshot_json = self.take_snapshot(&branch.crdt, &branch_id, target)?;
        //log_debug!("snapshot created {snapshot_json}");
        let snapshot_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Snapshot(snapshot_json.as_bytes().to_vec())),
            None,
            0,
            &repo.store,
        );

        let snap_obj_blocks = snapshot_object.save(&repo.store)?;

        if self.connected_broker.is_some() {
            let mut blocks = Vec::with_capacity(snap_obj_blocks.len());
            for block_id in snap_obj_blocks {
                blocks.push(repo.store.get(&block_id)?);
            }
            self.put_blocks(blocks, repo).await?;
        }

        let snapshot_commit_body = CommitBodyV0::Snapshot(Snapshot::V0(SnapshotV0 {
            heads: branch.current_heads.iter().map(|h| h.id).collect(),
            content: snapshot_object.reference().unwrap(), //TODO : content could be omitted as the ref is already in files
        }));

        let mut proto_events = Vec::with_capacity(2);

        let snapshot_commit = Commit::new_with_body_and_save(
            self.user_privkey(),
            self.user_id(),
            branch_id,
            QuorumType::Owners, // TODO: deal with PartialOrder (when the snapshot is not requested by owners)
            vec![],
            vec![],
            branch.current_heads.clone(),
            vec![],
            vec![snapshot_object.reference().unwrap()],
            vec![],
            vec![],
            CommitBody::V0(snapshot_commit_body),
            0,
            &repo.store,
        )?;

        let snapshot_commit_id = snapshot_commit.id().unwrap();
        let snapshot_commit_ref = snapshot_commit.reference().unwrap();

        let signature_content = SignatureContent::V0(SignatureContentV0 {
            commits: vec![snapshot_commit_id],
        });

        let signature_content_ser = serde_bare::to_vec(&signature_content).unwrap();
        let sig_share = repo
            .signer
            .as_ref()
            .unwrap()
            .sign_with_owner(&signature_content_ser)?;
        let sig = PublicKeySet::combine_signatures_with_threshold(0, [(0, &sig_share)])
            .map_err(|_| NgError::IncompleteSignature)?;
        let threshold_sig = ThresholdSignatureV0::Owners(sig);

        let signature = Signature::V0(SignatureV0 {
            content: signature_content,
            threshold_sig,
            certificate_ref: repo.certificate_ref.clone().unwrap(),
        });

        let signature_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Signature(signature)),
            None,
            0,
            &repo.store,
        );

        let sign_obj_blocks = signature_object.save(&repo.store)?;

        let signature_commit_body =
            CommitBodyV0::AsyncSignature(AsyncSignature::V0(signature_object.reference().unwrap()));

        let signature_commit = Commit::new_with_body_and_save(
            self.user_privkey(),
            self.user_id(),
            branch_id,
            QuorumType::IamTheSignature,
            vec![snapshot_commit_ref.clone()],
            vec![],
            vec![snapshot_commit_ref],
            vec![],
            vec![],
            vec![],
            vec![],
            CommitBody::V0(signature_commit_body),
            0,
            &repo.store,
        )?;

        let store = Arc::clone(&repo.store);
        self.verify_commit_(
            &snapshot_commit,
            &branch_id,
            &repo_id,
            Arc::clone(&store),
            true,
        )
        .await?;
        self.verify_commit_(&signature_commit, &branch_id, &repo_id, store, true)
            .await?;

        proto_events.push((snapshot_commit, vec![]));
        proto_events.push((signature_commit, sign_obj_blocks));
        self.new_events(proto_events, repo_id, &store_repo).await?;
        Ok(true)
    }

    fn find_signable_commits(
        heads: &[BlockRef],
        store: &Store,
    ) -> Result<HashSet<BlockRef>, VerifierError> {
        let mut res = HashSet::with_capacity(heads.len());
        for head in heads {
            let commit = Commit::load(head.clone(), store, true)?;
            let commit_type = commit.get_type().unwrap();
            res.extend(match commit_type {
                CommitType::SyncSignature => {
                    continue; // we shouldn't be signing asynchronously a SyncSignature
                }
                CommitType::AsyncSignature => {
                    Self::find_signable_commits(&commit.deps(), store)?.into_iter()
                }
                _ => HashSet::from([commit.reference().unwrap()]).into_iter(),
            });
        }
        Ok(res)
    }

    async fn signature_request(&mut self, target: &NuriTargetV0) -> Result<bool, VerifierError> {
        let (repo_id, branch_id, store_repo) = self.resolve_target(target)?; // TODO deal with targets that are commit heads
        let repo = self.get_repo(&repo_id, &store_repo)?;
        let branch = repo.branch(&branch_id)?;

        let commits = Vec::from_iter(
            Verifier::find_signable_commits(&branch.current_heads, &repo.store)?.into_iter(),
        );
        if commits.is_empty() {
            return Err(VerifierError::NothingToSign);
        }

        let signature_content = SignatureContent::V0(SignatureContentV0 {
            commits: commits.iter().map(|h| h.id).collect(),
        });

        let signature_content_ser = serde_bare::to_vec(&signature_content).unwrap();
        let sig_share = repo
            .signer
            .as_ref()
            .unwrap()
            .sign_with_owner(&signature_content_ser)?;
        let sig = PublicKeySet::combine_signatures_with_threshold(0, [(0, &sig_share)])
            .map_err(|_| NgError::IncompleteSignature)?;
        let threshold_sig = ThresholdSignatureV0::Owners(sig);

        let signature = Signature::V0(SignatureV0 {
            content: signature_content,
            threshold_sig,
            certificate_ref: repo.certificate_ref.clone().unwrap(),
        });

        let signature_object = Object::new(
            ObjectContent::V0(ObjectContentV0::Signature(signature)),
            None,
            0,
            &repo.store,
        );

        let sign_obj_blocks = signature_object.save(&repo.store)?;

        let signature_commit_body =
            CommitBodyV0::AsyncSignature(AsyncSignature::V0(signature_object.reference().unwrap()));

        let signature_commit = Commit::new_with_body_and_save(
            self.user_privkey(),
            self.user_id(),
            branch_id,
            QuorumType::IamTheSignature,
            commits,
            vec![],
            branch.current_heads.clone(),
            vec![],
            vec![],
            vec![],
            vec![],
            CommitBody::V0(signature_commit_body),
            0,
            &repo.store,
        )?;

        let store = Arc::clone(&repo.store);

        self.verify_commit_(&signature_commit, &branch_id, &repo_id, store, true)
            .await?;

        self.new_event(&signature_commit, &sign_obj_blocks, repo_id, &store_repo)
            .await?;

        Ok(true)
    }

    fn find_signed_past(
        commit: &Commit,
        store: &Store,
    ) -> Result<HashSet<ObjectRef>, VerifierError> {
        let commit_type = commit.get_type().unwrap();
        match commit_type {
            CommitType::SyncSignature => {
                let mut acks = commit.acks();
                if acks.len() != 1 {
                    return Err(VerifierError::MalformedSyncSignatureAcks);
                }
                let ack = &acks[0];
                let deps = commit.deps();
                if deps.len() != 1 {
                    return Err(VerifierError::MalformedSyncSignatureDeps);
                }
                let commits =
                    crate::commits::list_dep_chain_until(deps[0].clone(), &ack.id, &store, false)?;
                let mut res = HashSet::with_capacity(commits.len() + 1);
                res.extend(commits.into_iter().map(|c| c.reference().unwrap()));
                res.insert(acks.pop().unwrap());
                Ok(res)
            }
            CommitType::AsyncSignature => Ok(HashSet::from_iter(commit.deps().into_iter())),
            _ => Ok(HashSet::new()),
        }
    }

    fn signature_status(
        &self,
        target: &NuriTargetV0,
    ) -> Result<Vec<(ObjectId, Option<String>, bool)>, VerifierError> {
        let (repo_id, branch_id, store_repo) = self.resolve_target(target)?; // TODO deal with targets that are commit heads
        let repo = self.get_repo(&repo_id, &store_repo)?;
        let branch = repo.branch(&branch_id)?;
        let mut res = Vec::with_capacity(branch.current_heads.len());
        let is_unique_head = branch.current_heads.len() == 1;
        for head in branch.current_heads.iter() {
            let cobj = Commit::load(head.clone(), &repo.store, true)?;
            let commit_type = cobj.get_type().unwrap();
            let mut is_snapshot = false;
            let has_sig = match commit_type {
                CommitType::SyncSignature => true,
                CommitType::AsyncSignature => {
                    let mut past = cobj.acks();
                    if is_unique_head && past.len() == 1 {
                        // we check if the signed commit is a snapshot
                        let signed_commit = Commit::load(past.pop().unwrap(), &repo.store, true)?;
                        is_snapshot = match signed_commit.get_type().unwrap() {
                            CommitType::Snapshot => true,
                            _ => false,
                        };
                    }
                    true
                }
                _ => false,
            };
            let sig = if has_sig {
                Some(format!(
                    "{}:{}",
                    Verifier::find_signed_past(&cobj, &repo.store)?
                        .into_iter()
                        .map(|c| c.commit_nuri())
                        .collect::<Vec<String>>()
                        .join(":"),
                    NuriV0::signature_ref(&cobj.get_signature_reference().unwrap())
                ))
            } else {
                None
            };
            res.push((head.id, sig, is_snapshot));
        }
        Ok(res)
    }

    pub(crate) async fn process(
        &mut self,
        command: &AppRequestCommandV0,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
    ) -> Result<AppResponse, NgError> {
        match command {
            AppRequestCommandV0::Create => {
                if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Create(doc_create))) =
                    payload
                {
                    //TODO: deal with doc_create.destination

                    let user_id = self.user_id().clone();
                    let user_priv_key = self.user_privkey().clone();
                    let repo_id = self
                        .new_repo_default(
                            &user_id,
                            &user_priv_key,
                            &doc_create.store,
                            doc_create.class,
                        )
                        .await?;

                    // adding an AddRepo commit to the Store branch of store.
                    self.send_add_repo_to_store(&repo_id, &doc_create.store)
                        .await?;

                    // adding an ldp:contains triple to the store main branch
                    let overlay_id = doc_create.store.outer_overlay();
                    let nuri = NuriV0::repo_id(&repo_id);
                    let nuri_result = NuriV0::repo_graph_name(&repo_id, &overlay_id);
                    let store_nuri = NuriV0::from_store_repo(&doc_create.store);
                    let store_nuri_string = NuriV0::repo_id(doc_create.store.repo_id());
                    let query = format!("INSERT DATA {{ <{store_nuri_string}> <http://www.w3.org/ns/ldp#contains> <{nuri}>. }}");

                    let ret = self
                        .process_sparql_update(&store_nuri, &query, &None, vec![])
                        .await;
                    if let Err(e) = ret {
                        return Ok(AppResponse::error(e));
                    }

                    self.add_doc(&repo_id, &overlay_id)?;

                    return Ok(AppResponse::V0(AppResponseV0::Nuri(nuri_result)));
                } else {
                    return Err(NgError::InvalidPayload);
                }
            }
            AppRequestCommandV0::Fetch(fetch) => match fetch {
                AppFetchContentV0::ReadQuery => {
                    if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Query(DocQuery::V0 {
                        sparql,
                        base,
                    }))) = payload
                    {
                        //log_debug!("query={}", query);
                        let store = self.graph_dataset.as_ref().unwrap();
                        let parsed = Query::parse(&sparql, base.as_deref());
                        if parsed.is_err() {
                            return Ok(AppResponse::error(parsed.unwrap_err().to_string()));
                        }
                        let mut parsed = parsed.unwrap();
                        let dataset = parsed.dataset_mut();
                        //log_debug!("DEFAULTS {:?}", dataset.default_graph_graphs());
                        if dataset.has_no_default_dataset() {
                            //log_info!("DEFAULT GRAPH AS UNION");
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
                        DocQuery::V0 { sparql, base },
                    ))) = payload
                    {
                        Ok(
                            match self
                                .process_sparql_update(
                                    &nuri,
                                    &sparql,
                                    &base,
                                    self.get_peer_id_for_skolem(),
                                )
                                .await
                            {
                                Err(e) => AppResponse::error(e),
                                Ok(_) => AppResponse::ok(),
                            },
                        )
                    } else {
                        Err(NgError::InvalidPayload)
                    };
                }
                AppFetchContentV0::Update => {
                    if !nuri.is_valid_for_discrete_update() {
                        return Err(NgError::InvalidNuri);
                    }
                    return if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Update(update))) =
                        payload
                    {
                        //TODO: deal with update.graph
                        //TODO: verify that update.heads are the same as what the Verifier knows
                        if let Some(discrete) = update.discrete {
                            let (repo_id, branch_id, store_repo) =
                                match self.resolve_target(&nuri.target) {
                                    Err(e) => return Ok(AppResponse::error(e.to_string())),
                                    Ok(a) => a,
                                };

                            let patch: DiscreteTransaction = discrete.into();

                            let transac = TransactionBody {
                                body_type: TransactionBodyType::Discrete,
                                graph: None,
                                discrete: Some(patch.clone()),
                            };

                            let transaction_commit_body = CommitBodyV0::AsyncTransaction(
                                Transaction::V0(serde_bare::to_vec(&transac)?),
                            );

                            let commit = self
                                .new_transaction_commit(
                                    transaction_commit_body,
                                    &repo_id,
                                    &branch_id,
                                    &store_repo,
                                    vec![], //TODO deps
                                    vec![],
                                )
                                .await?;

                            let repo = self.get_repo(&repo_id, &store_repo)?;
                            let commit_info: CommitInfoJs = (&commit.as_info(repo)).into();

                            let crdt: &BranchCrdt = &repo.branch(&branch_id)?.crdt.clone();
                            self.update_discrete(
                                patch,
                                &crdt,
                                &branch_id,
                                commit.id().unwrap(),
                                commit_info,
                            )
                            .await?;
                        }

                        Ok(AppResponse::ok())
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
                AppFetchContentV0::SignatureStatus => {
                    if !nuri.is_valid_for_sparql_update() {
                        return Err(NgError::InvalidNuri);
                    }
                    return Ok(match self.signature_status(&nuri.target) {
                        Err(e) => AppResponse::error(e.to_string()),
                        Ok(status) => AppResponse::V0(AppResponseV0::SignatureStatus(
                            status
                                .into_iter()
                                .map(|(commitid, signature, is_snapshot)| {
                                    (commitid.to_string(), signature, is_snapshot)
                                })
                                .collect(),
                        )),
                    });
                }
                AppFetchContentV0::SignedSnapshotRequest => {
                    if !nuri.is_valid_for_sparql_update() {
                        return Err(NgError::InvalidNuri);
                    }
                    return Ok(match self.signed_snapshot_request(&nuri.target).await {
                        Err(e) => AppResponse::error(e.to_string()),
                        Ok(immediate) => {
                            if immediate {
                                AppResponse::V0(AppResponseV0::True)
                            } else {
                                AppResponse::V0(AppResponseV0::False)
                            }
                        }
                    });
                }
                AppFetchContentV0::SignatureRequest => {
                    if !nuri.is_valid_for_sparql_update() {
                        return Err(NgError::InvalidNuri);
                    }
                    return Ok(match self.signature_request(&nuri.target).await {
                        Err(e) => AppResponse::error(e.to_string()),
                        Ok(immediate) => {
                            if immediate {
                                AppResponse::V0(AppResponseV0::True)
                            } else {
                                AppResponse::V0(AppResponseV0::False)
                            }
                        }
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
