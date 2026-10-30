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

use lazy_static::lazy_static;
use ng_repo::log::*;
use regex::Regex;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::{collections::HashMap, sync::Arc};

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
    #[serde(rename = "isClosed", default = "false_")]
    pub is_closed: bool,
    pub predicates: Vec<Arc<OrmSchemaPredicate>>,
}

/// Helper fn that returns false.
fn false_() -> bool {
    false
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[allow(non_camel_case_types)]
pub enum OrmSchemaValType {
    iri,

    shape,

    #[deprecated = "Available for compatibility with shex-orm schemas <= version 0.1.2-alpha.10"]
    number,

    string,

    dateTime,

    /// The preferred numeric type
    decimal,
    byte,
    double,
    float,
    int,
    integer,
    long,
    negativeInteger,
    nonNegativeInteger,
    nonPositiveInteger,
    positiveInteger,
    short,
    unsignedLong,
    unsignedInt,
    unsignedShort,
    unsignedByte,

    boolean,

    UNKNOWN(String),
}

macro_rules! xsd_iri {
    ($value:expr; $($variant:ident),+ $(,)?) => {
        match $value {
            $(
                OrmSchemaValType::$variant => concat!(
                    "http://www.w3.org/2001/XMLSchema#",
                    stringify!($variant)
                ),
            )+
            _ => unreachable!(),
        }
    };
}

impl OrmSchemaValType {
    pub fn from_serde_str(value: &str) -> Result<Self, String> {
        match value {
            "iri" => Ok(Self::iri),
            "shape" => Ok(Self::shape),

            "number" => {
                log_warn!("Numeric xsd values are interpreted as xsd:decimal. Update @ng-org/shex-orm and rebuild the schema.");
                Ok(Self::number)
            }

            "string" => Ok(Self::string),

            "dateTime" => Ok(Self::dateTime),

            "byte" => Ok(Self::byte),
            "decimal" => Ok(Self::decimal),
            "double" => Ok(Self::double),
            "float" => Ok(Self::float),
            "int" => Ok(Self::int),
            "integer" => Ok(Self::integer),
            "long" => Ok(Self::long),
            "negativeInteger" => Ok(Self::negativeInteger),
            "nonNegativeInteger" => Ok(Self::nonNegativeInteger),
            "nonPositiveInteger" => Ok(Self::nonPositiveInteger),
            "positiveInteger" => Ok(Self::positiveInteger),
            "short" => Ok(Self::short),
            "unsignedLong" => Ok(Self::unsignedLong),
            "unsignedInt" => Ok(Self::unsignedInt),
            "unsignedShort" => Ok(Self::unsignedShort),
            "unsignedByte" => Ok(Self::unsignedByte),
            "boolean" => Ok(Self::boolean),

            unknown => {
                if is_iri(&unknown) {
                    Ok(Self::UNKNOWN(unknown.to_string()))
                } else {
                    Err(
                        format! {"Got an unknown type which is not an IRI or xsd type shorthand: {unknown} "},
                    )
                }
            }
        }
    }

    pub fn is_numeric(&self) -> bool {
        match self {
            OrmSchemaValType::number
            | OrmSchemaValType::byte
            | OrmSchemaValType::decimal
            | OrmSchemaValType::double
            | OrmSchemaValType::float
            | OrmSchemaValType::int
            | OrmSchemaValType::integer
            | OrmSchemaValType::long
            | OrmSchemaValType::negativeInteger
            | OrmSchemaValType::nonNegativeInteger
            | OrmSchemaValType::nonPositiveInteger
            | OrmSchemaValType::positiveInteger
            | OrmSchemaValType::short
            | OrmSchemaValType::unsignedLong
            | OrmSchemaValType::unsignedInt
            | OrmSchemaValType::unsignedShort
            | OrmSchemaValType::unsignedByte => true,
            _ => false,
        }
    }

    /// Converts to an IRI string unless OrmSchemaValType::iri ("iri") or OrmSchemaValType:shape ("shape")
    pub fn as_str(&self) -> &str {
        match self {
            Self::iri => "iri",
            Self::shape => "shape",

            Self::number => "http://www.w3.org/2001/XMLSchema#decimal",

            Self::UNKNOWN(iri) => iri.as_str(),

            _ => xsd_iri!(
                self;
                string,

                dateTime,

                byte,
                decimal,
                double,
                float,
                int,
                integer,
                long,
                negativeInteger,
                nonNegativeInteger,
                nonPositiveInteger,
                positiveInteger,
                short,
                unsignedLong,
                unsignedInt,
                unsignedShort,
                unsignedByte,

                boolean,
            ),
        }
    }

    pub fn as_serde_str(&self) -> &str {
        match self {
            Self::iri => "iri",

            Self::shape => "shape",

            Self::number => "number",

            Self::string => "string",

            Self::dateTime => "dateTime",

            Self::byte => "byte",
            Self::decimal => "decimal",
            Self::double => "double",
            Self::float => "float",
            Self::int => "int",
            Self::integer => "integer",
            Self::long => "long",
            Self::negativeInteger => "negativeInteger",
            Self::nonNegativeInteger => "nonNegativeInteger",
            Self::nonPositiveInteger => "nonPositiveInteger",
            Self::positiveInteger => "positiveInteger",
            Self::short => "short",
            Self::unsignedLong => "unsignedLong",
            Self::unsignedInt => "unsignedInt",
            Self::unsignedShort => "unsignedShort",
            Self::unsignedByte => "unsignedByte",

            Self::boolean => "boolean",

            Self::UNKNOWN(value) => value.as_str(),
        }
    }
}

impl Serialize for OrmSchemaValType {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_serde_str())
    }
}

