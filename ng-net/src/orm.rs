/*
 * Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
 * All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
 * or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
 * at your option. All files in the project carrying such
 * notice may not be copied, modified, or distributed except
 * according to those terms.
*/

#![allow(non_snake_case)]

use serde::{Deserialize, Serialize};

use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmShapeType {
    pub iri: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmDiffOpType {
    add,
    remove,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum OrmDiffType {
    set,
    object,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmDiffOp {
    pub op: OrmDiffOpType,
    pub valType: Option<OrmDiffType>,
    pub path: String,
    pub value: Option<Value>,
}

pub type OrmDiff = Vec<OrmDiffOp>;
