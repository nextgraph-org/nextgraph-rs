// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_oxigraph::oxrdf::{GraphName, Quad, Subject};
use ng_repo::types::OverlayId;

use std::collections::HashMap;
use std::collections::HashSet;

use lazy_static::lazy_static;
use regex::Regex;

pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};

use crate::orm::types::{SubjectIri, TrackedOrmObject, TrackedOrmObjectValidity};
use ng_net::orm::OrmSchemaPredicate;
use std::sync::{Arc, RwLock};
// use ng_oxigraph::oxrdf::Triple;

pub type GraphSubjectKey = (String, String);

pub fn group_by_graph_and_subject<'a>(
    quads: &'a [Quad],
) -> HashMap<GraphSubjectKey, Vec<&'a Quad>> {
    // Collect all in quads in a hashmap of (graph_iri, subject_iri) => Quad[]
    let mut quads_by_key: HashMap<GraphSubjectKey, Vec<&Quad>> = HashMap::new();

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

        // Add to accumulator.
        quads_by_key
            .entry((graph, subj))
            .or_insert_with(Vec::new)
            .push(quad);
    }

    return quads_by_key;
}

/// Creates a new HashMap of (graph_iri, subject_iri) => Quad[]
/// Filtered for the allowed subjects and predicates in the shape.
pub fn group_for_shape_and_subjects<'a>(
    all_quads: &HashMap<GraphSubjectKey, Vec<&'a Quad>>,
    shape: &OrmSchemaShape,
    allowed_subjects: &[SubjectIri],
) -> HashMap<GraphSubjectKey, Vec<&'a Quad>> {
    let allowed_preds_set: HashSet<&str> =
        shape.predicates.iter().map(|p| p.iri.as_str()).collect();

    let mut ret: HashMap<GraphSubjectKey, Vec<&'a Quad>> = HashMap::new();

    // Iterate over all (graph,subject) buckets and filter by allowed subjects (if any)
    for ((graph_iri, subject_iri), quads) in all_quads.iter() {
        if !allowed_subjects.is_empty() && !allowed_subjects.contains(subject_iri) {
            continue;
        }

        for quad in quads {
            if allowed_preds_set.contains(quad.predicate.as_str()) {
                ret.entry((graph_iri.clone(), subject_iri.clone()))
                    .or_insert_with(Vec::new)
                    .push(*quad);
            }
        }
    }

    ret
}

// let allowed_preds_set: HashSet<&str> =
//     shape.predicates.iter().map(|p| p.iri.as_str()).collect();

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
/// `~` is encoded as ~0, `/` is encoded as ~1.
pub fn escape_json_pointer_segment(path_segment: &String) -> String {
    path_segment.replace("~", "~0").replace("/", "~1")
}
/// `~` is encoded as ~0, `/` is encoded as ~1.
pub fn decode_json_pointer(path: &String) -> String {
    path.replace("~1", "/").replace("~0", "~")
}

/// SPARQL literal escape: backslash, quotes, newlines, tabs.
pub fn escape_literal(lit: &str) -> String {
    let mut out = String::with_capacity(lit.len() + 4);
    for c in lit.chars() {
        match c {
            '\\' => out.push_str("\\\\"),
            '\"' => out.push_str("\\\""),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            _ => out.push(c),
        }
    }
    return out;
}

pub fn json_to_sparql_val(json: &serde_json::Value) -> String {
    match json {
        serde_json::Value::Array(arr) => arr
            .iter()
            .map(|val| json_to_sparql_val(val))
            .collect::<Vec<String>>()
            .join(", "),
        serde_json::Value::Bool(bool) => match bool {
            true => "true".to_string(),
            false => "false".to_string(),
        },
        serde_json::Value::Number(num) => num.to_string(),
        serde_json::Value::String(str) => match is_iri(str) {
            true => format!("<{}>", str),
            false => format!("\"{}\"", str),
        },
        _ => panic!(),
    }
}