impl<'de> Deserialize<'de> for OrmSchemaValType {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::from_serde_str(&value).map_err(serde::de::Error::custom)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmSchemaDataType {
    pub valType: OrmSchemaValType,
    /// Literals are treated as strings, as they are by oxigraph's Literal type.
    #[serde(default, deserialize_with = "deserialize_literals")]
    pub literals: Option<Vec<String>>,
    pub shape: Option<String>,
}
fn deserialize_literals<'de, D>(deserializer: D) -> Result<Option<Vec<String>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let values = Option::<Vec<serde_json::Value>>::deserialize(deserializer)?;

    values
        .map(|values| {
            values
                .into_iter()
                .map(|value| match value {
                    serde_json::Value::String(value) => Ok(value),
                    serde_json::Value::Number(value) => Ok(value.to_string()),
                    serde_json::Value::Bool(value) => Ok(value.to_string()),
                    other => Err(serde::de::Error::custom(format!(
                        "literal must be a string, number, or boolean: {other}"
                    ))),
                })
                .collect()
        })
        .transpose()
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

#[derive(PartialEq, Eq, Clone, Debug, Serialize, Deserialize, Copy)]
pub enum OrderDirection {
    #[serde(rename = "asc")]
    Ascending,
    #[serde(rename = "desc")]
    Descending,
}

pub type WhereConfig = serde_json::Value;
pub type SelectConfig = serde_json::Value;
pub type IsAscending = bool;

/// One hop of an order-by path: a predicate on a shape.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrderByHop {
    /// IRI of the shape the predicate belongs to (the root shape for hop 0).
    pub shape_iri: String,
    pub predicate_schema: Arc<OrmSchemaPredicate>,
}

/// One order-by term: a path from the root shape down to the literal to order by.
/// Comes from a serialization like `{ country: { capital: { inhabitants: "asc" }}}`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrderByTerm {
    pub path: Vec<OrderByHop>,
    pub direction: OrderDirection,
}

pub type OrderByConfig = Vec<OrderByTerm>;

impl OrderByTerm {
    pub fn leaf(&self) -> &OrderByHop {
        self.path.last().unwrap()
    }
    pub fn is_nested(&self) -> bool {
        self.path.len() > 1
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OrmConfig {
    pub where_: Option<WhereConfig>,
    pub order_by: Option<OrderByConfig>,
    pub select: Option<SelectConfig>,
    /// No paging == 0
    pub page_size: usize,
    /// Infinite == 0
    pub max_active_pages: usize,
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
            let root_shape = shape_type
                .schema
                .get(&shape_type.shape)
                .map(|arc| arc.as_ref())
                .ok_or_else(|| format!("Main shape not found in schema: {}", shape_type.shape))?;
            Some(parse_order_by(
                order_by_obj,
                root_shape,
                &shape_type.schema,
            )?)
        } else {
            None
        };

        let page_size = config_obj
            .get("pageSize")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        if page_size > 0 && order_by.is_none() {
            return Err("If page size is set and > 0, orderBy must be set too.".into());
        }
        let max_active_pages = config_obj
            .get("maxActivePages")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        Ok(OrmConfig {
            where_: config_obj.get("where").cloned(),
            order_by,
            select: config_obj.get("select").cloned(),
            page_size,
            max_active_pages,
        })
    }

