// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

use ng_oxigraph::oxrdf::{GraphName, Literal, NamedNode, Quad, Subject, Term};
use ng_oxigraph::oxsdatatypes::{Decimal, Double, Float};
use ng_repo::types::OverlayId;
use serde_json::json;

use std::collections::HashMap;

pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{
    app_protocol::*,
    orm::{
        is_iri, is_lang_tag, OrderByConfig, OrderByHop, OrderDirection, OrmSchemaPredicate,
        OrmSchemaValType,
    },
};

use std::str::FromStr;
use std::sync::{Arc, RwLock};

use crate::orm::graph::types::{
    find_first_numeric_type_opt, OrderKey, TrackedOrmObject, TrackedOrmObjectValidity,
};

pub type GraphSubjectKey = (String, String);

/// Normalize an xsd:decimal lexical form for ORM use.
///
/// RDF term equality is lexical, but the ORM exposes numeric values and must not
/// represent equivalent decimal spellings as separate values. Integral decimals
/// retain a fractional part so the ORM's canonical form is `0.0`, not `0`.
pub fn canonical_decimal_lexical(value: &str) -> Option<String> {
    let canonical = Decimal::from_str(value).ok()?.to_string();
    Some(with_fractional_part(canonical))
}

fn with_fractional_part(value: String) -> String {
    if matches!(value.as_str(), "INF" | "-INF" | "NaN")
        || value.contains('.')
        || value.contains('e')
        || value.contains('E')
    {
        value
    } else {
        format!("{value}.0")
    }
}

/// Canonicalize a floating point number string.
pub fn canonical_floating_lexical(value: &str, datatype: &str) -> Option<String> {
    match datatype {
        "http://www.w3.org/2001/XMLSchema#float" => {
            let parsed = Float::from_str(value).ok()?;
            // Check 0 explicitly because -1.0 has numeric but no string equality.
            if f32::from(parsed) == 0.0 {
                Some("0.0".to_string())
            } else {
                Some(with_fractional_part(parsed.to_string()))
            }
        }
        "http://www.w3.org/2001/XMLSchema#double" => {
            let parsed = Double::from_str(value).ok()?;
            // Check 0 explicitly because -1.0 has numeric but no string equality.
            if f64::from(parsed) == 0.0 {
                Some("0.0".to_string())
            } else {
                Some(with_fractional_part(parsed.to_string()))
            }
        }
        "number" | "http://www.w3.org/2001/XMLSchema#decimal" => canonical_decimal_lexical(value),
        _ => None,
    }
}

/// Canonicalize decimal literals while preserving every other RDF term exactly.
pub fn canonicalize_number_term(term: &Term) -> Term {
    let Term::Literal(literal) = term else {
        return term.clone();
    };
    let datatype = literal.datatype().as_str();
    let value = canonical_floating_lexical(literal.value(), datatype);
    let Some(value) = value else {
        return term.clone();
    };
    Term::Literal(Literal::new_typed_literal(
        value,
        literal.datatype().into_owned(),
    ))
}

pub fn canonicalize_quad(quad: &Quad) -> Quad {
    Quad {
        subject: quad.subject.clone(),
        predicate: quad.predicate.clone(),
        object: canonicalize_number_term(&quad.object),
        graph_name: quad.graph_name.clone(),
    }
}

/// The graph IRI a quad belongs to.
pub fn graph_iri_of_quad(quad: &Quad) -> &str {
    match &quad.graph_name {
        GraphName::NamedNode(n) => n.as_str(),
        _ => unreachable!(),
    }
}

/// The subject IRI of a quad.
pub fn subject_iri_of_quad(quad: &Quad) -> &str {
    match &quad.subject {
        Subject::NamedNode(n) => n.as_str(),
        _ => unreachable!(),
    }
}

/// (graph, subject) tuple of a quad.
pub fn quad_graph_subject(quad: &Quad) -> (&str, &str) {
    let graph = match &quad.graph_name {
        GraphName::NamedNode(g) => g.as_str(),
        _ => unreachable!(),
    };
    let subject = match &quad.subject {
        Subject::NamedNode(s) => s.as_str(),
        _ => unreachable!(),
    };
    (graph, subject)
}

