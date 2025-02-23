// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Verifiers for AsyncTransaction Commit

use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use ng_oxigraph::oxigraph::storage_ng::numeric_encoder::{EncodedQuad, EncodedTerm};
use ng_oxigraph::oxigraph::storage_ng::*;
use ng_repo::repo::Repo;
use serde::{Deserialize, Serialize};
use yrs::updates::decoder::Decode;
use yrs::{ReadTxn, StateVector, Transact, Update};

use ng_net::app_protocol::*;
use ng_oxigraph::oxrdf::{
    BlankNode, GraphName, GraphNameRef, NamedNode, Quad, Subject, Term, Triple, TripleRef,
};
use ng_repo::errors::VerifierError;
use ng_repo::log::*;
use ng_repo::store::Store;
use ng_repo::types::*;

use crate::types::*;
use crate::verifier::Verifier;

struct BranchUpdateInfo {
    branch_id: BranchId,
    branch_type: BranchType,
    repo_id: RepoId,
    topic_id: TopicId,
    token: Digest,
    overlay_id: OverlayId,
    previous_heads: HashSet<ObjectId>,
    commit_id: ObjectId,
    transaction: GraphTransaction,
    commit_info: CommitInfoJs,
}

impl Verifier {
    pub(crate) fn add_doc(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
    ) -> Result<(), VerifierError> {
        self.doc_in_store(repo_id, overlay_id, false)
    }

    pub(crate) fn remove_doc(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
    ) -> Result<(), VerifierError> {
        self.doc_in_store(repo_id, overlay_id, true)
    }

    fn doc_in_store(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
        remove: bool,
    ) -> Result<(), VerifierError> {
        let ov_graphname = NamedNode::new_unchecked(NuriV0::repo_graph_name(repo_id, overlay_id));

        let overlay_encoded = numeric_encoder::StrHash::new(&NuriV0::overlay_id(overlay_id));

        self.graph_dataset
            .as_ref()
            .unwrap()
            .ng_transaction(
                move |mut transaction| -> Result<(), ng_oxigraph::oxigraph::store::StorageError> {
                    transaction.doc_in_store(ov_graphname.as_ref(), &overlay_encoded, remove)
                },
            )
            .map_err(|e| VerifierError::OxigraphError(e.to_string()))
    }

    pub(crate) fn add_named_commit(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
        name: String,
        commit_id: ObjectId,
    ) -> Result<(), VerifierError> {
        self.named_commit_or_branch(
            repo_id,
            overlay_id,
            name,
            false,
            Some(format!("{commit_id}")),
        )
    }

    pub(crate) fn add_named_branch(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
        name: String,
        branch_id: BranchId,
    ) -> Result<(), VerifierError> {
        self.named_commit_or_branch(
            repo_id,
            overlay_id,
            name,
            true,
            Some(format!("{branch_id}")),
        )
    }

    pub(crate) fn remove_named(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
        name: String,
    ) -> Result<(), VerifierError> {
        self.named_commit_or_branch(repo_id, overlay_id, name, false, None)
    }

