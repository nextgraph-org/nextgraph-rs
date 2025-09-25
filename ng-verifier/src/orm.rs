// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use std::collections::HashMap;

use futures::channel::mpsc;

use futures::SinkExt;
use ng_net::app_protocol::*;
pub use ng_net::orm::OrmDiff;
pub use ng_net::orm::OrmShapeType;
use ng_net::{
    connection::NoiseFSM,
    types::*,
    utils::{Receiver, Sender},
};
use ng_oxigraph::oxigraph::sparql::{results::*, Query, QueryResults};
use ng_oxigraph::oxrdf::Term;
use ng_oxigraph::oxrdf::Triple;
use ng_repo::errors::NgError;
use ng_repo::log::*;

use crate::types::*;
use crate::verifier::*;

impl Verifier {
    pub fn sparql_construct(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Triple>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // let graph_nuri = NuriV0::repo_graph_name(
        //     &update.repo_id,
        //     &update.overlay_id,
        // );
        //let base = NuriV0::repo_id(&repo.id);

        let nuri_str = nuri.as_ref().map(|s| s.as_str());

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, nuri)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Graph(triples) => {
                let mut results = vec![];
                for t in triples {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(triple) => results.push(triple),
                    }
                }
                Ok(results)
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

    pub fn sparql_select(
        &self,
        query: String,
        nuri: Option<String>,
    ) -> Result<Vec<Vec<Option<Term>>>, NgError> {
        let oxistore = self.graph_dataset.as_ref().unwrap();

        // let graph_nuri = NuriV0::repo_graph_name(
        //     &update.repo_id,
        //     &update.overlay_id,
        // );

        //let base = NuriV0::repo_id(&repo.id);
        let nuri_str = nuri.as_ref().map(|s| s.as_str());

        let parsed =
            Query::parse(&query, nuri_str).map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        let results = oxistore
            .query(parsed, None)
            .map_err(|e| NgError::OxiGraphError(e.to_string()))?;
        match results {
            QueryResults::Solutions(sols) => {
                let mut results = vec![];
                for t in sols {
                    match t {
                        Err(e) => {
                            log_err!("{}", e.to_string());
                            return Err(NgError::SparqlError(e.to_string()));
                        }
                        Ok(querysol) => results.push(querysol.values().to_vec()),
                    }
                }
                Ok(results)
            }
            _ => return Err(NgError::InvalidResponse),
        }
    }

    pub(crate) async fn orm_update(&mut self, scope: &NuriV0, patch: GraphQuadsPatch) {}

    pub(crate) async fn frontend_update_orm(
        &mut self,
        scope: &NuriV0,
        shape_id: String,
        diff: OrmDiff,
    ) {
        log_info!("frontend_update_orm {:?} {} {:?}", scope, shape_id, diff);
    }

    pub(crate) async fn push_orm_response(
        &mut self,
        scope: &NuriV0,
        schema_iri: &String,
        response: AppResponse,
    ) {
        log_info!(
            "push_orm_response {:?} {} {:?}",
            scope,
            schema_iri,
            self.orm_subscriptions
        );
        if let Some(shapes) = self.orm_subscriptions.get_mut(scope) {
            if let Some(sessions) = shapes.get_mut(schema_iri) {
                let mut sessions_to_close: Vec<u64> = vec![];
                for (session_id, sender) in sessions.iter_mut() {
                    if sender.is_closed() {
                        log_debug!("closed so removing session {}", session_id);
                        sessions_to_close.push(*session_id);
                    } else {
                        let _ = sender.send(response.clone()).await;
                    }
                }
                for session_id in sessions_to_close.iter() {
                    sessions.remove(session_id);
                }
            }
        }
    }

    pub(crate) async fn start_orm(
        &mut self,
        nuri: &NuriV0,
        schema: &OrmShapeType,
        session_id: u64,
    ) -> Result<(Receiver<AppResponse>, CancelFn), NgError> {
        let (tx, rx) = mpsc::unbounded::<AppResponse>();

        self.orm_subscriptions.insert(
            nuri.clone(),
            HashMap::from([(
                schema.shape.clone(),
                HashMap::from([(session_id, tx.clone())]),
            )]),
        );

        //self.push_orm_response().await;

        let close = Box::new(move || {
            //log_debug!("CLOSE_CHANNEL of subscription for branch {}", branch_id);
            if !tx.is_closed() {
                tx.close_channel();
            }
        });
        Ok((rx, close))
    }
}