pub fn group_by_graph_and_subject(quads: &[Quad]) -> HashMap<GraphSubjectKey, Vec<Quad>> {
    // Collect all in quads in a hashmap of (graph_iri, subject_iri) => Quad[]
    let mut quads_by_key: HashMap<GraphSubjectKey, Vec<Quad>> = HashMap::new();

    for quad in quads {
        // Get graph string
        let graph = match &quad.graph_name {
            GraphName::NamedNode(n) => n.clone().into_string(),
            _ => continue,
        };
        // Get subject string
        let subj = match &quad.subject {
            Subject::NamedNode(n) => n.clone().into_string(),
            _ => continue,
        };

        let grouped = quads_by_key.entry((graph, subj)).or_insert_with(Vec::new);
        if !grouped.contains(&quad) {
            grouped.push(quad.clone());
        }
    }

    return quads_by_key;
}

pub fn nuri_to_string(nuri: &NuriV0) -> String {
    // Get repo_id and overlay_id from the nuri
    match nuri.target {
        NuriTargetV0::UserSite => "did:ng:i".to_string(),
        _ => {
            let repo_id = nuri.target.repo_id();
            let overlay_id = if let Some(overlay_link) = &nuri.overlay {
                overlay_link.clone().try_into().unwrap()
            } else {
                // Default overlay for the repo
                OverlayId::outer(repo_id)
            };
            let graph_name = NuriV0::repo_graph_name(repo_id, &overlay_id);
            graph_name
        }
    }
}