    fn named_commit_or_branch(
        &self,
        repo_id: &RepoId,
        overlay_id: &OverlayId,
        name: String,
        is_branch: bool,
        base64_id: Option<String>,
    ) -> Result<(), VerifierError> {
        let ov_graphname = NamedNode::new_unchecked(NuriV0::repo_graph_name(repo_id, overlay_id));

        let value = if base64_id.is_none() {
            None
        } else {
            if is_branch {
                let overlay_encoded =
                    numeric_encoder::StrHash::new(&NuriV0::overlay_id(overlay_id));
                let branch_encoded = numeric_encoder::StrHash::new(&NuriV0::branch_id_from_base64(
                    base64_id.as_ref().unwrap(),
                ));
                let mut buffer = Vec::with_capacity(33);
                buffer.push(BRANCH_PREFIX);
                buffer.extend_from_slice(&branch_encoded.to_be_bytes());
                buffer.extend_from_slice(&overlay_encoded.to_be_bytes());
                Some(buffer)
            } else {
                let commit_name =
                    NuriV0::commit_graph_name_from_base64(base64_id.as_ref().unwrap(), overlay_id);
                let commit_encoded = numeric_encoder::StrHash::new(&commit_name);
                let mut buffer = Vec::with_capacity(17);
                buffer.push(COMMIT_PREFIX);
                buffer.extend_from_slice(&commit_encoded.to_be_bytes());
                Some(buffer)
            }
        };

        self.graph_dataset
            .as_ref()
            .unwrap()
            .ng_transaction(
                move |mut transaction: ng_oxigraph::oxigraph::store::Transaction<'_>| -> Result<(), ng_oxigraph::oxigraph::store::StorageError> {
                    transaction.named_commit_or_branch(ov_graphname.as_ref(), &name, &value)
                },
            )
            .map_err(|e| VerifierError::OxigraphError(e.to_string()))
    }

    pub(crate) async fn update_discrete(
        &mut self,
        patch: DiscreteTransaction,
        crdt: &BranchCrdt,
        branch_id: &BranchId,
        commit_id: ObjectId,
        commit_info: CommitInfoJs,
    ) -> Result<(), VerifierError> {
        let new_state = if let Ok(state) = self
            .user_storage
            .as_ref()
            .unwrap()
            .branch_get_discrete_state(branch_id)
        {
            match crdt {
                BranchCrdt::Automerge(_) => {
                    let mut doc = automerge::Automerge::load(&state)
                        .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    let _ = doc
                        .load_incremental(patch.as_slice())
                        .map_err(|e| VerifierError::AutomergeError(e.to_string()))?;
                    doc.save()
                }
                BranchCrdt::YArray(_)
                | BranchCrdt::YMap(_)
                | BranchCrdt::YText(_)
                | BranchCrdt::YXml(_) => {
                    let doc = yrs::Doc::new();
                    {
                        let mut txn = doc.transact_mut();
                        let update = yrs::Update::decode_v1(&state)
                            .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                        txn.apply_update(update);
                        let update = yrs::Update::decode_v1(patch.as_slice())
                            .map_err(|e| VerifierError::YrsError(e.to_string()))?;
                        txn.apply_update(update);
                        txn.commit();
                    }
                    let empty_state_vector = yrs::StateVector::default();
                    let transac = doc.transact();
                    transac.encode_state_as_update_v1(&empty_state_vector)
                }
                _ => return Err(VerifierError::InvalidBranch),
            }
        } else {
            patch.to_vec()
        };
        self.user_storage
            .as_ref()
            .unwrap()
            .branch_set_discrete_state(*branch_id, new_state)?;

        let patch = match (crdt, patch) {
            (BranchCrdt::Automerge(_), DiscreteTransaction::Automerge(v)) => {
                DiscretePatch::Automerge(v)
            }
            (BranchCrdt::YArray(_), DiscreteTransaction::YArray(v)) => DiscretePatch::YArray(v),
            (BranchCrdt::YMap(_), DiscreteTransaction::YMap(v)) => DiscretePatch::YMap(v),
            (BranchCrdt::YText(_), DiscreteTransaction::YText(v)) => DiscretePatch::YText(v),
            (BranchCrdt::YXml(_), DiscreteTransaction::YXml(v)) => DiscretePatch::YXml(v),
            _ => {
                //log_debug!("{:?} {:?}", crdt, patch);
                return Err(VerifierError::InvalidCommit);
            }
        };
        self.push_app_response(
            branch_id,
            AppResponse::V0(AppResponseV0::Patch(AppPatch {
                commit_id: commit_id.to_string(),
                commit_info: commit_info,
                graph: None,
                discrete: Some(patch),
                other: None,
            })),
        )
        .await;
        Ok(())
    }

    pub(crate) async fn verify_async_transaction(
        &mut self,
        transaction: &Transaction,
        commit: &Commit,
        branch_id: &BranchId,
        repo_id: &RepoId,
        store: Arc<Store>,
    ) -> Result<(), VerifierError> {
        let Transaction::V0(v0) = transaction;
        let mut body: TransactionBody = serde_bare::from_slice(&v0)?;

        let repo = self.get_repo(repo_id, store.get_store_repo())?;

        let branch = repo.branch(branch_id)?;
        let commit_id = commit.id().unwrap();
        let commit_info: CommitInfoJs = (&commit.as_info(repo)).into();

        if body.graph.is_some() {
            let mut transaction = body.graph.take().unwrap();
            transaction.tokenize_with_commit_id(commit_id, repo_id);
            let info = BranchUpdateInfo {
                branch_id: *branch_id,
                branch_type: branch.branch_type.clone(),
                repo_id: *repo_id,
                topic_id: branch.topic.clone().unwrap(),
                token: branch.read_cap.as_ref().unwrap().tokenize(),
                overlay_id: store.overlay_id,
                previous_heads: commit.direct_causal_past_ids(),
                commit_id,
                transaction,
                commit_info,
            };
            self.update_graph(vec![info]).await?;
        } else
        //TODO: change the logic here. transaction commits can have both a discrete and graph update. Only one AppResponse should be sent in this case, containing both updates.
        if body.discrete.is_some() {
            let patch = body.discrete.unwrap();
            let crdt = &repo.branch(branch_id)?.crdt.clone();
            self.update_discrete(patch, &crdt, branch_id, commit_id, commit_info)
                .await?;
        }

        Ok(())
    }

    // pub(crate) fn find_branch_and_repo_for_nuri(
    //     &self,
    //     nuri: &NuriV0,
    // ) -> Result<(RepoId, BranchId, StoreRepo), VerifierError> {
    //     if !nuri.is_branch_identifier() {
    //         return Err(VerifierError::InvalidNuri);
    //     }
    //     let store = self.get_store_by_overlay_id(&OverlayId::Outer(
    //         nuri.overlay.as_ref().unwrap().outer().to_slice(),
    //     ))?;
    //     let repo = self.get_repo(nuri.target.repo_id(), store.get_store_repo())?;
    //     Ok((
    //         match nuri.branch {
    //             None => {
    //                 let b = repo.main_branch().ok_or(VerifierError::BranchNotFound)?;
    //                 if b.topic_priv_key.is_none() {
    //                     return Err(VerifierError::PermissionDenied);
    //                 }
    //                 b.id
    //             }
    //             Some(TargetBranchV0::BranchId(id)) => {
    //                 let b = repo.branch(&id)?;
    //                 //TODO: deal with named branch that is also the main branch
    //                 if b.topic_priv_key.is_none() {
    //                     return Err(VerifierError::PermissionDenied);
    //                 }
    //                 id
    //             }
    //             // TODO: implement TargetBranchV0::Named
    //             _ => unimplemented!(),
    //         },
    //         repo.id,
    //         store.get_store_repo().clone(),
    //     ))
    // }

    fn find_branch_and_repo_for_quad(
        &self,
        quad: &Quad,
        branches: &mut HashMap<
            BranchId,
            (StoreRepo, RepoId, BranchType, TopicId, Digest, OverlayId),
        >,
        nuri_branches: &mut HashMap<String, (RepoId, BranchId, bool)>,
    ) -> Result<(RepoId, BranchId, bool), VerifierError> {
        match &quad.graph_name {
            GraphName::NamedNode(named_node) => {
                let graph_name = named_node.as_string();
                //log_debug!("graph_name {graph_name}");
                if let Some(branch_found) = nuri_branches.get(graph_name) {
                    return Ok(branch_found.clone());
                }
                let nuri = NuriV0::new_from(graph_name)?;
                if !nuri.is_branch_identifier() {
                    return Err(VerifierError::InvalidNamedGraph);
                }
                let store = self.get_store_by_overlay_id(&OverlayId::Outer(
                    nuri.overlay.unwrap().outer().to_slice(),
                ))?;
                let repo = self.get_repo(nuri.target.repo_id(), store.get_store_repo())?;
                let (branch_id, is_publisher, branch_type, topic_id, token) = match nuri.branch {
                    None => {
                        let b = repo.main_branch().ok_or(VerifierError::BranchNotFound)?;
                        (
                            b.id,
                            b.topic_priv_key.is_some(),
                            b.branch_type.clone(),
                            b.topic.clone().unwrap(),
                            b.read_cap.as_ref().unwrap().tokenize(),
                        )
                    }
                    Some(TargetBranchV0::BranchId(id)) => {
                        let b = repo.branch(&id)?;
                        //TODO: deal with named branch that is also the main branch
                        (
                            id,
                            b.topic_priv_key.is_some(),
                            b.branch_type.clone(),
                            b.topic.clone().unwrap(),
                            b.read_cap.as_ref().unwrap().tokenize(),
                        )
                    }
                    // TODO: implement TargetBranchV0::Named
                    _ => unimplemented!(),
                };
                let _ = branches.entry(branch_id).or_insert((
                    store.get_store_repo().clone(),
                    repo.id,
                    branch_type,
                    topic_id,
                    token,
                    store.overlay_id,
                ));
                let _ = nuri_branches.entry(graph_name.clone()).or_insert((
                    repo.id,
                    branch_id,
                    is_publisher,
                ));
                Ok((repo.id, branch_id, is_publisher))
            }
            _ => Err(VerifierError::InvalidNamedGraph),
        }
    }

    pub(crate) async fn prepare_sparql_update(
        &mut self,
        inserts: Vec<Quad>,
        removes: Vec<Quad>,
        peer_id: Vec<u8>,
    ) -> Result<(), VerifierError> {
        // options when not a publisher on the repo:
        // - skip
        // - TODO: abort (the whole transaction)
        // - TODO: inbox (sent to inbox of document for a suggested update)
        // for now we just do skip, without giving option to user
        let mut inserts_map: HashMap<BranchId, HashSet<Triple>> = HashMap::with_capacity(1);
        let mut removes_map: HashMap<BranchId, HashSet<Triple>> = HashMap::with_capacity(1);
        let mut branches: HashMap<
            BranchId,
            (StoreRepo, RepoId, BranchType, TopicId, Digest, OverlayId),
        > = HashMap::with_capacity(1);
        let mut nuri_branches: HashMap<String, (RepoId, BranchId, bool)> =
            HashMap::with_capacity(1);
        let mut inserts_len = inserts.len();
        let mut removes_len = removes.len();
        for mut insert in inserts {
            let (repo_id, branch_id, is_publisher) =
                self.find_branch_and_repo_for_quad(&insert, &mut branches, &mut nuri_branches)?;
            if !is_publisher {
                continue;
            }
            let set = inserts_map.entry(branch_id).or_insert_with(|| {
                let set = HashSet::with_capacity(inserts_len);
                inserts_len = 1;
                set
            });

            // changing blank node to skolemized node

            //log_debug!("INSERTING BN {}", quad);
            if insert.subject.is_blank_node() {
                //log_debug!("INSERTING SUBJECT BN {}", insert.subject);
                if let Subject::BlankNode(b) = &insert.subject {
                    let iri =
                        NuriV0::repo_skolem(&repo_id, &peer_id, b.as_ref().unique_id().unwrap())?;
                    insert.subject = Subject::NamedNode(NamedNode::new_unchecked(iri));
                }
            }
            if insert.object.is_blank_node() {
                //log_debug!("INSERTING OBJECT BN {}", insert.object);
                if let Term::BlankNode(b) = &insert.object {
                    let iri =
                        NuriV0::repo_skolem(&repo_id, &peer_id, b.as_ref().unique_id().unwrap())?;
                    insert.object = Term::NamedNode(NamedNode::new_unchecked(iri));
                }
            }
            // TODO deal with triples in subject and object (RDF-STAR)

            set.insert(insert.into());
        }
        for remove in removes {
            let (repo_id, branch_id, is_publisher) =
                self.find_branch_and_repo_for_quad(&remove, &mut branches, &mut nuri_branches)?;
            if !is_publisher {
                continue;
            }
            let set = removes_map.entry(branch_id).or_insert_with(|| {
                let set = HashSet::with_capacity(removes_len);
                removes_len = 1;
                set
            });
            set.insert(remove.into());
        }

        let mut updates = Vec::with_capacity(branches.len());

        for (branch_id, (store_repo, repo_id, branch_type, topic_id, token, overlay_id)) in branches
        {
            let graph_transac = GraphTransaction {
                inserts: Vec::from_iter(inserts_map.remove(&branch_id).unwrap_or(HashSet::new())),
                removes: Vec::from_iter(removes_map.remove(&branch_id).unwrap_or(HashSet::new())),
            };

            let mut transac = TransactionBody {
                body_type: TransactionBodyType::Graph,
                graph: Some(graph_transac),
                discrete: None,
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

            let mut graph_update = transac.graph.take().unwrap();
            graph_update.tokenize_with_commit_id(commit.id().unwrap(), &repo_id);

            let info = BranchUpdateInfo {
                branch_id,
                branch_type,
                repo_id,
                topic_id,
                token,
                overlay_id,
                previous_heads: commit.direct_causal_past_ids(),
                commit_id: commit.id().unwrap(),
                transaction: graph_update,
                commit_info,
            };
            updates.push(info);
        }
        self.update_graph(updates).await
    }

    async fn update_graph(
        &mut self,
        mut updates: Vec<BranchUpdateInfo>,
    ) -> Result<(), VerifierError> {
        let updates_ref = &mut updates;
        let res = self
            .graph_dataset
            .as_ref()
            .unwrap()
            .ng_transaction(
                move |mut transaction| -> Result<(), ng_oxigraph::oxigraph::store::StorageError> {
                    let reader = transaction.ng_get_reader();

                    for update in updates_ref.iter_mut() {
                        let branch_is_main = update.branch_type.is_main();

                        let commit_name =
                            NuriV0::commit_graph_name(&update.commit_id, &update.overlay_id);
                        let commit_encoded = numeric_encoder::StrHash::new(&commit_name);

                        let cv_graphname = NamedNode::new_unchecked(commit_name);
                        let cv_graphname_ref = GraphNameRef::NamedNode((&cv_graphname).into());
                        let ov_main = if branch_is_main {
                            let ov_graphname = NamedNode::new_unchecked(NuriV0::repo_graph_name(
                                &update.repo_id,
                                &update.overlay_id,
                            ));
                            Some(ov_graphname)
                        } else {
                            None
                        };
                        let value = if branch_is_main {
                            ADDED_IN_MAIN
                        } else {
                            ADDED_IN_OTHER
                        };
                        for triple in update.transaction.inserts.iter() {
                            let triple_ref: TripleRef = triple.into();
                            let quad_ref = triple_ref.in_graph(cv_graphname_ref);
                            transaction.insert(quad_ref, value, true)?;
                            if let Some(ov_graphname) = ov_main.as_ref() {
                                let ov_graphname_ref = GraphNameRef::NamedNode(ov_graphname.into());
                                let triple_ref: TripleRef = triple.into();
                                let quad_ref = triple_ref.in_graph(ov_graphname_ref);
                                transaction.insert(quad_ref, REPO_IN_MAIN, false)?;
                            }
                        }

                        let topic_encoded =
                            numeric_encoder::StrHash::new(&NuriV0::topic_id(&update.topic_id));
                        let overlay_encoded =
                            numeric_encoder::StrHash::new(&NuriV0::overlay_id(&update.overlay_id));

                        let branch_encoded =
                            numeric_encoder::StrHash::new(&NuriV0::branch_id(&update.branch_id));
                        let token_encoded =
                            numeric_encoder::StrHash::new(&NuriV0::token(&update.token));

                        transaction.update_branch_and_token(
                            &overlay_encoded,
                            &branch_encoded,
                            &topic_encoded,
                            &token_encoded,
                        )?;

                        let direct_causal_past_encoded: HashSet<numeric_encoder::StrHash> =
                            HashSet::from_iter(update.previous_heads.iter().map(|commit_id| {
                                numeric_encoder::StrHash::new(&NuriV0::commit_graph_name(
                                    commit_id,
                                    &update.overlay_id,
                                ))
                            }));

                        let current_heads =
                            reader.ng_get_heads(&topic_encoded, &overlay_encoded)?;

                        transaction.update_heads(
                            &topic_encoded,
                            &overlay_encoded,
                            &commit_encoded,
                            &direct_causal_past_encoded,
                        )?;

                        if !direct_causal_past_encoded.is_empty() {
                            // adding past
                            transaction.update_past(
                                &commit_encoded,
                                &direct_causal_past_encoded,
                                false,
                            )?;
                        }

                        if !update.transaction.removes.is_empty() {
                            if current_heads.is_empty() {
                                return Err(ng_oxigraph::oxigraph::store::StorageError::Other(
                                    Box::new(VerifierError::CannotRemoveTriplesWhenNewBranch),
                                ));
                            }

                            let at_current_heads = current_heads == direct_causal_past_encoded;
                            // if not, we need to base ourselves on the materialized state of the direct_causal_past of the commit
                            let value = if branch_is_main {
                                REMOVED_IN_MAIN
                            } else {
                                REMOVED_IN_OTHER
                            };
                            let mut to_remove_from_removes: HashSet<usize> = HashSet::new();
                            for (pos, remove) in update.transaction.removes.iter().enumerate() {
                                let encoded_subject = remove.subject.as_ref().into();
                                let encoded_predicate = remove.predicate.as_ref().into();
                                let encoded_object = remove.object.as_ref().into();
                                let observed_adds = reader
                                    .quads_for_subject_predicate_object_heads(
                                        &encoded_subject,
                                        &encoded_predicate,
                                        &encoded_object,
                                        &direct_causal_past_encoded,
                                        at_current_heads,
                                    )?;

                                for removing in observed_adds {
                                    let graph_encoded = EncodedTerm::NamedNode { iri_id: removing };
                                    let quad_encoded = EncodedQuad::new(
                                        encoded_subject.clone(),
                                        encoded_predicate.clone(),
                                        encoded_object.clone(),
                                        graph_encoded,
                                    );
                                    transaction.insert_encoded(&quad_encoded, value, true)?;
                                    transaction.ng_remove(&quad_encoded, &commit_encoded)?;
                                }
                                if let Some(ov_graphname) = ov_main.as_ref() {
                                    let should_remove_ov_triples = at_current_heads || {
                                        reader
                                            .quads_for_subject_predicate_object_heads(
                                                &encoded_subject,
                                                &encoded_predicate,
                                                &encoded_object,
                                                &current_heads,
                                                true,
                                            )?
                                            .is_empty()
                                    };
                                    if should_remove_ov_triples {
                                        let ov_graphname_ref =
                                            GraphNameRef::NamedNode(ov_graphname.into());
                                        let triple_ref: TripleRef = remove.into();
                                        let quad_ref = triple_ref.in_graph(ov_graphname_ref);
                                        transaction.remove(quad_ref)?;
                                    } else {
                                        to_remove_from_removes.insert(pos);
                                    }
                                }
                            }
                            let mut idx: usize = 0;
                            update.transaction.removes.retain(|_| {
                                let retain = !to_remove_from_removes.remove(&idx);
                                idx += 1;
                                retain
                            });
                        }
                    }
                    Ok(())
                },
            )
            .map_err(|e| VerifierError::OxigraphError(e.to_string()));
        if res.is_ok() {
            for update in updates {
                if update.branch_type.is_header() {
                    let mut tab_doc_info = AppTabDocInfo::new();
                    for removed in update.transaction.removes {
                        match removed.predicate.as_str() {
                            NG_ONTOLOGY_ABOUT => tab_doc_info.description = Some("".to_string()),
                            NG_ONTOLOGY_TITLE => tab_doc_info.title = Some("".to_string()),
                            _ => {}
                        }
                    }
                    for inserted in update.transaction.inserts {
                        match inserted.predicate.as_str() {
                            NG_ONTOLOGY_ABOUT => {
                                if let Term::Literal(l) = inserted.object {
                                    tab_doc_info.description = Some(l.value().to_string())
                                }
                            }
                            NG_ONTOLOGY_TITLE => {
                                if let Term::Literal(l) = inserted.object {
                                    tab_doc_info.title = Some(l.value().to_string())
                                }
                            }
                            _ => {}
                        }
                    }
                    self.push_app_response(
                        &update.branch_id,
                        AppResponse::V0(AppResponseV0::TabInfo(AppTabInfo {
                            branch: None,
                            doc: Some(tab_doc_info),
                            store: None,
                        })),
                    )
                    .await;
                } else {
                    let graph_patch = update.transaction.as_patch();
                    self.push_app_response(
                        &update.branch_id,
                        AppResponse::V0(AppResponseV0::Patch(AppPatch {
                            commit_id: update.commit_id.to_string(),
                            commit_info: update.commit_info,
                            graph: Some(graph_patch),
                            discrete: None,
                            other: None,
                        })),
                    )
                    .await;
                }
            }
        }
        res
    }

    pub(crate) async fn process_sparql_update(
        &mut self,
        nuri: &NuriV0,
        query: &String,
        base: &Option<String>,
        peer_id: Vec<u8>,
    ) -> Result<(), String> {
        let store = self.graph_dataset.as_ref().unwrap();

        let update = ng_oxigraph::oxigraph::sparql::Update::parse(query, base.as_deref())
            .map_err(|e| e.to_string())?;

        let res = store.ng_update(
            update,
            self.resolve_target_for_sparql(&nuri.target, true)
                .map_err(|e| e.to_string())?,
        );
        match res {
            Err(e) => Err(e.to_string()),
            Ok((inserts, removes)) => {
                if inserts.is_empty() && removes.is_empty() {
                    Ok(())
                } else {
                    self.prepare_sparql_update(
                        Vec::from_iter(inserts),
                        Vec::from_iter(removes),
                        peer_id,
                    )
                    .await
                    .map_err(|e| e.to_string())
                }
            }
        }
    }
}

#[cfg(test)]
mod test {

    use super::{TransactionBody, TransactionBodyType};
    use ng_repo::log::*;
    use serde_bare::to_vec;

    #[test]
    pub fn test_transaction_body() {
        let body = TransactionBody {
            body_type: TransactionBodyType::Graph,
            graph: None,
            discrete: None,
        };
        let ser = to_vec(&body).unwrap();

        log_debug!("graph {:?}", ser);

        let body = TransactionBody {
            body_type: TransactionBodyType::Discrete,
            graph: None,
            discrete: None,
        };
        let ser = to_vec(&body).unwrap();

        log_debug!("discrete {:?}", ser);

        let body = TransactionBody {
            body_type: TransactionBodyType::Both,
            graph: None,
            discrete: None,
        };
        let ser = to_vec(&body).unwrap();

        log_debug!("both {:?}", ser);
    }
}
