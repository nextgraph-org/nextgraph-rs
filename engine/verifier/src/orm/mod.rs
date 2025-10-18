// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

pub mod add_remove_triples;
pub mod handle_backend_update;
pub mod handle_frontend_update;
pub mod materialize;
pub mod process_changes;
pub mod query;
pub mod shape_validation;
pub mod types;
pub mod utils;

pub use ng_net::orm::{OrmPatches, OrmShapeType};

use crate::orm::types::*;
use crate::verifier::*;

impl Verifier {
    pub(crate) fn _clean_orm_subscriptions(&mut self) {
        self.orm_subscriptions.retain(|_, subscriptions| {
            subscriptions.retain(|sub| !sub.sender.is_closed());
            !subscriptions.is_empty()
        });
    }
}