/// SPARQL literal escape: https://www.w3.org/TR/sparql11-query/#grammarEscapes
pub fn escape_sparql_string(lit: &str) -> String {
    let mut out = String::with_capacity(lit.len() + 4);
    for c in lit.chars() {
        match c {
            '\t' => out.push_str("\\t"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\u{08}' => out.push_str("\\b"), // Backspace
            '\u{0C}' => out.push_str("\\f"), // Form feed
            '\"' => out.push_str("\\\""),
            '\'' => out.push_str("\\'"),
            '\\' => out.push_str("\\\\"),
            _ => out.push(c),
        }
    }
    return out;
}

/// Convert basic terms to literal json values (number, string, boolean).
/// For dateTime, returns object with `|type` and `value` prop.
/// For everything else, the term's value string.
pub fn term_to_json(val: &Term) -> serde_json::Value {
    match val {
        Term::NamedNode(node) => json!(node.as_str()),
        Term::Literal(literal) => match literal.datatype().as_str() {
            // Check for string first, this is the most common.
            "http://www.w3.org/2001/XMLSchema#string" => {
                if let Some(_lang) = literal.language() {
                    json!(literal.value())

                    // // TODO:
                    // // Alternative: Format language strings as objects (not currently used anywhere).
                    // json!({
                    //     "|type": "string",
                    //     "|lang": lang,
                    //     "value": literal.value()
                    // })
                } else {
                    json!(literal.value())
                }
            }
            "http://www.w3.org/2001/XMLSchema#boolean" => match literal.value().parse::<bool>() {
                Ok(b) => json!(b),
                Err(_) => json!(literal.value()),
            },
            "http://www.w3.org/2001/XMLSchema#integer"
            | "http://www.w3.org/2001/XMLSchema#decimal"
            | "http://www.w3.org/2001/XMLSchema#double"
            | "http://www.w3.org/2001/XMLSchema#float"
            | "http://www.w3.org/2001/XMLSchema#int"
            | "http://www.w3.org/2001/XMLSchema#long"
            | "http://www.w3.org/2001/XMLSchema#short"
            | "http://www.w3.org/2001/XMLSchema#byte"
            | "http://www.w3.org/2001/XMLSchema#unsignedInt"
            | "http://www.w3.org/2001/XMLSchema#unsignedLong"
            | "http://www.w3.org/2001/XMLSchema#unsignedShort"
            | "http://www.w3.org/2001/XMLSchema#unsignedByte" => {
                match literal.value().parse::<f64>() {
                    Ok(n) => json!(n),
                    Err(_) => json!(literal.value()),
                }
            }
            "http://www.w3.org/2001/XMLSchema#dateTime" => {
                json!({
                    "|type": "dateTime",
                    "value": literal.value()
                })
            }
            _ => {
                // Format types not representable in JSON as string
                // Alternative: object with "|type" property.
                return json!(literal.value());
                // // If it's an xsd, only serialize hash fragment.
                // let type_str = {
                //     if literal
                //         .datatype()
                //         .as_str()
                //         .starts_with("http://www.w3.org/2001/XMLSchema#")
                //     {
                //         &literal.datatype().as_str()[33..]
                //     } else {
                //         literal.datatype().as_str()
                //     }
                // };

                // // json!({
                // //     "|type": type_str,
                // //     "value": literal.value()
                // // })
            }
        },
        _ => unreachable!(),
    }
}

pub fn json_to_sparql_val(
    json: &serde_json::Value,
    predicate_schema: &OrmSchemaPredicate,
) -> Result<String, String> {
    match json {
        serde_json::Value::Array(arr) => {
            if !predicate_schema.is_multi() {
                Err("Schema does not allow multiple values".into())
            } else {
                let results: Result<Vec<String>, String> = arr
                    .iter()
                    .map(|val| json_to_sparql_val(val, predicate_schema))
                    .collect();
                results.map(|vec| vec.join(", "))
            }
        }
        serde_json::Value::Bool(bool) => {
            let schema_has_num = predicate_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::boolean);
            if !schema_has_num {
                Err("Schema does not allow booleans".into())
            } else {
                match bool {
                    true => Ok("true".to_string()),
                    false => Ok("false".to_string()),
                }
            }
        }
        serde_json::Value::Number(num) => {
            let numeric_schema = find_first_numeric_type_opt(&predicate_schema.dataTypes);
            if let Some(vt) = numeric_schema {
                let value = match vt {
                    OrmSchemaValType::number
                    | OrmSchemaValType::decimal
                    | OrmSchemaValType::float
                    | OrmSchemaValType::double => {
                        canonical_floating_lexical(&num.to_string(), vt.as_str())
                    }
                    _ => Some(num.to_string()),
                }
                .ok_or_else(|| "Invalid numeric value".to_string())?;
                Ok(format!("\"{}\"^^<{}>", value, vt.as_str()))
            } else {
                Err("Schema does not allow numbers".into())
            }
        }
        serde_json::Value::String(val) => {
            let schema_has_string = predicate_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::string);
            let schema_has_iri = predicate_schema
                .dataTypes
                .iter()
                .any(|dt| dt.valType == OrmSchemaValType::iri);

            if !schema_has_string && !schema_has_iri {
                return Err("Schema does not allow strings".into());
            }

            let val_is_iri = is_iri(val);

            if val_is_iri && schema_has_iri {
                Ok(format!("<{}>", val))
            } else if schema_has_string {
                Ok(format!("\"{}\"", escape_sparql_string(val)))
            } else {
                Err("Value is not an IRI".into())
            }
        }
        serde_json::Value::Object(obj) => {
            match (
                obj.get("|type").and_then(|v| v.as_str()),
                obj.get("|lang").and_then(|v| v.as_str()),
                obj.get("value").and_then(|v| v.as_str()),
            ) {
                (Some(typ), None, Some(val)) => {
                    let val_type = OrmSchemaValType::from_serde_str(typ);
                    match val_type {
                        Ok(typ) => Ok(format!(
                            "\"{}\"^^<{}>",
                            escape_sparql_string(val),
                            typ.as_str()
                        )),
                        Err(e) => Err(format!("Cannot parse datatype: {}", e)),
                    }
                }
                (Some(typ), Some(lang), Some(val)) => {
                    if typ == "string" {
                        if is_lang_tag(lang) {
                            Ok(format!("\"{}\"@{}", escape_sparql_string(val), lang))
                        } else {
                            Err("Cannot parse language string type. `|lang` is not a valid language tag.".into())
                        }
                    } else {
                        Err("Cannot parse language string type. `|type` must be `string`.".into())
                    }
                }
                _ => Err("Cannot parse object as RDF value.".into()),
            }
        }
        _ => Err(format!("Cannot parse value to SPARQL: {:?}", json)),
    }
}

