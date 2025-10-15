// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_oxigraph::oxrdf::Quad;
use ng_repo::errors::VerifierError;

use std::u64;

use futures::SinkExt;
use ng_net::app_protocol::*;
pub use ng_net::orm::{OrmDiff, OrmShapeType};
use ng_repo::log::*;

use crate::orm::types::*;
use crate::verifier::*;

impl Verifier {
    /// After creating new objects (without an id) in JS-land,
    /// we send the generated id for those back.
    /// If something went wrong (revert_inserts / revert_removes not empty),
    /// we send a JSON patch back to revert the made changes.
    pub(crate) async fn orm_update_self(
        &mut self,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        session_id: u64,
        skolemnized_blank_nodes: Vec<Quad>,
        revert_inserts: Vec<Quad>,
        revert_removes: Vec<Quad>,
    ) -> Result<(), VerifierError> {
        let (mut sender, orm_subscription) =
            self.get_first_orm_subscription_sender_for(scope, Some(&shape_iri), Some(&session_id))?;

        // TODO prepare OrmUpdateBlankNodeIds with skolemnized_blank_nodes
        // use orm_subscription if needed
        // note(niko): I think skolemnized blank nodes can still be many, in case of multi-level nested sub-objects.
        let orm_bnids = vec![];
        let _ = sender
            .send(AppResponse::V0(AppResponseV0::OrmUpdateBlankNodeIds(
                orm_bnids,
            )))
            .await;

        // TODO (later) revert the inserts and removes
        // let orm_diff = vec![];
        // let _ = sender.send(AppResponse::V0(AppResponseV0::OrmUpdate(orm_diff))).await;

        Ok(())
    }

    /// Handles updates coming from JS-land (JSON patches).
    pub(crate) async fn orm_frontend_update(
        &mut self,
        session_id: u64,
        scope: &NuriV0,
        shape_iri: ShapeIri,
        diff: OrmDiff,
    ) -> Result<(), String> {
        log_info!(
            "frontend_update_orm session={} scope={:?} shape={} diff={:?}",
            session_id,
            scope,
            shape_iri,
            diff
        );

        let (doc_nuri, sparql_update) = {
            let orm_subscription =
                self.get_first_orm_subscription_for(scope, Some(&shape_iri), Some(&session_id));

            // use orm_subscription as needed
            // do the magic, then, find the doc where the query should start and generate the sparql update
            let doc_nuri = NuriV0::new_empty();
            let sparql_update: String = String::new();
            (doc_nuri, sparql_update)
        };

        match self
            .process_sparql_update(
                &doc_nuri,
                &sparql_update,
                &None,
                self.get_peer_id_for_skolem(),
                session_id,
            )
            .await
        {
            Err(e) => Err(e),
            Ok((_, revert_inserts, revert_removes, skolemnized_blank_nodes)) => {
                if !revert_inserts.is_empty()
                    || !revert_removes.is_empty()
                    || !skolemnized_blank_nodes.is_empty()
                {
                    self.orm_update_self(
                        scope,
                        shape_iri,
                        session_id,
                        skolemnized_blank_nodes,
                        revert_inserts,
                        revert_removes,
                    )
                    .await
                    .map_err(|e| e.to_string())?;
                }
                Ok(())
            }
        }
    }
}