    /// Returns Some(page_size * max_active_pages), if both are set, else None.
    pub fn max_allowed_items(&self) -> Option<usize> {
        if self.max_active_pages > 0 && self.page_size > 0 {
            Some(self.max_active_pages * self.page_size)
        } else {
            None
        }
    }
}

/// Parse the `orderBy` config of an ORM subscription into a flat list of order-by terms.
/// Mirrors the TS `OrderByConfig` type.
/// - `{ <propertyToOrderBy>: "asc" | "desc" }`
/// - `[{ <property>: "asc" }, { <property2>: "desc" }]`
/// - `{ <objectProperty>: { <nestedProperty>: "asc" } }`
/// - `{ <objectProperty>: [{ <nestedProperty1>: "asc" }, { <nestedProperty2>: "desc" }] }`
///
/// Each leaf produces one [`OrderByTerm`] whose path leads from the root shape down to
/// the predicate that holds the value to order by.
fn parse_order_by(
    order_by: &serde_json::Value,
    root_shape: &OrmSchemaShape,
    schema: &OrmSchema,
) -> Result<OrderByConfig, String> {
    let mut terms: OrderByConfig = Vec::new();
    parse_order_by_into(order_by, root_shape, schema, &mut Vec::new(), &mut terms)?;
    if terms.is_empty() {
        return Err("Order by config must contain at least one property.".into());
    }
    Ok(terms)
}

/// Recursively parse an `orderBy` value (a single-key object or an array of them) into `out`.
fn parse_order_by_into(
    order_by: &serde_json::Value,
    shape: &OrmSchemaShape,
    schema: &OrmSchema,
    prefix: &mut Vec<OrderByHop>,
    out: &mut OrderByConfig,
) -> Result<(), String> {
    match order_by {
        serde_json::Value::Object(obj) => parse_order_by_object(obj, shape, schema, prefix, out),
        serde_json::Value::Array(items) => {
            if items.is_empty() {
                return Err("Order by config array must not be empty.".into());
            }
            for item in items {
                let obj = item.as_object().ok_or_else(|| {
                    "Each item in order by config array must be an object.".to_string()
                })?;
                parse_order_by_object(obj, shape, schema, prefix, out)?;
            }
            Ok(())
        }
        _ => Err(format!(
            "When defined, order by config must be an object or an array of objects. Got: {:?}",
            order_by
        )),
    }
}