// ===== Child assessment heuristic =====

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HeuristicUsed {
    All,
    SameGraph,
    SubjectPrefix,
    FallbackAll,
}

#[derive(Clone, Debug, Default)]
pub struct ValidityCounts {
    pub valid: usize,
    pub invalid: usize,
    pub pending: usize,
    pub untracked: usize,
}

#[derive(Clone, Debug)]
pub struct AssessmentResult {
    pub considered: Vec<Arc<RwLock<TrackedOrmObject>>>,
    pub heuristic_used: HeuristicUsed,
    pub counts: ValidityCounts,
    pub satisfies: bool, // whether this selection satisfies min/max cardinality
    /// Children detached from the subscription, which a reference may revive.
    pub children_untracked: Vec<Arc<RwLock<TrackedOrmObject>>>,
    /// Children whose validity has not been settled yet.
    pub children_pending: Vec<Arc<RwLock<TrackedOrmObject>>>,
}

fn bucket_counts(children: &[Arc<RwLock<TrackedOrmObject>>]) -> ValidityCounts {
    let mut c = ValidityCounts::default();
    for child in children {
        match child.read().unwrap().valid {
            TrackedOrmObjectValidity::Valid => c.valid += 1,
            TrackedOrmObjectValidity::Invalid => c.invalid += 1,
            TrackedOrmObjectValidity::Pending => c.pending += 1,
            TrackedOrmObjectValidity::Untracked => c.untracked += 1,
            TrackedOrmObjectValidity::ToDelete => c.invalid += 1,
        }
    }
    c
}

fn rank_by_validity_stable(
    children: Vec<Arc<RwLock<TrackedOrmObject>>>,
) -> Vec<Arc<RwLock<TrackedOrmObject>>> {
    let mut valid: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut pending: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut untracked: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut invalid: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    for c in children {
        match c.read().unwrap().valid {
            TrackedOrmObjectValidity::Valid => valid.push(c.clone()),
            TrackedOrmObjectValidity::Pending => pending.push(c.clone()),
            TrackedOrmObjectValidity::Untracked => untracked.push(c.clone()),
            TrackedOrmObjectValidity::Invalid | TrackedOrmObjectValidity::ToDelete => {
                invalid.push(c.clone())
            }
        }
    }
    let mut out = Vec::with_capacity(valid.len() + pending.len() + untracked.len() + invalid.len());
    out.extend(valid);
    out.extend(pending);
    out.extend(untracked);
    out.extend(invalid);
    out
}

