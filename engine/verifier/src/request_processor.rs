// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
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
use ng_net::types::InboxPost;
use ng_net::types::NgQRCode;
use ng_net::types::NgQRCodeProfileSharingV0;
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};
use ng_oxigraph::oxrdf::{Literal, NamedNode, Quad, Term};
use ng_oxigraph::oxsdatatypes::DateTime;

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
        command: AppRequestCommandV0,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        match command {
            AppRequestCommandV0::OrmStart => match payload {
                Some(AppRequestPayload::V0(AppRequestPayloadV0::OrmStart((
                    shape_type,
                    graph_scope,
                    subject_scope,
                )))) => {
                    for nuri in graph_scope.iter() {
                        if nuri.is_valid_for_sparql_update() {
                            self.open_for_target(&nuri.target, true).await?;
                        }
                    }
                    self.start_orm(graph_scope, subject_scope, shape_type).await
                }
                _ => return Err(NgError::InvalidArgument),
            },
            AppRequestCommandV0::OrmStartDiscrete => {
                self.start_discrete_orm(nuri).await.map_err(|e| e.into())
            }
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
                Ok((rx, fnonce as CancelFn))
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

    pub(crate) async fn update_header(
        &mut self,
        target: &NuriTargetV0,
        title: Option<String>,
        about: Option<String>,
    ) -> Result<(), VerifierError> {
        let (repo_id, branch_id, store_repo) = self.resolve_header_branch(target)?;
        let graph_name = NuriV0::branch_repo_graph_name(
            &branch_id,
            &repo_id,
            &store_repo.overlay_id_for_storage_purpose(),
        );

        let base = NuriV0::repo_id(&repo_id);

        let mut deletes = String::new();
        let mut wheres = String::new();
        let mut inserts = String::new();
        if let Some(about) = about {
            deletes += &format!("<> <{NG_ONTOLOGY_ABOUT}> ?a. ");
            wheres += &format!("OPTIONAL {{ <> <{NG_ONTOLOGY_ABOUT}> ?a }} ");
            if about.len() > 0 {
                inserts += &format!(
                    "<> <{NG_ONTOLOGY_ABOUT}> \"{}\". ",
                    about.replace("\\", "\\\\").replace("\"", "\\\"")
                );
            }
        }
        if let Some(title) = title {
            deletes += &format!("<> <{NG_ONTOLOGY_TITLE}> ?n. ");
            wheres += &format!("OPTIONAL {{ <> <{NG_ONTOLOGY_TITLE}> ?n }} ");
            if title.len() > 0 {
                inserts += &format!(
                    "<> <{NG_ONTOLOGY_TITLE}> \"{}\". ",
                    title.replace("\\", "\\\\").replace("\"", "\\\"")
                );
            }
        }
        let query = format!("DELETE {{ {deletes} }} INSERT {{ {inserts} }} WHERE {{ {wheres} }}");

        let oxistore = self.graph_dataset.as_ref().unwrap();

        let update = ng_oxigraph::oxigraph::sparql::Update::parse(&query, Some(&base))
            .map_err(|e| NgError::InternalError)?;

        let res = oxistore.ng_update(update, Some(graph_name));
        match res {
            Err(e) => Err(VerifierError::InternalError),
            Ok((inserts, removes)) => {
                if inserts.is_empty() && removes.is_empty() {
                    Ok(())
                } else {
                    let _ = self
                        .prepare_sparql_update(
                            Vec::from_iter(inserts),
                            Vec::from_iter(removes),
                            self.get_peer_id_for_skolem(),
                            0,
                        )
                        .await?;
                    Ok(())
                }
            }
        }
    }

    fn resolve_header_branch(
        &self,
        target: &NuriTargetV0,
    ) -> Result<(RepoId, BranchId, StoreRepo), NgError> {
        Ok(match target {
            NuriTargetV0::Repo(repo_id) => {
                let (branch, store_repo) = {
                    let repo = self.repos.get(repo_id).ok_or(NgError::RepoNotFound)?;
                    let branch = repo.header_branch().ok_or(NgError::BranchNotFound)?;
                    (branch.id, repo.store.get_store_repo().clone())
                };
                (*repo_id, branch, store_repo)
            }
            _ => return Err(NgError::NotImplemented),
        })
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

    pub(crate) async fn open_for_target(
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

    pub(crate) async fn doc_create_with_store_repo(
        &mut self,
        crdt: String,
        class_name: String,
        destination: String,
        store_repo: Option<StoreRepo>,
    ) -> Result<String, NgError> {
        let class = BranchCrdt::from(crdt, class_name)?;

        let nuri = if store_repo.is_none() {
            NuriV0::new_private_store_target()
        } else {
            NuriV0::from_store_repo(&store_repo.unwrap())
        };

        let destination = DocCreateDestination::from(destination)?;

        self.doc_create(nuri, DocCreate { class, destination })
            .await
    }

    pub(crate) async fn sparql_query(
        &self,
        nuri: &NuriV0,
        sparql: String,
        base: Option<String>,
    ) -> Result<QueryResults, VerifierError> {
        //log_debug!("query={}", query);
        let store = self.graph_dataset.as_ref().unwrap();
        let mut parsed = Query::parse(&sparql, base.as_deref())
            .map_err(|e| VerifierError::SparqlError(e.to_string()))?;
        let dataset = parsed.dataset_mut();
        //log_debug!("DEFAULTS {:?}", dataset.default_graph_graphs());
        if dataset.has_no_default_dataset() {
            //log_info!("DEFAULT GRAPH AS UNION");
            dataset.set_default_graph_as_union();
        }
        store
            .query(parsed, self.resolve_target_for_sparql(&nuri.target, false)?)
            .map_err(|e| VerifierError::SparqlError(e.to_string()))
    }

    pub(crate) async fn doc_create(
        &mut self,
        nuri: NuriV0,
        doc_create: DocCreate,
    ) -> Result<String, NgError> {
        //TODO: deal with doc_create.destination

        let user_id = self.user_id().clone();
        let user_priv_key = self.user_privkey().clone();
        let primary_class = doc_create.class.class().clone();
        let (_, _, store) = self.resolve_target(&nuri.target)?;
        let repo_id = self
            .new_repo_default(&user_id, &user_priv_key, &store, doc_create.class)
            .await?;

        let header_branch_id = {
            let repo = self.get_repo(&repo_id, &store)?;
            repo.header_branch().ok_or(NgError::BranchNotFound)?.id
        };

        // adding an AddRepo commit to the Store branch of store.
        self.send_add_repo_to_store(&repo_id, &store).await?;

        // adding an ldp:contains triple to the store main branch
        let overlay_id = store.outer_overlay();
        let nuri = NuriV0::repo_id(&repo_id);
        let nuri_result = NuriV0::repo_graph_name(&repo_id, &overlay_id);
        let store_nuri = NuriV0::from_store_repo(&store);
        let store_nuri_string = NuriV0::repo_id(store.repo_id());
        let query = format!(
            "INSERT DATA {{ <{store_nuri_string}> <http://www.w3.org/ns/ldp#contains> <{nuri}>. }}"
        );

        let ret = self
            .process_sparql_update(&store_nuri, &query, &None, vec![], 0)
            .await;
        if let Err(e) = ret {
            return Err(NgError::SparqlError(e));
        }

        self.add_doc(&repo_id, &overlay_id)?;

        // adding the class triple to the header branch
        let header_branch_nuri = format!("{nuri_result}:b:{}", header_branch_id);
        let quad = Quad {
            subject: NamedNode::new_unchecked(&nuri).into(),
            predicate: NG_ONTOLOGY_CLASS_NAME.clone().into(),
            object: Literal::new_simple_literal(primary_class).into(),
            graph_name: NamedNode::new_unchecked(&header_branch_nuri).into(),
        };
        let ret = self
            .prepare_sparql_update(vec![quad], vec![], vec![], 0)
            .await;
        if let Err(e) = ret {
            return Err(NgError::SparqlError(e.to_string()));
        }
        Ok(nuri_result)
    }

    fn get_profile_for_inbox_post(&self, public: bool) -> Result<(StoreRepo, PrivKey), NgError> {
        let from_profile_id = if !public {
            self.config.protected_store_id.unwrap()
        } else {
            self.config.public_store_id.unwrap()
        };

        let repo = self
            .repos
            .get(&from_profile_id)
            .ok_or(NgError::RepoNotFound)?;
        let inbox = repo.inbox.to_owned().ok_or(NgError::InboxNotFound)?;
        let store_repo = repo.store.get_store_repo();

        Ok((store_repo.clone(), inbox.clone()))
    }

    async fn import_contact_from_qrcode(
        &mut self,
        repo_id: RepoId,
        contact: NgQRCodeProfileSharingV0,
    ) -> Result<(), VerifierError> {
        let inbox_nuri_string: String = NuriV0::inbox(&contact.inbox);
        let profile_nuri_string: String = NuriV0::from_store_repo_string(&contact.profile);
        let a_or_b = if contact.profile.is_public() {
            "site"
        } else {
            "protected"
        };

        // checking if this contact has already been added
        match self.sparql_query(
            &NuriV0::new_entire_user_site(),
            format!("ASK {{ ?s <did:ng:x:ng#{a_or_b}_inbox> <{inbox_nuri_string}> . ?s <did:ng:x:ng#{a_or_b}> <{profile_nuri_string}> }}"), None).await? 
        {
            QueryResults::Boolean(true) => {
                return Err(VerifierError::ContactAlreadyExists);
                }
            _ => {}
        }

        // getting the privkey of the inbox and ovelray because we will need it here below to send responses.
        let (from_profile, from_inbox) =
            self.get_profile_for_inbox_post(contact.profile.is_public())?;

        // get the name and optional email address of the profile we will respond with.
        // if we don't have a name, we fail
        let from_profile_nuri = NuriV0::repo_id(from_profile.repo_id());

        let (name,email) = match self.sparql_query(
            &NuriV0::from_store_repo(&from_profile),
            format!("PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
                            SELECT ?name ?email WHERE {{ <> vcard:fn ?name . <> vcard:hasEmail ?email }}"), Some(from_profile_nuri)).await? 
        {
            QueryResults::Solutions(mut sol) => {
                let mut name = None;
                let mut email = None;
                if let Some(Ok(s)) = sol.next() {
                    if let Some(Term::Literal(l)) = s.get("name") {
                        name = Some(l.value().to_string());
                    }
                    if let Some(Term::Literal(l)) = s.get("email") {
                        email = Some(l.value().to_string());
                    }
                }
                if name.is_none() {
                    return Err(VerifierError::InvalidProfile)
                }
                (name.unwrap(),email)
            }
            _ => return Err(VerifierError::InvalidResponse),
        };

        let contact_doc_nuri_string = NuriV0::repo_id(&repo_id);
        let contact_doc_nuri = NuriV0::new_repo_target_from_id(&repo_id);
        let has_email = contact.email.map_or("".to_string(), |email| {
            format!("<> vcard:hasEmail \"{email}\".")
        });

        let sparql_update = format!(
            " PREFIX ng: <did:ng:x:ng#>
            PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
            INSERT DATA {{  <> ng:{a_or_b} <{profile_nuri_string}>.
                            <> ng:{a_or_b}_inbox <{inbox_nuri_string}>.
                            <> a vcard:Individual .
                            <> vcard:fn \"{}\".
                            {has_email} }}",
            contact.name
        );
        let ret = self
            .process_sparql_update(
                &contact_doc_nuri,
                &sparql_update,
                &Some(contact_doc_nuri_string),
                vec![],
                0,
            )
            .await;
        if let Err(e) = ret {
            return Err(VerifierError::SparqlError(e));
        }

        self.update_header(&contact_doc_nuri.target, Some(contact.name), None)
            .await?;

        self.post_to_inbox(InboxPost::new_contact_details(
            from_profile,
            from_inbox,
            contact.profile.outer_overlay(),
            contact.inbox,
            None,
            false,
            name,
            email,
        )?)
        .await?;

        Ok(())
    }

    pub(crate) async fn search_for_contacts(
        &self,
        excluding_profile_id_nuri: Option<String>,
    ) -> Result<Vec<(String, String)>, VerifierError> {
        let extra_conditions = if let Some(s) = excluding_profile_id_nuri {
            format!(
                "&& NOT EXISTS {{ ?c ng:site <{s}> }} && NOT EXISTS {{ ?c ng:protected <{s}> }}"
            )
        } else {
            String::new()
        };
        let sparql = format!(
            "PREFIX ng: <did:ng:x:ng#>
            SELECT ?profile_id ?inbox_id WHERE 
                {{ ?c a <http://www.w3.org/2006/vcard/ns#Individual> .
                    OPTIONAL {{ ?c ng:site ?profile_id . ?c ng:site_inbox ?inbox_id }}
                    OPTIONAL {{ ?c ng:protected ?profile_id . ?c ng:protected_inbox ?inbox_id }}
                    FILTER ( bound(?profile_id) {extra_conditions} )
                }}"
        );
        //log_info!("{sparql}");
        let sols = match self
            .sparql_query(&NuriV0::new_entire_user_site(), sparql, None)
            .await?
        {
            QueryResults::Solutions(sols) => sols,
            _ => {
                return Err(VerifierError::SparqlError(
                    NgError::InvalidResponse.to_string(),
                ))
            }
        };

        let mut res = vec![];
        for sol in sols {
            match sol {
                Err(e) => return Err(VerifierError::SparqlError(e.to_string())),
                Ok(s) => {
                    if let Some(Term::NamedNode(profile_id)) = s.get("profile_id") {
                        let profile_nuri = profile_id.as_string();
                        if let Some(Term::NamedNode(inbox_id)) = s.get("inbox_id") {
                            let inbox_nuri = inbox_id.as_string();
                            res.push((profile_nuri.clone(), inbox_nuri.clone()));
                        }
                    }
                }
            }
        }
        Ok(res)
    }

    pub(crate) async fn process_discrete_transaction(
        &mut self,
        patch: DiscreteTransaction,
        nuri: &NuriV0,
        subscription_id: u64,
    ) -> Result<(), NgError> {
        let (repo_id, branch_id, store_repo) = self.resolve_target(&nuri.target)?;

        let transac = TransactionBody {
            body_type: TransactionBodyType::Discrete,
            graph: None,
            discrete: Some(patch.clone()),
        };

        let transaction_commit_body =
            CommitBodyV0::AsyncTransaction(Transaction::V0(serde_bare::to_vec(&transac)?));

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
            subscription_id,
        )
        .await?;

        Ok(())
    }

    pub(crate) async fn process(
        &mut self,
        command: &AppRequestCommandV0,
        nuri: NuriV0,
        payload: Option<AppRequestPayload>,
        session_id: u64,
    ) -> Result<AppResponse, NgError> {
        match command {
            AppRequestCommandV0::OrmUpdate => match payload {
                Some(AppRequestPayload::V0(AppRequestPayloadV0::OrmUpdate((
                    patches,
                    subscription_id,
                )))) => {
                    return match self.orm_frontend_update(subscription_id, patches).await {
                        Err(e) => Ok(AppResponse::error(e)),
                        Ok(()) => Ok(AppResponse::ok()),
                    }
                }
                _ => {
                    log_err!("orm update has wrong payload: {:?}", payload);
                    return Err(NgError::InvalidArgument);
                }
            },
            AppRequestCommandV0::OrmDiscreteUpdate => match payload {
                Some(AppRequestPayload::V0(AppRequestPayloadV0::OrmDiscreteUpdate((
                    patches,
                    subscription_id,
                )))) => {
                    return match self
                        .orm_frontend_discrete_update(subscription_id, patches)
                        .await
                    {
                        Err(e) => Ok(AppResponse::error(e)),
                        Ok(()) => Ok(AppResponse::ok()),
                    }
                }
                _ => {
                    log_err!("orm discrete update has wrong payload: {:?}", payload);
                    return Err(NgError::InvalidArgument);
                }
            },
            AppRequestCommandV0::SocialQueryStart => {
                let (from_profile, contacts_string, degree) =
                    if let Some(AppRequestPayload::V0(AppRequestPayloadV0::SocialQueryStart {
                        from_profile,
                        contacts,
                        degree,
                    })) = payload
                    {
                        (from_profile, contacts, degree)
                    } else {
                        return Err(NgError::InvalidPayload);
                    };

                let query_id = nuri.target.repo_id();

                // checking that the query hasn't been started yet
                match self
                    .sparql_query(
                        &NuriV0::new_repo_target_from_id(query_id),
                        format!("ASK {{ <> <did:ng:x:ng#social_query_forwarder> ?forwarder }}"),
                        Some(NuriV0::repo_id(query_id)),
                    )
                    .await?
                {
                    QueryResults::Boolean(true) => {
                        return Err(NgError::SocialQueryAlreadyStarted);
                    }
                    _ => {}
                }

                // return error if not connected
                if self.connected_broker.is_none() {
                    return Err(NgError::NotConnected);
                }

                // searching for contacts (all stores, one store, a sparql query, etc..)
                // (profile_nuri, inbox_nuri)
                let contacts = if contacts_string.as_str() == "did:ng:d:c" {
                    self.search_for_contacts(None).await?
                    // let mut res = vec![];
                    // res.push(("did:ng:a:rjoQTS4LMBDcuh8CEjmTYrgALeApBg2cgKqyPEuQDUgA".to_string(),"did:ng:d:KMFdOcGjdFBQgA9QNEDWcgEErQ1isbvDe7d_xndNOUMA".to_string()));
                    // res
                } else {
                    return Ok(AppResponse::error(NgError::NotImplemented.to_string()));
                };

                // if no contact found, return here with an AppResponse::error
                if contacts.is_empty() {
                    return Ok(AppResponse::error(NgError::ContactNotFound.to_string()));
                }

                //resolve from_profile
                let from_profile_id = match from_profile.target {
                    NuriTargetV0::ProtectedProfile => self.config.protected_store_id.unwrap(),
                    NuriTargetV0::PublicProfile => self.config.public_store_id.unwrap(),
                    _ => return Err(NgError::InvalidNuri),
                };
                let store = {
                    let repo = self
                        .repos
                        .get(&from_profile_id)
                        .ok_or(NgError::RepoNotFound)?;
                    repo.store.clone()
                };

                let definition_commit_body_ref = nuri.get_first_commit_ref()?;
                let block_ids =
                    Commit::collect_block_ids(definition_commit_body_ref.clone(), &store, true)?;
                let mut blocks = Vec::with_capacity(block_ids.len());
                //log_info!("blocks nbr {}",block_ids.len());
                for bid in block_ids.iter() {
                    blocks.push(store.get(bid)?);
                }

                // creating the ForwardedSocialQuery in the private store
                let forwarder = self
                    .doc_create_with_store_repo(
                        "Graph".to_string(),
                        "social:query:forwarded".to_string(),
                        "store".to_string(),
                        None, // meaning in private store
                    )
                    .await?;
                let forwarder_nuri = NuriV0::new_from_repo_graph(&forwarder)?;
                let forwarder_id = forwarder_nuri.target.repo_id().clone();
                let forwarder_nuri_string = NuriV0::repo_id(&forwarder_id);

                // adding triples in social_query doc : ng:social_query_forwarder
                let social_query_doc_nuri_string = NuriV0::repo_id(query_id);
                let sparql_update = format!("INSERT DATA {{ <{social_query_doc_nuri_string}> <did:ng:x:ng#social_query_forwarder> <{forwarder_nuri_string}>. }}");
                let ret = self
                    .process_sparql_update(&nuri, &sparql_update, &None, vec![], 0)
                    .await;
                if let Err(e) = ret {
                    return Err(NgError::SparqlError(e));
                }

                // adding triples in forwarder doc : ng:social_query_id and ng:social_query_started
                let sparql_update = format!("INSERT DATA {{ <> <did:ng:x:ng#social_query_id> <{social_query_doc_nuri_string}> .
                                                                    <> <did:ng:x:ng#social_query_started> \"{}\"^^<http://www.w3.org/2001/XMLSchema#dateTime> . }}",DateTime::now());
                let ret = self
                    .process_sparql_update(
                        &forwarder_nuri,
                        &sparql_update,
                        &Some(forwarder_nuri_string),
                        vec![],
                        0,
                    )
                    .await;
                if let Err(e) = ret {
                    log_err!("{sparql_update}");
                    return Err(NgError::SparqlError(e));
                }

                let from_profiles: ((StoreRepo, PrivKey), (StoreRepo, PrivKey)) =
                    self.get_2_profiles()?;

                for (to_profile_nuri, to_inbox_nuri) in contacts {
                    match self
                        .social_query_dispatch(
                            &to_profile_nuri,
                            &to_inbox_nuri,
                            &forwarder_nuri,
                            &forwarder_id,
                            &from_profiles,
                            query_id,
                            &definition_commit_body_ref,
                            &blocks,
                            degree,
                        )
                        .await
                    {
                        Ok(_) => {}
                        Err(e) => return Ok(AppResponse::error(e.to_string())),
                    }
                }

                return Ok(AppResponse::ok());

                // // FOR THE SAKE OF TESTING
                // let to_profile_nuri = NuriV0::public_profile(&from_profile_id);
                // let to_inbox_nuri: String = NuriV0::inbox(&from_inbox.to_pub());
                // let post = InboxPost::new_social_query_request(
                //     store.get_store_repo().clone(),
                //     from_inbox,
                //     forwarder_id,
                //     to_profile_nuri,
                //     to_inbox_nuri,
                //     None,
                //     *query_id,
                //     definition_commit_body_ref,
                //     blocks,
                //     degree,
                // )?;
                // return match self.client_request::<_,()>(post).await
                // {
                //     Err(e) => Ok(AppResponse::error(e.to_string())),
                //     Ok(SoS::Stream(_)) => Ok(AppResponse::error(NgError::InvalidResponse.to_string())),
                //     Ok(SoS::Single(_)) => Ok(AppResponse::ok()),
                // };
            }
            AppRequestCommandV0::QrCodeProfile => {
                let size =
                    if let Some(AppRequestPayload::V0(AppRequestPayloadV0::QrCodeProfile(size))) =
                        payload
                    {
                        size
                    } else {
                        return Err(NgError::InvalidPayload);
                    };
                let public = match nuri.target {
                    NuriTargetV0::PublicProfile => true,
                    NuriTargetV0::ProtectedProfile => false,
                    _ => return Err(NgError::InvalidPayload),
                };
                return match self.get_qrcode_for_profile(public, size).await {
                    Err(e) => Ok(AppResponse::error(e.to_string())),
                    Ok(qrcode) => Ok(AppResponse::text(qrcode)),
                };
            }
            AppRequestCommandV0::QrCodeProfileImport => {
                let profile = if let Some(AppRequestPayload::V0(
                    AppRequestPayloadV0::QrCodeProfileImport(text),
                )) = payload
                {
                    let ser = base64_url::decode(&text).map_err(|_| NgError::SerializationError)?;
                    let code: NgQRCode = serde_bare::from_slice(&ser)?;
                    let profile = match code {
                        NgQRCode::ProfileSharingV0(profile) => profile,
                        _ => return Err(NgError::InvalidPayload),
                    };
                    profile
                } else {
                    return Err(NgError::InvalidPayload);
                };
                let repo_id = match nuri.target {
                    NuriTargetV0::Repo(id) => id,
                    _ => return Err(NgError::InvalidPayload),
                };
                return match self.import_contact_from_qrcode(repo_id, profile).await {
                    Err(e) => Ok(AppResponse::error(e.to_string())),
                    Ok(()) => Ok(AppResponse::ok()),
                };
            }
            AppRequestCommandV0::Header => {
                if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Header(doc_header))) =
                    payload
                {
                    return match self
                        .update_header(&nuri.target, doc_header.title, doc_header.about)
                        .await
                    {
                        Ok(_) => Ok(AppResponse::ok()),
                        Err(e) => Ok(AppResponse::error(e.to_string())),
                    };
                } else {
                    return Err(NgError::InvalidPayload);
                }
            }
            AppRequestCommandV0::Create => {
                return if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Create(doc_create))) =
                    payload
                {
                    match self.doc_create(nuri, doc_create).await {
                        Err(NgError::SparqlError(e)) => Ok(AppResponse::error(e)),
                        Err(e) => Err(e),
                        Ok(nuri_result) => Ok(AppResponse::V0(AppResponseV0::Nuri(nuri_result))),
                    }
                } else {
                    Err(NgError::InvalidPayload)
                };
            }
            AppRequestCommandV0::Fetch(fetch) => match fetch {
                AppFetchContentV0::Header => {
                    let (repo_id, branch_id, store_repo) =
                        match self.resolve_header_branch(&nuri.target) {
                            Err(e) => return Ok(AppResponse::error(e.to_string())),
                            Ok(a) => a,
                        };
                    self.open_branch(&repo_id, &branch_id, true).await?;
                    let graph_name = NuriV0::branch_repo_graph_name(
                        &branch_id,
                        &repo_id,
                        &store_repo.overlay_id_for_storage_purpose(),
                    );
                    let base = NuriV0::repo_id(&repo_id);
                    let oxistore = self.graph_dataset.as_ref().unwrap();
                    let parsed = Query::parse(
                        &format!("SELECT ?class ?title ?about WHERE {{ OPTIONAL {{ <> <{NG_ONTOLOGY_CLASS}> ?class }} OPTIONAL {{ <> <{NG_ONTOLOGY_ABOUT}> ?about }} OPTIONAL {{ <> <{NG_ONTOLOGY_TITLE}> ?title }} }}"), Some(&base));
                    if parsed.is_err() {
                        return Ok(AppResponse::error(parsed.unwrap_err().to_string()));
                    }
                    let results = oxistore.query(parsed.unwrap(), Some(graph_name));
                    match results {
                        Err(e) => return Ok(AppResponse::error(e.to_string())),
                        Ok(QueryResults::Solutions(mut sol)) => {
                            let mut title = None;
                            let mut about = None;
                            let mut class = None;
                            if let Some(Ok(s)) = sol.next() {
                                if let Some(Term::Literal(l)) = s.get("title") {
                                    title = Some(l.value().to_string());
                                }
                                if let Some(Term::Literal(l)) = s.get("about") {
                                    about = Some(l.value().to_string());
                                }
                                if let Some(Term::Literal(l)) = s.get("class") {
                                    class = Some(l.value().to_string());
                                }
                            }
                            return Ok(AppResponse::V0(AppResponseV0::Header(AppHeader {
                                about,
                                title,
                                class,
                            })));
                        }
                        _ => return Err(NgError::InvalidResponse),
                    };
                }
                AppFetchContentV0::ReadQuery => {
                    if let Some(AppRequestPayload::V0(AppRequestPayloadV0::Query(DocQuery::V0 {
                        sparql,
                        base,
                    }))) = payload
                    {
                        let results = self.sparql_query(&nuri, sparql, base).await;
                        return Ok(match results {
                            Err(VerifierError::SparqlError(s)) => AppResponse::error(s),
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
                                    0,
                                )
                                .await
                            {
                                Err(e) => AppResponse::error(e),
                                Ok((commits, ..)) => AppResponse::commits(commits),
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
                            let patch: DiscreteTransaction = discrete.into();
                            return match self.process_discrete_transaction(patch, &nuri, 0).await {
                                Err(e) => Ok(AppResponse::error(e.to_string())),
                                Ok(_) => Ok(AppResponse::ok()),
                            };
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
                AppFetchContentV0::CurrentHeads => {
                    if nuri.target.is_repo_id() {
                        if let Ok(s) =
                            self.get_main_branch_current_heads_nuri(nuri.target.repo_id())
                        {
                            return Ok(AppResponse::V0(AppResponseV0::Text(s)));
                        }
                    }
                    return Ok(AppResponse::error(VerifierError::InvalidNuri.to_string()));
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

            _ => return Err(NgError::NotImplemented),
        }
        Ok(AppResponse::V0(AppResponseV0::Ok))
    }
}
