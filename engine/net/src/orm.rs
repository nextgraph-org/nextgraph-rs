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

use std::{cmp::Ordering, collections::HashMap, sync::Arc};

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmShapeType {
    pub schema: OrmSchema,
    pub shape: String,
}

/* == Patch Types == */
#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[allow(non_camel_case_types)]
pub enum OrmPatchOp {
    add,
    remove,
    #[serde(rename = "move")]
    move_,
}

#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[allow(non_camel_case_types)]
pub enum OrmPatchType {
    set,
}

/// Types of possible patches:
/// For discrete ORM, things are just like regular JSON patches.
/// For graph ORM:
/// - There is no nesting, the path's first segment is a composite of `<graph NURI>|<subject URI>|<shape URI>/<readable predicate name>`
/// - For adding or removing objects, the path should be `/` and valType `set`. Value should contain `@graph` and `@id` (and `@shape` when adding objects).
/// - For linking nested objects to their parents, Make an `add` with a value containing, @graph, @id, @shape.
/// - The path should be `<graph NURI>|<subject URI>|<shape URI>/<readable predicate name>`
/// - if valType equals `set`, the values under that path are a set. This can be true for literals and objects
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmPatch {
    pub op: OrmPatchOp,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valType: Option<OrmPatchType>,
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub value: Option<serde_json::Value>,
}

impl Default for OrmPatch {
    fn default() -> Self {
        Self {
            op: OrmPatchOp::remove,
            path: String::new(),
            valType: None,
            from: None,
            value: None,
        }
    }
}

pub type OrmPatches = Vec<OrmPatch>;

pub type OrmSchema = HashMap<String, Arc<OrmSchemaShape>>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaShape {
    pub iri: String,
    pub predicates: Vec<Arc<OrmSchemaPredicate>>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Eq, PartialEq)]
#[allow(non_camel_case_types)]
pub enum OrmSchemaValType {
    number,
    string,
    boolean,
    iri,
    shape,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum BasicType {
    Bool(bool),
    Num(f64),
    Str(String),
}

impl PartialOrd for BasicType {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        match (self, other) {
            (BasicType::Num(a), BasicType::Num(b)) => a.partial_cmp(b),
            (BasicType::Str(a), BasicType::Str(b)) => a.partial_cmp(b),
            (BasicType::Bool(a), BasicType::Bool(b)) => a.partial_cmp(b),
            _ => None, // Different types are not comparable.
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaDataType {
    pub valType: OrmSchemaValType,
    pub literals: Option<Vec<BasicType>>,
    pub shape: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaPredicate {
    pub dataTypes: Vec<OrmSchemaDataType>,
    pub iri: String,
    pub readablePredicate: String,
    /// `-1` for infinity
    pub maxCardinality: i32,
    pub minCardinality: i32,
    pub extra: Option<bool>,
}
impl OrmSchemaPredicate {
    pub fn is_multi(&self) -> bool {
        self.maxCardinality > 1 || self.maxCardinality == -1 || self.extra.unwrap_or(false)
    }
    pub fn is_object(&self) -> bool {
        self.dataTypes
            .iter()
            .any(|dt| dt.valType == OrmSchemaValType::shape)
    }
}

pub type WhereConfig = serde_json::Value;
pub type SelectConfig = serde_json::Value;
pub type IsAscending = bool;
pub type OrderByConfig = Vec<(Arc<OrmSchemaPredicate>, IsAscending)>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmConfig {
    pub where_: Option<WhereConfig>,
    pub order_by: Option<OrderByConfig>,
    pub select: Option<SelectConfig>,
    /// No paging == 0
    pub page_size: u64,
    /// Infinite == 0
    pub max_active_pages: u64,
}
impl OrmConfig {
    /// Parse OrmConfig from json.
    pub fn from_json(
        config: &serde_json::Value,
        shape_type: &OrmShapeType,
    ) -> Result<OrmConfig, String> {
        let config_obj = config.as_object().ok_or("Orm config must be an object")?;

        // Parse orderBy config
        let order_by: Option<OrderByConfig> = if let Some(order_by_obj) = config_obj
            .get("orderBy")
            .map_or(None, |ob| if ob.is_null() { None } else { Some(ob) })
        {
            let parsed = Self::parse_order_by(order_by_obj)?;
            let mut order_by_config: OrderByConfig = Vec::with_capacity(parsed.len());
            let shape = shape_type
                .schema
                .get(&shape_type.shape)
                .ok_or("Main shape not found in schema")?;
            for (readable_pred, is_asc) in parsed {
                let found_pred = shape
                    .predicates
                    .iter()
                    .find(|p| p.readablePredicate == readable_pred)
                    .ok_or(format!(
                        "Predicate not found in orderBy config: {}",
                        readable_pred
                    ))?;
                if found_pred.maxCardinality != 1 || found_pred.minCardinality != 1 {
                    return Err("Orm config order by properties must have cardinality 1.".into());
                }
                order_by_config.push((found_pred.clone(), is_asc));
            }
            Some(order_by_config)
        } else {
            None
        };

        let page_size = config_obj
            .get("pageSize")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        if page_size > 0 && order_by.is_none() {
            return Err("If page size is set and > 0, orderBy must be set too.".into());
        }
        let max_active_pages = config_obj
            .get("maxActivePages")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        Ok(OrmConfig {
            where_: config_obj.get("where").cloned(),
            order_by,
            select: config_obj.get("select").cloned(),
            page_size,
            max_active_pages,
        })
    }

    /// Returns a Vec<(property name, is_asc)>
    fn parse_order_by(order_by: &serde_json::Value) -> Result<Vec<(String, bool)>, String> {
        /// For a Value::Object {propertyToOrderBy: "asc" | "desc"}, return Ok("property", is_asc)
        fn parse_obj(
            obj: &serde_json::Map<String, serde_json::Value>,
        ) -> Result<(String, bool), String> {
            if obj.len() != 1 {
                return Err(
                    "Order by object must have exactly 1 property (key -> 'asc'|'desc')"
                        .to_string(),
                );
            }
            let (property, asc_or_desc) = obj.iter().next().unwrap();
            let is_asc = match asc_or_desc {
                serde_json::Value::String(str) => {
                    if str == "asc" {
                        true
                    } else if str == "desc" {
                        false
                    } else {
                        return Err("Order by value must be 'asc' or 'desc'.".into());
                    }
                }
                _ => return Err("Order by value must be a string 'asc' or 'desc'.".into()),
            };

            Ok((property.clone(), is_asc))
        };

        match order_by {
            serde_json::Value::Object(obj) => Ok(vec![parse_obj(obj)?]),
            serde_json::Value::Array(items) => {
                let mut out = Vec::with_capacity(items.len());
                for item in items {
                    let obj = item.as_object().ok_or_else(|| {
                        "Each item in order by config must be an object".to_string()
                    })?;
                    out.push(parse_obj(obj)?);
                }
                Ok(out)
            }
            _ => Err(format!(
                "When defined, order by config must be an object or an array of objects. Got: {:?}",
                order_by
            )),
        }
    }
}

impl Default for OrmSchemaDataType {
    fn default() -> Self {
        Self {
            literals: None,
            shape: None,
            valType: OrmSchemaValType::string,
        }
    }
}

impl Default for OrmSchemaPredicate {
    fn default() -> Self {
        Self {
            dataTypes: Vec::new(),
            iri: String::new(),
            readablePredicate: String::new(),
            maxCardinality: -1,
            minCardinality: 0,
            extra: None,
        }
    }
}