/// Assess and rank children for a predicate, determining which bucket (same-graph, subject-prefix, or all)
/// satisfies cardinality constraints or has potential to satisfy them (via pending/untracked children).
/// Returns the considered children from the selected bucket along with scheduling information for
/// children that need fetching or re-evaluation.
pub fn assess_and_rank_children(
    parent_graph_iri: &str,
    _parent_subject_iri: &str,
    min_cardinality: i32,
    max_cardinality: i32,
    children: &[Arc<RwLock<TrackedOrmObject>>],
) -> AssessmentResult {
    // Build candidate sets
    let mut same_graph: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut subject_prefix: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut all: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();

    for c in children.iter() {
        let g = c.read().unwrap().graph_iri.clone();
        let s = c.read().unwrap().subject_iri.clone();
        if g == parent_graph_iri {
            same_graph.push(c.clone());
        }
        // "Authoritative" child graphs: the child's subject IRI starts with ITS OWN graph IRI
        // (not the parent's graph). This scopes by subject->graph prefix relationship.
        if s.starts_with(&g) {
            subject_prefix.push(c.clone());
        }
        all.push(c.clone());
    }

    // Helper to construct result for a bucket with cardinality evaluation and child scheduling
    let make_res = |bucket: Vec<Arc<RwLock<TrackedOrmObject>>>, which: HeuristicUsed| {
        let ranked = rank_by_validity_stable(bucket);
        let counts = bucket_counts(&ranked);

        // Cardinality satisfaction should consider Valid children.
        let valid_total = counts.valid as i32;
        let within_min = valid_total >= min_cardinality;
        let within_max = max_cardinality == -1 || valid_total <= max_cardinality;
        let satisfies = within_min && within_max;

        // Split out the children that are not settled yet. Untracked means the child was
        // detached from the subscription.
        let mut children_untracked = Vec::new();
        let mut children_pending = Vec::new();

        for child in ranked.iter() {
            let child_guard = child.read().unwrap();
            match child_guard.valid {
                TrackedOrmObjectValidity::Untracked => {
                    children_untracked.push(child.clone());
                }
                TrackedOrmObjectValidity::Pending => {
                    children_pending.push(child.clone());
                }
                _ => {}
            }
        }

        AssessmentResult {
            considered: ranked,
            heuristic_used: which,
            counts,
            satisfies,
            children_untracked,
            children_pending,
        }
    };

    // Prefer same-graph, then subject-prefix, then all
    // Return early if a bucket satisfies OR has potential (pending/untracked children)
    if !same_graph.is_empty() {
        let res = make_res(same_graph, HeuristicUsed::SameGraph);
        if res.satisfies || !res.children_untracked.is_empty() || !res.children_pending.is_empty() {
            return res;
        }
    }
    if !subject_prefix.is_empty() {
        let res = make_res(subject_prefix, HeuristicUsed::SubjectPrefix);
        if res.satisfies || !res.children_untracked.is_empty() || !res.children_pending.is_empty() {
            return res;
        }
    }
    make_res(all, HeuristicUsed::All)
}

/// Resolve the tormo that a hop's predicate points to.
///
/// Uses the same preference order as validation (`assess_and_rank_children`), so the
/// value we order by is the one the ORM considers the valid child for that predicate.
fn resolve_child_for_hop(
    parent: &TrackedOrmObject,
    hop: &OrderByHop,
) -> Option<Arc<RwLock<TrackedOrmObject>>> {
    // Collect the children first (to release predicate guard again after).
    let children: Vec<Arc<RwLock<TrackedOrmObject>>> = {
        let tracked_pred = parent
            .tracked_predicates
            .get(&hop.predicate_schema.iri)?
            .read()
            .ok()?;
        tracked_pred.live_children()
    };

    if children.is_empty() {
        return None;
    }

    let assessed = assess_and_rank_children(
        &parent.graph_iri,
        &parent.subject_iri,
        hop.predicate_schema.minCardinality,
        hop.predicate_schema.maxCardinality,
        &children,
    );

    // Get the first (and only) considered (for the chosen heuristic).
    assessed.considered.first().cloned()
}

/// Walk an order-by path from `tormo` down to the value to order by.
///
/// Intermediate hops descend into the child the predicate points to; the leaf hop
/// reads the literal from the tracked predicate. Returns `None` if any hop cannot be
/// resolved (missing predicate, no child, or no value), in which case the term
/// contributes no key component.
fn order_value_for_path(path: &[OrderByHop], tormo: &TrackedOrmObject) -> Option<Term> {
    let (hop, remaining) = path.split_first()?;

    if remaining.is_empty() {
        // Leaf hop: the predicate holds the value to order by.
        let tracked_pred = tormo.tracked_predicates.get(&hop.predicate_schema.iri)?;
        let tracked_pred = tracked_pred.read().ok()?;
        return tracked_pred.current_literals.as_ref()?.first().cloned();
    }

    // Intermediate hop: descend into the child this predicate points to.
    let child = resolve_child_for_hop(tormo, hop)?;
    let child_guard = child.read().ok()?;
    order_value_for_path(remaining, &child_guard)
}

