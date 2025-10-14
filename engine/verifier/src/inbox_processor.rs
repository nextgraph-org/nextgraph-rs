// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

//! Processor for each type of InboxMsgContent

use std::sync::Arc;

use base64_url::base64::read;
use ng_net::actor::SoS;
use ng_net::broker::BROKER;
use ng_oxigraph::oxigraph::sparql::QueryResults;
use ng_oxigraph::oxrdf::{NamedNode, Term, Triple};
use ng_oxigraph::oxsdatatypes::DateTime;
use ng_repo::types::{Block, ObjectRef, OverlayId, PrivKey, ReadCap, RepoId, StoreRepo, StoreRepoV0};
use ng_repo::{errors::*, store::Store, types::Commit};
use ng_repo::log::*;

use ng_net::types::{InboxMsg, InboxMsgContent, InboxPost, SocialQuery, SocialQueryResponse, SocialQueryResponseContent};
use ng_net::app_protocol::*;

use crate::verifier::*;

impl Verifier {

    pub(crate) async fn post_to_inbox(&self, post: InboxPost) -> Result<(), VerifierError> {
        //log_info!("post_to_inbox {:?}",post);
        let res = match self.client_request::<_,()>(post).await
        {
            Err(e) => Err(VerifierError::InboxError(e.to_string())),
            Ok(SoS::Stream(_)) => Err(VerifierError::InboxError(NgError::InvalidResponse.to_string())),
            Ok(SoS::Single(_)) => Ok(()),
        };
        //log_info!("res {:?}",res);
        res
    }