/// Parse a single-key order-by object: `{ <property>: "asc" | "desc" }` for a literal
/// property, or `{ <objectProperty>: <nested order-by config> }` for a nested object.
fn parse_order_by_object(
    obj: &serde_json::Map<String, serde_json::Value>,
    shape: &OrmSchemaShape,
    schema: &OrmSchema,
    prefix: &mut Vec<OrderByHop>,
    out: &mut OrderByConfig,
) -> Result<(), String> {
    if obj.len() != 1 {
        return Err(
            "Order by object must have exactly 1 property (key -> 'asc'|'desc')".to_string(),
        );
    }
    let (property_name, value) = obj.iter().next().unwrap();

    let predicate = shape
        .predicates
        .iter()
        .find(|p| p.readablePredicate == *property_name)
        .ok_or_else(|| format!("Predicate not found in orderBy config: {}", property_name))?;

    if predicate.dataTypes.len() != 1 {
        return Err(format!(
            "Predicate {property_name} must not have more than one allowed data type."
        ));
    }

    // Schema's cardinality must be 1, otherwise sorting is not possible.
    if predicate.minCardinality != 1 || predicate.maxCardinality != 1 {
        return Err(format!(
            "Orm config order by properties must have cardinality 1. Property '{}' has cardinality {}-{}.",
            property_name, predicate.minCardinality, predicate.maxCardinality
        ));
    }

    let hop = OrderByHop {
        shape_iri: shape.iri.clone(),
        predicate_schema: Arc::clone(predicate),
    };

    match value {
        serde_json::Value::String(dir) => {
            let direction = match dir.as_str() {
                "asc" => OrderDirection::Ascending,
                "desc" => OrderDirection::Descending,
                _ => return Err("Order by value must be 'asc' or 'desc'.".into()),
            };
            // Ensure that the datatype of this prop is a literal.
            if !predicate
                .dataTypes
                .iter()
                .any(|dt| dt.valType != OrmSchemaValType::shape)
            {
                return Err(format!(
                    "Order by property '{}' is a nested object. Specify one of its properties to order by.",
                    property_name
                ));
            }
            let mut path = prefix.clone();
            path.push(hop);
            // Push the final OrderByTerm pointing to the (possibly nested) predicate.
            out.push(OrderByTerm { path, direction });
            Ok(())
        }
        serde_json::Value::Object(_) | serde_json::Value::Array(_) => {
            // Nested: descend into the child shape.

            let child_shape_iri = predicate
                .dataTypes
                .iter()
                .find_map(|dt| dt.shape.clone())
                .ok_or_else(|| {
                    format!(
                        "Order by property '{}' is not a nested object. Use 'asc' or 'desc'.",
                        property_name
                    )
                })?;
            let child_shape = schema
                .get(&child_shape_iri)
                .map(|arc| arc.as_ref())
                .ok_or_else(|| {
                    format!(
                        "Shape '{}' of order by property '{}' not found in schema.",
                        child_shape_iri, property_name
                    )
                })?;

            // Push hop to prefix stack and recurse.
            prefix.push(hop);
            let result = parse_order_by_into(value, child_shape, schema, prefix, out);
            prefix.pop();
            result
        }
        _ => Err("Order by value must be 'asc' or 'desc'.".into()),
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

/// Heuristic:
/// Consider a string an IRI if it contains alphanumeric characters and then a colon within the first 13 characters.
/// Then consider the following characters invalid:\
/// // < > { } | \ <  ^ ` control-characters " blank-space
pub fn is_iri(s: &str) -> bool {
    lazy_static! {
        static ref IRI_REGEX: Regex =
            Regex::new(r#"^[A-Za-z][A-Za-z0-9+\.\-]{1,12}:[^<>"\{\}\|^`\\\x00-\x20]+\z"#).unwrap();
    }
    IRI_REGEX.is_match(s)
}
pub fn is_lang_tag(s: &str) -> bool {
    lazy_static! {
        static ref IRI_REGEX: Regex =
            Regex::new(r#"^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*\z"#).unwrap();
    }
    IRI_REGEX.is_match(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_absolute_iris() {
        assert!(is_iri("https://xn--xmpl-loa2at.org"));
        assert!(is_iri("urn:isbn:0451450523"));
        assert!(is_iri("did:ng:z:foo"));
        assert!(is_iri("mailto:告"));
        assert!(is_iri("file:///C:/Users/file.txt"));
    }

    #[test]
    fn test_invalid_escaped_characters() {
        // Contains forbidden characters (<, >, ")
        assert!(!is_iri("https://example.org<with>brackets"));
        assert!(!is_iri("https://example.org?query=\"quotes\""));

        // Contains other unsafe characters (spaces, backslashes, carets)
        assert!(!is_iri("https://example.org with spaces"));
        assert!(!is_iri(r"https://example.org\(\backslash\)"));
        assert!(!is_iri("https://example.org^caret"));
    }

    #[test]
    fn test_invalid_relative_paths() {
        assert!(!is_iri("/just/a/relative/path"));
        assert!(!is_iri("example.org/path"));
    }

    #[test]
    fn test_valid_lang_tags() {
        assert!(is_lang_tag("En-gb0-as"));
        assert!(is_lang_tag("de"));
        assert!(is_lang_tag("DE"));
        assert!(is_lang_tag("D-a-a-e-5-d"));
    }

    #[test]
    fn test_invalid_lang_tags() {
        assert!(!is_lang_tag("0e-3"));
        assert!(!is_lang_tag("-d"));
        assert!(!is_lang_tag("s--d"));
    }

    // ===== orderBy parsing =====

    fn mk_pred(
        iri: &str,
        readable: &str,
        min: i32,
        max: i32,
        data_types: Vec<OrmSchemaDataType>,
    ) -> Arc<OrmSchemaPredicate> {
        Arc::new(OrmSchemaPredicate {
            iri: iri.to_string(),
            readablePredicate: readable.to_string(),
            minCardinality: min,
            maxCardinality: max,
            extra: Some(false),
            dataTypes: data_types,
        })
    }

    fn literal_dt(val_type: OrmSchemaValType) -> OrmSchemaDataType {
        OrmSchemaDataType {
            valType: val_type,
            literals: None,
            shape: None,
        }
    }

    fn shape_dt(shape_iri: &str) -> OrmSchemaDataType {
        OrmSchemaDataType {
            valType: OrmSchemaValType::shape,
            literals: None,
            shape: Some(shape_iri.to_string()),
        }
    }

    /// Root shape with a literal `name`, a nested `capital` (CityShape) and a
    /// multi-valued `inhabitants` (PersonShape).
    fn mk_schema() -> OrmShapeType {
        let city_shape = Arc::new(OrmSchemaShape {
            iri: "urn:CityShape".to_string(),
            is_closed: false,
            predicates: vec![
                mk_pred(
                    "urn:population",
                    "population",
                    1,
                    1,
                    vec![literal_dt(OrmSchemaValType::decimal)],
                ),
                mk_pred(
                    "urn:cityName",
                    "name",
                    1,
                    1,
                    vec![literal_dt(OrmSchemaValType::string)],
                ),
            ],
        });

        let person_shape = Arc::new(OrmSchemaShape {
            iri: "urn:PersonShape".to_string(),
            is_closed: false,
            predicates: vec![mk_pred(
                "urn:personName",
                "name",
                1,
                1,
                vec![literal_dt(OrmSchemaValType::string)],
            )],
        });

        let root_shape = Arc::new(OrmSchemaShape {
            iri: "urn:CountryShape".to_string(),
            is_closed: false,
            predicates: vec![
                mk_pred(
                    "urn:name",
                    "name",
                    1,
                    1,
                    vec![literal_dt(OrmSchemaValType::string)],
                ),
                mk_pred(
                    "urn:capital",
                    "capital",
                    1,
                    1,
                    vec![shape_dt("urn:CityShape")],
                ),
                mk_pred(
                    "urn:inhabitants",
                    "inhabitants",
                    0,
                    -1,
                    vec![shape_dt("urn:PersonShape")],
                ),
            ],
        });

        let mut schema: OrmSchema = HashMap::new();
        schema.insert("urn:CountryShape".to_string(), root_shape);
        schema.insert("urn:CityShape".to_string(), city_shape);
        schema.insert("urn:PersonShape".to_string(), person_shape);

        OrmShapeType {
            schema,
            shape: "urn:CountryShape".to_string(),
        }
    }

    fn parse(order_by: serde_json::Value) -> Result<OrderByConfig, String> {
        let shape_type = mk_schema();
        let root = shape_type.schema.get(&shape_type.shape).unwrap().clone();
        parse_order_by(&order_by, &root, &shape_type.schema)
    }

    #[test]
    fn test_parse_order_by_flat_object() {
        let terms = parse(serde_json::json!({ "name": "asc" })).unwrap();
        assert_eq!(terms.len(), 1);
        assert_eq!(terms[0].path.len(), 1);
        assert_eq!(terms[0].path[0].shape_iri, "urn:CountryShape");
        assert_eq!(terms[0].path[0].predicate_schema.iri, "urn:name");
        assert_eq!(terms[0].direction, OrderDirection::Ascending);
        assert!(!terms[0].is_nested());
    }

    #[test]
    fn test_parse_order_by_flat_array() {
        let terms =
            parse(serde_json::json!([{ "name": "asc" }, { "capital": { "population": "desc" } }]))
                .unwrap();
        assert_eq!(terms.len(), 2);
        assert_eq!(terms[0].direction, OrderDirection::Ascending);
        assert_eq!(terms[1].direction, OrderDirection::Descending);
        assert!(terms[1].is_nested());
    }

    #[test]
    fn test_parse_order_by_nested_object() {
        let terms = parse(serde_json::json!({ "capital": { "population": "desc" } })).unwrap();
        assert_eq!(terms.len(), 1);
        let term = &terms[0];
        assert_eq!(term.path.len(), 2);
        assert_eq!(term.path[0].shape_iri, "urn:CountryShape");
        assert_eq!(term.path[0].predicate_schema.iri, "urn:capital");
        assert_eq!(term.path[1].shape_iri, "urn:CityShape");
        assert_eq!(term.path[1].predicate_schema.iri, "urn:population");
        assert_eq!(term.direction, OrderDirection::Descending);
        assert_eq!(term.leaf().predicate_schema.iri, "urn:population");
    }

    #[test]
    fn test_parse_order_by_nested_array_yields_shared_prefix() {
        let terms = parse(serde_json::json!({
            "capital": [{ "population": "desc" }, { "name": "asc" }]
        }))
        .unwrap();
        assert_eq!(terms.len(), 2);
        // Both terms share the same first hop.
        assert_eq!(terms[0].path[0].predicate_schema.iri, "urn:capital");
        assert_eq!(terms[1].path[0].predicate_schema.iri, "urn:capital");
        assert_eq!(terms[0].path[1].predicate_schema.iri, "urn:population");
        assert_eq!(terms[1].path[1].predicate_schema.iri, "urn:cityName");
    }

    #[test]
    fn test_parse_order_by_rejects_unknown_property() {
        let err = parse(serde_json::json!({ "nope": "asc" })).unwrap_err();
        assert!(err.contains("Predicate not found"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_non_single_cardinality() {
        // `inhabitants` is multi-valued.
        let err = parse(serde_json::json!({ "inhabitants": "asc" })).unwrap_err();
        assert!(err.contains("cardinality 1"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_direction_on_object_property() {
        let err = parse(serde_json::json!({ "capital": "asc" })).unwrap_err();
        assert!(err.contains("nested object"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_nested_config_on_literal_property() {
        let err = parse(serde_json::json!({ "name": { "foo": "asc" } })).unwrap_err();
        assert!(err.contains("not a nested object"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_invalid_direction() {
        let err = parse(serde_json::json!({ "name": "upwards" })).unwrap_err();
        assert!(err.contains("'asc' or 'desc'"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_multi_key_object() {
        let err = parse(serde_json::json!({ "name": "asc", "capital": "desc" })).unwrap_err();
        assert!(err.contains("exactly 1 property"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_empty_array() {
        let err = parse(serde_json::json!([])).unwrap_err();
        assert!(err.contains("must not be empty"), "got: {err}");
    }

    #[test]
    fn test_parse_order_by_rejects_non_object() {
        let err = parse(serde_json::json!("name")).unwrap_err();
        assert!(err.contains("object or an array"), "got: {err}");
    }

    #[test]
    fn test_from_json_requires_order_by_for_page_size() {
        let shape_type = mk_schema();
        let err =
            OrmConfig::from_json(&serde_json::json!({ "pageSize": 10 }), &shape_type).unwrap_err();
        assert!(err.contains("orderBy must be set"), "got: {err}");
    }

    #[test]
    fn test_from_json_parses_nested_order_by() {
        let shape_type = mk_schema();
        let config = OrmConfig::from_json(
            &serde_json::json!({
                "orderBy": { "capital": { "population": "desc" } },
                "pageSize": 5
            }),
            &shape_type,
        )
        .unwrap();
        let order_by = config.order_by.unwrap();
        assert_eq!(order_by.len(), 1);
        assert_eq!(order_by[0].path.len(), 2);
        assert_eq!(config.page_size, 5);
    }

    #[test]
    fn test_from_json_rejects_unknown_root_shape() {
        let mut shape_type = mk_schema();
        shape_type.shape = "urn:MissingShape".to_string();
        let err = OrmConfig::from_json(
            &serde_json::json!({ "orderBy": { "name": "asc" } }),
            &shape_type,
        )
        .unwrap_err();
        assert!(err.contains("Main shape not found"), "got: {err}");
    }
}