/// Create an order key consisting of the values to order by and the graph and subject iris of the tormo as secondary indexes.
pub(crate) fn order_key_from(
    order_by_conf: &OrderByConfig,
    tormo: &TrackedOrmObject,
) -> Option<OrderKey> {
    let vals = order_by_conf
        .iter()
        .map(|order_by_term| {
            Some((
                order_value_for_path(&order_by_term.path, tormo)?,
                order_by_term.direction,
            ))
        })
        .collect::<Option<Vec<_>>>()?
        .into_iter()
        .chain([
            (
                Term::from(NamedNode::new_unchecked(tormo.graph_iri.clone())),
                OrderDirection::Ascending,
            ),
            (
                Term::from(NamedNode::new_unchecked(tormo.subject_iri.clone())),
                OrderDirection::Ascending,
            ),
        ])
        .collect();

    Some(OrderKey { val_types: vals })
}

#[cfg(test)]
mod tests {
    use super::*;
    use ng_net::orm::{OrmSchemaDataType, OrmSchemaPredicate, OrmSchemaShape, OrmSchemaValType};

    fn mk_shape(iri: &str) -> Arc<OrmSchemaShape> {
        Arc::new(OrmSchemaShape {
            iri: iri.to_string(),
            predicates: vec![],
            is_closed: false,
        })
    }

    #[test]
    fn decimal_lexical_forms_use_the_orm_canonical_form() {
        assert_eq!(canonical_decimal_lexical("0"), Some("0.0".to_string()));
        assert_eq!(canonical_decimal_lexical("0.0"), Some("0.0".to_string()));
        assert_eq!(canonical_decimal_lexical("01.200"), Some("1.2".to_string()));
        assert_eq!(canonical_decimal_lexical("-0"), Some("0.0".to_string()));
    }

    #[test]
    fn floating_lexical_forms_use_the_orm_canonical_form() {
        let float = "http://www.w3.org/2001/XMLSchema#float";
        let double = "http://www.w3.org/2001/XMLSchema#double";

        assert_eq!(
            canonical_floating_lexical("0", float),
            Some("0.0".to_string())
        );
        assert_eq!(
            canonical_floating_lexical("-0.0", double),
            Some("0.0".to_string())
        );
        assert_eq!(
            canonical_floating_lexical("1e2", double),
            Some("100.0".to_string())
        );
        assert_eq!(
            canonical_floating_lexical("INF", float),
            Some("INF".to_string())
        );
    }

    fn mk_child(
        subject: &str,
        graph: &str,
        shape: Arc<OrmSchemaShape>,
        valid: TrackedOrmObjectValidity,
    ) -> Arc<RwLock<TrackedOrmObject>> {
        Arc::new(RwLock::new(TrackedOrmObject {
            tracked_predicates: HashMap::new(),
            parents: vec![],
            valid,
            subject_iri: subject.to_string(),
            graph_iri: graph.to_string(),
            shape: Arc::downgrade(&shape),
            is_complete: false,
            excess_quads: 0,
        }))
    }