    pub(crate) async fn create_social_query_forwarder(
        &mut self, 
        social_query_doc_nuri_string: &String,
        from_forwarder_nuri_string: &String,
        from_profile_nuri_string: &String,
        from_inbox_nuri_string: &String,
    ) -> Result<(String, NuriV0), VerifierError> {
        // creating the ForwardedSocialQuery in the private store
        let forwarder = self.doc_create_with_store_repo(
            "Graph".to_string(), "social:query:forwarded".to_string(),
            "store".to_string(), None // meaning in private store
        ).await?;
        let forwarder_nuri = NuriV0::new_from_repo_graph(&forwarder)?;
        let forwarder_id = forwarder_nuri.target.repo_id().clone();
        let forwarder_nuri_string = NuriV0::repo_id(&forwarder_id);

        // adding triples in forwarder doc : ng:social_query_id
        let sparql_update = format!(" PREFIX ng: <did:ng:x:ng#>
            PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
            INSERT DATA {{  <> ng:social_query_id <{social_query_doc_nuri_string}>.
                            <> ng:social_query_forwarder <{from_forwarder_nuri_string}>.
                            <> ng:social_query_from_inbox <{from_inbox_nuri_string}>.
                            <> ng:social_query_from_profile <{from_profile_nuri_string}>.
                            <> ng:social_query_started \"{}\"^^xsd:dateTime . }}",DateTime::now());
        let ret = self
            .process_sparql_update(&forwarder_nuri, &sparql_update, &Some(forwarder_nuri_string.clone()), vec![],0)
            .await;
        if let Err(e) = ret {
            return Err(VerifierError::SparqlError(e));
        }
        Ok((forwarder_nuri_string,forwarder_nuri))
    }

    pub(crate) async fn mark_social_query_forwarder(&mut self, forwarder_nuri_string: &String, forwarder_nuri: &NuriV0, predicate: String) -> Result<(), VerifierError> {

        // adding triples in forwarder doc : ng:social_query_id
        let sparql_update = format!("INSERT DATA {{ <{forwarder_nuri_string}> <did:ng:x:ng#{predicate}> \"{}\"^^<http://www.w3.org/2001/XMLSchema#dateTime> . }}",DateTime::now());
        let ret = self
            .process_sparql_update(forwarder_nuri, &sparql_update, &None, vec![],0)
            .await;
        if let Err(e) = ret {
            return Err(VerifierError::SparqlError(e));
        }
        Ok(())
    }

    pub(crate) fn get_privkey_of_inbox(&self, this_overlay: &OverlayId) -> Result<PrivKey, VerifierError> {
        let store = self.get_store_by_overlay_id(this_overlay)?;
        let repo = self.repos.get(&store.id()).ok_or(NgError::RepoNotFound)?;
        let from_inbox = repo.inbox.to_owned().ok_or(NgError::InboxNotFound)?;
        Ok(from_inbox)
    }

    fn get_profile_replying_to(&self, from_profile: &String) -> Result<(OverlayId, PrivKey) ,NgError> {

        let from_profile_id = if from_profile.starts_with("did:ng:b") {
            self.config.protected_store_id.unwrap()
        } else {
            self.config.public_store_id.unwrap()
        };
        
        let repo = self.repos.get(&from_profile_id).ok_or(NgError::RepoNotFound)?;
        let inbox = repo.inbox.to_owned().ok_or(NgError::InboxNotFound)?;
        let overlay = repo.store.get_store_repo().outer_overlay();

        Ok( (overlay, inbox.clone()) )
    }

    pub(crate) fn get_2_profiles(&self) -> Result<( 
        (StoreRepo, PrivKey), // public
        (StoreRepo, PrivKey) // protected
    ) ,NgError> {

        let protected_store_id = self.config.protected_store_id.unwrap();
        let protected_repo = self.repos.get(&protected_store_id).ok_or(NgError::RepoNotFound)?;
        let protected_inbox = protected_repo.inbox.to_owned().ok_or(NgError::InboxNotFound)?;
        let protected_store_repo = protected_repo.store.get_store_repo();

        let public_store_id = self.config.public_store_id.unwrap();
        let public_repo = self.repos.get(&public_store_id).ok_or(NgError::RepoNotFound)?;
        let public_inbox = public_repo.inbox.to_owned().ok_or(NgError::InboxNotFound)?;
        let public_store_repo = public_repo.store.get_store_repo();

        Ok((
            (*public_store_repo, public_inbox.clone()),
            (*protected_store_repo, protected_inbox.clone())
        ))
    }

    pub(crate) async fn social_query_dispatch(
        &mut self,
        to_profile_nuri: &String,
        to_inbox_nuri: &String,
        forwarder_nuri: &NuriV0,
        forwarder_id: &RepoId,
        from_profiles: &( 
            (StoreRepo, PrivKey), // public
            (StoreRepo, PrivKey) // protected
        ),
        query_id: &RepoId,
        definition_commit_body_ref: &ObjectRef,
        blocks: &Vec<Block>,
        degree: u16,
    ) -> Result<(), VerifierError> {

        // first add an entry in the local forwarded social query, to monitor progress
        let sparql_update = format!("
            PREFIX ng: <did:ng:x:ng#>
            INSERT DATA {{ 
                <did:ng:_> ng:social_query_forwarded_to_profile <{to_profile_nuri}> .
                <did:ng:_> ng:social_query_forwarded_to_inbox <{to_inbox_nuri}> .
            }}");
        let ret = self
            .process_sparql_update(&forwarder_nuri, &sparql_update, &None, vec![],0)
            .await;
        if let Err(e) = ret {
            return Err(VerifierError::SparqlError(e));
        }
        // then send InboxPost message.

        let from_profile = if to_profile_nuri.starts_with("did:ng:b") {
            &from_profiles.1
        } else {
            &from_profiles.0
        };

        self.post_to_inbox(InboxPost::new_social_query_request(
            from_profile.0, 
            from_profile.1.clone(),
            *forwarder_id,
            to_profile_nuri.clone(),
            to_inbox_nuri.clone(),
            None,
            *query_id,
            definition_commit_body_ref.clone(),
            blocks.to_vec(),
            degree,
        )?).await?;

        Ok(())
    }

    pub(crate) async fn process_inbox(
        &mut self,
        msg: &InboxMsg,
        content: InboxMsgContent,
    ) -> Result<(), VerifierError> {

        match content {
            InboxMsgContent::SocialQuery(SocialQuery::Request(req)) => {

                let profile_id_nuri  = NuriV0::from_store_repo_string(&req.from_profile_store_repo);

                //TODO: check that msg.body.from_overlay matches with req.from_profile_store_repo

                //TODO: check that this contact is mutual req.from_profile_store_repo must be in our contact list

                // getting the privkey of the inbox because we will need it here below to send responses.
                let reply_with_inbox = self.get_privkey_of_inbox(&msg.body.to_overlay)?;

                let social_query_doc_nuri_string: String = NuriV0::repo_id(&req.query_id);
                
                // checking that we didn't process this query ID yet. if we did, return a SocialQueryResponseContent::AlreadyRequested
                match self.sparql_query(
                    &NuriV0::new_entire_user_site(),
                    format!("ASK {{ ?s <did:ng:x:ng#social_query_id> <{social_query_doc_nuri_string}> }}"), None).await? 
                {
                    QueryResults::Boolean(true) => {
                        let post = InboxPost::new_social_query_response_replying_to(
                            &msg.body,
                            &req,
                            SocialQueryResponseContent::AlreadyRequested,
                            reply_with_inbox.clone()
                        )?;
                        self.post_to_inbox(post).await?;
                        return Ok(());
                        }
                    _ => {}
                }

                // otherwise, create the forwarder
                let (forwarder_nuri_string, forwarder_nuri) = self.create_social_query_forwarder(
                    &social_query_doc_nuri_string,
                    &NuriV0::repo_id(&req.forwarder_id),
                    &NuriV0::from_store_repo_string(&req.from_profile_store_repo),
                    &NuriV0::inbox(&msg.body.from_inbox.unwrap())
                ).await?;

                let temp_mini_block_storage = Store::new_temp_in_mem();
                for block in msg.blocks.iter() {
                    let _id = temp_mini_block_storage.put(block)?;
                }
                let commit = Commit::load(req.definition_commit_body_ref.clone(),
                    &temp_mini_block_storage, true)
                    .map_err(|e| {
                        //log_err!("err : {:?}", e);
                        e
                    })?;
                
                let triples = Verifier::get_triples_from_transaction(commit.body().unwrap())?;

                let mut sparql: Option<String> = None;
                for triple in triples {
                    if triple.predicate.as_str() == "did:ng:x:ng#social_query_sparql" {
                        sparql = Some(
                            match triple.object {
                                Term::Literal(l) => l.value().into(),
                                _ => return Err(VerifierError::InvalidSocialQuery)
                            });
                        break;
                    }
                }
                //TODO: in case of errors here below, mark the forwarder as ng:social_query_error
                if sparql.is_none() { return Err(VerifierError::InvalidSocialQuery); }

                //log_info!("{}",sparql.as_ref().unwrap());

                let res = self.sparql_query(&NuriV0::new_entire_user_site(), sparql.unwrap(), None).await?;

                let results = match res {
                    QueryResults::Boolean(_) | QueryResults::Solutions(_) => return Err(VerifierError::NotImplemented),
                    QueryResults::Graph(triples) => {
                        let mut results = vec![];
                        for t in triples {
                            match t {
                                Err(e) => { log_err!("{}",e.to_string()); return Err(VerifierError::SparqlError(e.to_string()))},
                                Ok(triple) => results.push(triple),
                            }
                        }
                        results
                    }
                };

                //log_info!("{:?}",results);

                // Do we have local results matching the request's query? If yes, we send them back to the forwarder right away
                if !results.is_empty() {
                    let content = SocialQueryResponseContent::Graph(serde_bare::to_vec(&results).unwrap());
                    let post = InboxPost::new_social_query_response_replying_to(
                        &msg.body,
                        &req,
                        content,
                        reply_with_inbox.clone()
                    )?;
                    self.post_to_inbox(post).await?;
                }

                // only fan out if we have contacts (that match the grant selected by current user) 
                // and if degree is > to 1 or equal to zero
                if req.degree == 1 {

                    // ending here.
                    self.mark_social_query_forwarder(&forwarder_nuri_string, &forwarder_nuri, "social_query_ended".to_string()).await?;
                    let post = InboxPost::new_social_query_response_replying_to(
                        &msg.body,
                        &req,
                        SocialQueryResponseContent::EndOfReplies,
                        reply_with_inbox.clone()
                    )?;
                    self.post_to_inbox(post).await?;

                    return Ok(())
                }
                // fan out forwarded social queries to all contacts (except the one we received it from)

                // getting the contacts to forward to
                let sparql = format!("PREFIX ng: <did:ng:x:ng#>
                    PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
                    SELECT ?profile_id ?inbox_id WHERE 
                        {{ ?c a vcard:Individual .
                            OPTIONAL {{ ?c ng:site ?profile_id . ?c ng:site_inbox ?inbox_id }}
                            OPTIONAL {{ ?c ng:protected ?profile_id . ?c ng:protected_inbox ?inbox_id }}
                            FILTER ( bound(?profile_id) && NOT EXISTS {{ ?c ng:site <{profile_id_nuri}> }} && NOT EXISTS {{ ?c ng:protected <{profile_id_nuri}> }} )
                        }}");
                //log_info!("{sparql}");
                let sols = match self.sparql_query(
                    &NuriV0::new_entire_user_site(),
                    sparql, None).await? 
                {
                    QueryResults::Solutions(sols) => { sols }
                    _ => return Err(VerifierError::SparqlError(NgError::InvalidResponse.to_string())),
                };

                let degree = if req.degree == 0 { 0 } else { req.degree - 1 };
                //log_info!("new degree {degree}");
                let mut found_contact = false;
                let forwarder_id = forwarder_nuri.target.repo_id().clone();

                let from_profiles = self.get_2_profiles()?;

                for sol in sols {
                    match sol {
                        Err(e) => return Err(VerifierError::SparqlError(e.to_string())),
                        Ok(s) => {
                            if let Some(Term::NamedNode(profile_id)) = s.get("profile_id") {
                                let to_profile_nuri = profile_id.as_string();
                                if let Some(Term::NamedNode(inbox_id)) = s.get("inbox_id") {
                                    let to_inbox_nuri = inbox_id.as_string();

                                    found_contact = true;

                                    self.social_query_dispatch(
                                        to_profile_nuri, 
                                        to_inbox_nuri, 
                                        &forwarder_nuri, 
                                        &forwarder_id,
                                        &from_profiles,
                                        &req.query_id, 
                                        &req.definition_commit_body_ref, 
                                        &msg.blocks, 
                                        degree
                                    ).await?;
                                }
                            }
                        }
                    }
                }
                // if not found any contact, we stop here
                //log_info!("found contact {found_contact}");
                if !found_contact {
                    self.mark_social_query_forwarder(&forwarder_nuri_string, &forwarder_nuri, "social_query_ended".to_string()).await?;
                    let post = InboxPost::new_social_query_response_replying_to(
                        &msg.body,
                        &req,
                        SocialQueryResponseContent::EndOfReplies,
                        reply_with_inbox
                    )?;
                    self.post_to_inbox(post).await?;
                }

            }
            InboxMsgContent::SocialQuery(SocialQuery::Response(response)) => {

                if msg.body.from_inbox.is_none() {
                    // TODO log error
                    // we do nothing as this is invalid msg. it must have a from.
                    return Err(VerifierError::InvalidSocialQuery)
                }

                let forwarder_nuri = NuriV0::new_repo_target_from_id(&response.forwarder_id);

                //first we open the response.forwarder_id (because in webapp, it might not be loaded yet)
                {
                    let broker = BROKER.read().await;
                    let user = Some(self.user_id().clone());
                    //let remote = (&self.connected_broker).into();

                    let (user_branch_id, private_store_id) = { 
                        let private_store = self
                        .repos
                        .get(self.private_store_id())
                        .ok_or(NgError::StoreNotFound)?;
                        
                        (private_store.user_branch().unwrap().id, private_store.id)
                    };

                    // if self.repos.get(&response.forwarder_id).is_none() {

                    //     // we need to load the forwarder
                    //     self.load_repo_from_read_cap(
                    //         &response.forwarder_readcap,
                    //         &broker,
                    //         &user,
                    //         &remote,
                    //         Arc::clone(&private_store.store),
                    //         true,
                    //     )
                    //     .await?;
                    //     self.open_for_target(&forwarder_nuri.target, false).await?;
                    // }
                    
                    self.open_branch_(&private_store_id, &user_branch_id,
                     false, &broker, &user, &self.connected_broker.clone(), true ).await?;

                    let main_branch_id = {
                        self.repos.get(&response.forwarder_id).unwrap().main_branch().unwrap().id
                    };

                    self.open_branch_(&response.forwarder_id, &main_branch_id,
                     false, &broker, &user, &self.connected_broker.clone(), true ).await?;
                }
                
                let forwarder_nuri_string = NuriV0::repo_id(&response.forwarder_id);
                // checking that we do have a running ForwardedSocialQuery, and that it didnt end, otherwise it must be spam.
                match self.sparql_query( &forwarder_nuri, format!("ASK {{ <> <did:ng:x:ng#social_query_id> <{}> }} ",
                    NuriV0::repo_id(&response.query_id)),Some(forwarder_nuri_string.clone())).await? {
                        QueryResults::Boolean(true) => {}
                        _ => { return Err(VerifierError::InvalidSocialQuery) }
                }
                let (forwarded_from_profile, forwarded_from_inbox, from_forwarder) = match self.sparql_query(
                    &forwarder_nuri,
                    "PREFIX ng: <did:ng:x:ng#>
                                    SELECT ?from_profile ?from_inbox ?from_forwarder ?ended WHERE 
                                    {{ OPTIONAL {{ <> ng:social_query_from_profile ?from_profile . }}
                                       OPTIONAL {{ <> ng:social_query_from_inbox ?from_inbox .}}
                                       OPTIONAL {{ <> ng:social_query_forwarder ?from_forwarder .}}
                                       OPTIONAL {{ <> ng:social_query_ended ?ended . }} 
                                    }}".to_string(), 
                                Some(forwarder_nuri_string)).await? 
                {
                    QueryResults::Solutions(mut sols) => {
                        match sols.next() {
                            None => {
                                //log_info!("at origin and not ended");
                                (None, None, None)
                            }
                            Some(Err(e)) => {
                                // TODO log error
                                // we do nothing as we couldn't find the ForwardedSocialQuery
                                return Err(VerifierError::SparqlError(e.to_string()));
                            }
                            Some(Ok(sol)) => {
                                if let Some(Term::NamedNode(_)) = sol.get("ended") {
                                    // TODO log error : someone is giving back some results while the forwarder is ended
                                    return Ok(())
                                };
                                let from_profile = if let Some(Term::NamedNode(nuri)) = sol.get("from_profile") {
                                    Some(nuri.as_string().clone())
                                } else {
                                    None
                                };
                                let from_inbox = if let Some(Term::NamedNode(nuri)) = sol.get("from_inbox") {
                                    Some(nuri.as_string().clone())
                                } else {
                                    None
                                };
                                let from_forwarder = if let Some(Term::NamedNode(nuri)) = sol.get("from_forwarder") {
                                    Some(nuri.as_string().clone())
                                } else {
                                    None
                                };
                                
                                (from_profile, from_inbox, from_forwarder)
                            }
                        }                           
                    }
                    _ => return Err(VerifierError::SparqlError(NgError::InvalidResponse.to_string())),
                };

                // searching for the tokenized commit that added this forwarding.
                let spar = format!("PREFIX ng: <did:ng:x:ng#>
                        SELECT ?token WHERE 
                            {{ ?token ng:social_query_forwarded_to_inbox <{}> .
                            MINUS {{ ?token ng:social_query_ended ?t . }} .
                    }}",
                    NuriV0::inbox(&msg.body.from_inbox.unwrap())
                );
                //log_info!("{spar}");
                let token = match self.sparql_query(
                    &forwarder_nuri,
                    //<> ng:social_query_id <{}>  NuriV0::inbox(&msg.body.from_inbox.unwrap()), 
                    spar,
                                Some(NuriV0::repo_id(&response.forwarder_id))).await? 
                {
                    QueryResults::Solutions(mut sols) => {
                        match sols.next() {
                            None => { return Err(VerifierError::SparqlError("Token not found".to_string())); }
                            Some(Err(e)) => {
                                // TODO log error
                                // we do nothing as we couldn't find the token
                                return Err(VerifierError::SparqlError(e.to_string()));
                            }
                            Some(Ok(sol)) => {
                                if let Some(Term::NamedNode(token)) = sol.get("token") {
                                    token.as_string().clone()
                                } else {
                                    // TODO log error
                                    // we do nothing as we couldn't find the token
                                    return Err(VerifierError::SparqlError(NgError::InvalidResponse.to_string()));
                                }
                            }
                        }                           
                    }
                    _ => return Err(VerifierError::SparqlError(NgError::InvalidResponse.to_string())),
                };
                //log_info!("token = {token}");

                let at_origin = forwarded_from_profile.is_none() || forwarded_from_inbox.is_none() || from_forwarder.is_none();

                match response.content {
                    SocialQueryResponseContent::AlreadyRequested 
                        | SocialQueryResponseContent::EndOfReplies 
                        | SocialQueryResponseContent::Error(_) => {
                            // ending here this forwarding.
                            self.mark_social_query_forwarder(&token, &forwarder_nuri, "social_query_ended".to_string()).await?;
                            // TODO record error

                            // if we are at the end of the whole ForwardedSocialQuery (no more pending responses)
                            // we send EndOfReplies upstream, and mark as ended.

                            let the_end = match self.sparql_query(
                                &forwarder_nuri,
                                format!("PREFIX ng: <did:ng:x:ng#>
                                                SELECT ?token WHERE 
                                                {{ ?token ng:social_query_forwarded_to_profile ?p .
                                                    MINUS {{ ?token ng:social_query_ended ?t . }}
                                                }}"),
                                None).await?
                            {
                                QueryResults::Solutions(mut sols) => {
                                    match sols.next() {
                                        None => true,
                                        _ => false,
                                    }
                                }
                                _ => {
                                    // TODO: log error
                                    false
                                }
                            };
                            if the_end {
                                // marking the end
                                self.mark_social_query_forwarder(&NuriV0::repo_id(&response.forwarder_id), &forwarder_nuri, "social_query_ended".to_string()).await?;
                                
                                if !at_origin {
                                    // getting the privkey of the inbox because we will need it here below to send responses.
                                    let from = self.get_profile_replying_to(forwarded_from_profile.as_ref().unwrap())?;

                                    // sending EndOfReplies upstream
                                    let to_overlay = NuriV0::from_profile_into_overlay_id(forwarded_from_profile.as_ref().unwrap())?;
                                    let to_inbox_id = NuriV0::from_inbox_into_id(forwarded_from_inbox.as_ref().unwrap())?;
                                    let from_forwarder = NuriV0::from_repo_nuri_to_id(from_forwarder.as_ref().unwrap())?;
                                    let post = InboxPost::new_social_query_response(
                                        to_overlay,
                                        to_inbox_id,
                                        Some(from),
                                        response.query_id,
                                        from_forwarder,
                                        SocialQueryResponseContent::EndOfReplies
                                    )?;
                                    self.post_to_inbox(post).await?;
                                }
                            }  
                        }
                    SocialQueryResponseContent::Graph(graph) => {

                        if at_origin {

                            // insert the triples in the query document
                            let triples: Vec<Triple> = serde_bare::from_slice(&graph)?;

                            if triples.is_empty() {
                                return Err(VerifierError::InvalidResponse);
                            }

                            // for t in triples.iter() {
                            //     log_info!("{}",t.to_string());
                            // }

                            let overlay_id = self.repos.get(&response.query_id).ok_or(VerifierError::RepoNotFound)?.store.outer_overlay();
                            let nuri_ov = NuriV0::repo_graph_name(&response.query_id, &overlay_id);
                            let graph_name = NamedNode::new_unchecked(&nuri_ov);
                            let quads = triples.into_iter().map(|t| t.in_graph(graph_name.clone()) ).collect();
                            let _ = self.prepare_sparql_update(quads, vec![], self.get_peer_id_for_skolem(), 0).await?;

                        } else {

                            // we forward upstream

                            // getting the privkey of the inbox because we will need it here below to send responses.
                            let from = self.get_profile_replying_to(forwarded_from_profile.as_ref().unwrap())?;

                            let to_overlay = NuriV0::from_profile_into_overlay_id(forwarded_from_profile.as_ref().unwrap())?;
                            let to_inbox_id = NuriV0::from_inbox_into_id(forwarded_from_inbox.as_ref().unwrap())?;
                            let from_forwarder = NuriV0::from_repo_nuri_to_id(from_forwarder.as_ref().unwrap())?;
                            let post = InboxPost::new_social_query_response(
                                to_overlay,
                                to_inbox_id,
                                Some(from),
                                response.query_id,
                                from_forwarder,
                                SocialQueryResponseContent::Graph(graph)
                            )?;
                            self.post_to_inbox(post).await?;
                        }

                    }
                    SocialQueryResponseContent::QueryResult(_) | SocialQueryResponseContent::False | SocialQueryResponseContent::True => {
                        // not implemented yet
                        return Err(VerifierError::NotImplemented)
                    }
                }

            }
            InboxMsgContent::ContactDetails(details) => {
                if msg.body.from_inbox.is_none() {
                    // TODO log error
                    // we do nothing as this is invalid msg. it must have a from.
                    return Err(VerifierError::InvalidInboxPost);
                }

                let inbox_nuri_string: String = NuriV0::inbox(&msg.body.from_inbox.unwrap());
                let profile_nuri_string: String = NuriV0::from_store_repo_string(&details.profile);
                let a_or_b = if details.profile.is_public() { "site" } else { "protected" };

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

                let contact = self.doc_create_with_store_repo(
                    "Graph".to_string(), "social:contact".to_string(),
                    "store".to_string(), None // meaning in private store
                ).await?;
                let contact_nuri = NuriV0::new_from_repo_graph(&contact)?;
                let contact_id = contact_nuri.target.repo_id().clone();
                let contact_nuri_string = NuriV0::repo_id(&contact_id);
                let has_email = details.email.map_or("".to_string(), |email| format!("<> vcard:hasEmail \"{email}\"."));

                // adding triples in contact doc
                let sparql_update = format!(" PREFIX ng: <did:ng:x:ng#>
                    PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
                    INSERT DATA {{  <> ng:{a_or_b} <{profile_nuri_string}>.
                                    <> ng:{a_or_b}_inbox <{inbox_nuri_string}>.
                                    <> a vcard:Individual .
                                    <> vcard:fn \"{}\".
                                    {has_email} }}", details.name);
                                    
                let ret = self
                    .process_sparql_update(&contact_nuri, &sparql_update, &Some(contact_nuri_string), vec![],0)
                    .await;
                if let Err(e) = ret {
                    return Err(VerifierError::SparqlError(e));
                }

                self.update_header(&contact_nuri.target, Some(details.name), None).await?;
            
            }
            _ => return Err(VerifierError::NotImplemented)
        }
        Ok(())
    }
}