/// Heuristic:
/// Consider a string an IRI if it contains alphanumeric characters and then a colon within the first 13 characters
pub fn is_iri(s: &str) -> bool {
    lazy_static! {
        static ref IRI_REGEX: Regex = Regex::new(r"^[A-Za-z][A-Za-z0-9+\.\-]{1,12}:").unwrap();
    }
    IRI_REGEX.is_match(s)
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
    pub traversal_pick: Option<Arc<RwLock<TrackedOrmObject>>>,
    pub satisfies: bool, // whether this selection satisfies min/max cardinality
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

pub fn assess_and_rank_children(
    parent_graph_iri: &str,
    _parent_subject_iri: &str,
    _pred_schema: &OrmSchemaPredicate,
    _is_multi: bool,
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
        if s.starts_with(parent_graph_iri) {
            subject_prefix.push(c.clone());
        }
        all.push(c.clone());
    }

    // Helper to construct result for a bucket with cardinality evaluation
    let make_res = |bucket: Vec<Arc<RwLock<TrackedOrmObject>>>, which: HeuristicUsed| {
        let ranked = rank_by_validity_stable(bucket);
        let counts = bucket_counts(&ranked);
        let traversal_pick = ranked.first().cloned();
        let total = ranked.len() as i32;
        let within_min = total >= min_cardinality;
        let within_max = max_cardinality == -1 || total <= max_cardinality;
        AssessmentResult {
            considered: ranked,
            heuristic_used: which,
            counts,
            traversal_pick,
            satisfies: within_min && within_max,
        }
    };

    // Prefer same-graph, then subject-prefix, then all
    if !same_graph.is_empty() {
        let res = make_res(same_graph, HeuristicUsed::SameGraph);
        if res.satisfies {
            return res;
        }
    }
    if !subject_prefix.is_empty() {
        let res = make_res(subject_prefix, HeuristicUsed::SubjectPrefix);
        if res.satisfies {
            return res;
        }
    }
    make_res(all, HeuristicUsed::All)
}

/// Build ranked buckets for multi cardinality mismatch evaluation: SameGraph, SubjectPrefix, All
pub fn assess_children_buckets(
    parent_graph_iri: &str,
    _parent_subject_iri: &str,
    min_cardinality: i32,
    max_cardinality: i32,
    children: &[Arc<RwLock<TrackedOrmObject>>],
) -> Vec<AssessmentResult> {
    let mut same_graph: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut subject_prefix: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();
    let mut all: Vec<Arc<RwLock<TrackedOrmObject>>> = Vec::new();

    for c in children.iter() {
        let g = c.read().unwrap().graph_iri.clone();
        let s = c.read().unwrap().subject_iri.clone();
        if g == parent_graph_iri {
            same_graph.push(c.clone());
        }
        if s.starts_with(parent_graph_iri) {
            subject_prefix.push(c.clone());
        }
        all.push(c.clone());
    }

    let mut results: Vec<AssessmentResult> = Vec::new();
    let make_res = |bucket: Vec<Arc<RwLock<TrackedOrmObject>>>, which: HeuristicUsed| {
        let ranked = rank_by_validity_stable(bucket);
        let counts = bucket_counts(&ranked);
        let traversal_pick = ranked.first().cloned();
        let total = ranked.len() as i32;
        let within_min = total >= min_cardinality;
        let within_max = max_cardinality == -1 || total <= max_cardinality;
        AssessmentResult {
            considered: ranked,
            heuristic_used: which,
            counts,
            traversal_pick,
            satisfies: within_min && within_max,
        }
    };
    if !same_graph.is_empty() {
        results.push(make_res(same_graph, HeuristicUsed::SameGraph));
    }
    if !subject_prefix.is_empty() {
        results.push(make_res(subject_prefix, HeuristicUsed::SubjectPrefix));
    }
    results.push(make_res(all, HeuristicUsed::All));

    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use ng_net::orm::{OrmSchemaDataType, OrmSchemaShape, OrmSchemaValType};

    fn mk_shape(iri: &str) -> Arc<OrmSchemaShape> {
        Arc::new(OrmSchemaShape {
            iri: iri.to_string(),
            predicates: vec![],
        })
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
            shape,
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
            &pred_schema,
            false,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &children,
        );
        // same-graph bucket chosen first; traversal_pick is the pending (no valid same-graph), but ordering is by validity -> Pending first in this case
        assert_eq!(res.heuristic_used, HeuristicUsed::SameGraph);
        assert!(res.traversal_pick.is_some());
        assert_eq!(res.counts.pending, 1);
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
        let child_prefix_valid = mk_child(
            "urn:g:child",
            "urn:graph:x",
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
            &pred_schema,
            false,
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &[child_other_valid.clone(), child_prefix_valid.clone()],
        );
        assert_eq!(res.heuristic_used, HeuristicUsed::SubjectPrefix);
        // First in ranked order should be the valid prefix child
        let first = res.considered.first().unwrap().read().unwrap();
        assert_eq!(first.subject_iri, "urn:g:child");
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
            &pred_schema,
            true,
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
    }
}