    #[test]
    fn test_assess_non_multi_same_graph_priority() {
        let parent_graph = "urn:graph:1";
        let parent_subj = "urn:parent:1";
        let shape = mk_shape("urn:shape");
        let pred_schema = OrmSchemaPredicate {
            iri: "urn:pred".to_string(),
            readablePredicate: "pred".to_string(),
            minCardinality: 1,
            maxCardinality: 1,
            extra: Some(false),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::shape,
                shape: Some("urn:shape".to_string()),
                literals: None,
            }],
        };

        // Children: one same-graph Pending, one different graph Valid, one prefix match Valid
        let child_same_graph_pending = mk_child(
            "urn:child:sg",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Pending,
        );
        let child_diff_graph_valid = mk_child(
            "urn:child:dg",
            "urn:graph:2",
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );
        let child_prefix_valid = mk_child(
            &format!("{}:x", parent_graph),
            "urn:graph:3",
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );

        let children = vec![
            child_diff_graph_valid.clone(),
            child_same_graph_pending.clone(),
            child_prefix_valid.clone(),
        ];

        let res = assess_and_rank_children(
            parent_graph,
            parent_subj,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &children,
        );
        // same-graph bucket chosen first; has pending child so should be considered
        assert_eq!(res.heuristic_used, HeuristicUsed::SameGraph);
        assert_eq!(res.counts.pending, 1);
        assert_eq!(res.children_pending.len(), 1);
    }

    #[test]
    fn test_assess_non_multi_subject_prefix_priority() {
        let parent_graph = "urn:g";
        let parent_subj = "urn:parent";
        let shape = mk_shape("urn:shape");
        let pred_schema = OrmSchemaPredicate {
            iri: "urn:pred".to_string(),
            readablePredicate: "pred".to_string(),
            minCardinality: 1,
            maxCardinality: 1,
            extra: Some(false),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::shape,
                shape: Some("urn:shape".to_string()),
                literals: None,
            }],
        };
        // Child whose subject starts with its own graph IRI qualifies as SubjectPrefix
        let child_prefix_valid = mk_child(
            "urn:gx:child",
            "urn:gx",
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );
        let child_other_valid = mk_child(
            "urn:other",
            "urn:graph:y",
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );
        let res = assess_and_rank_children(
            parent_graph,
            parent_subj,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &[child_other_valid.clone(), child_prefix_valid.clone()],
        );
        assert_eq!(res.heuristic_used, HeuristicUsed::SubjectPrefix);
        assert!(res.satisfies);
        // First in ranked order should be the valid prefix child
        let first = res.considered.first().unwrap().read().unwrap();
        assert_eq!(first.subject_iri, "urn:gx:child");
    }

    #[test]
    fn test_cardinality_uses_valid_counts() {
        let parent_graph = "urn:graph";
        let parent_subj = "urn:parent";
        let shape = mk_shape("urn:shape");
        let pred_schema = OrmSchemaPredicate {
            iri: "urn:pred".to_string(),
            readablePredicate: "pred".to_string(),
            minCardinality: 1,
            maxCardinality: 1,
            extra: Some(false),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::shape,
                shape: Some("urn:shape".to_string()),
                literals: None,
            }],
        };
        let valid_child = mk_child(
            "urn:s:1",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );
        let pending_child = mk_child(
            "urn:s:2",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Pending,
        );
        let res = assess_and_rank_children(
            parent_graph,
            parent_subj,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &[pending_child.clone(), valid_child.clone()],
        );
        // Even though total=2, valid=1 satisfies min=1,max=1
        assert!(res.satisfies);
        assert_eq!(res.counts.valid, 1);
        assert_eq!(res.counts.pending, 1);
    }

    #[test]
    fn test_assess_multi_all_children_ranked() {
        let parent_graph = "urn:graph";
        let parent_subj = "urn:parent";
        let shape = mk_shape("urn:s");
        let pred_schema = OrmSchemaPredicate {
            iri: "urn:pred".to_string(),
            readablePredicate: "pred".to_string(),
            minCardinality: 0,
            maxCardinality: -1,
            extra: Some(true),
            dataTypes: vec![OrmSchemaDataType {
                valType: OrmSchemaValType::shape,
                shape: Some("urn:s".to_string()),
                literals: None,
            }],
        };
        let v = mk_child(
            "v",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Valid,
        );
        let p = mk_child(
            "p",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Pending,
        );
        let u = mk_child(
            "u",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Untracked,
        );
        let i = mk_child(
            "i",
            parent_graph,
            shape.clone(),
            TrackedOrmObjectValidity::Invalid,
        );
        let res = assess_and_rank_children(
            parent_graph,
            parent_subj,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &[p.clone(), i.clone(), v.clone(), u.clone()],
        );
        // Order should be Valid, Pending, Untracked, Invalid
        let order: Vec<String> = res
            .considered
            .iter()
            .map(|c| c.read().unwrap().subject_iri.clone())
            .collect();
        assert_eq!(order, vec!["v", "p", "u", "i"]);
        assert_eq!(res.children_untracked.len(), 1); // untracked child
        assert_eq!(res.children_pending.len(), 1); // pending child
    }
}
