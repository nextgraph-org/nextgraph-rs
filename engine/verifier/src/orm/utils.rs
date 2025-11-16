// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

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
    pub satisfies: bool, // whether this selection satisfies min/max cardinality
    pub children_to_fetch: Vec<Arc<RwLock<TrackedOrmObject>>>,
    pub children_to_reevaluate: Vec<Arc<RwLock<TrackedOrmObject>>>,
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

        // Extract children that need fetching (Untracked) or re-evaluation (Pending)
        let mut children_to_fetch = Vec::new();
        let mut children_to_reevaluate = Vec::new();

        for child in ranked.iter() {
            let child_guard = child.read().unwrap();
            match child_guard.valid {
                TrackedOrmObjectValidity::Untracked => {
                    children_to_fetch.push(child.clone());
                }
                TrackedOrmObjectValidity::Pending => {
                    children_to_reevaluate.push(child.clone());
                }
                _ => {}
            }
        }

        AssessmentResult {
            considered: ranked,
            heuristic_used: which,
            counts,
            satisfies,
            children_to_fetch,
            children_to_reevaluate,
        }
    };

    // Prefer same-graph, then subject-prefix, then all
    // Return early if a bucket satisfies OR has potential (pending/untracked children)
    if !same_graph.is_empty() {
        let res = make_res(same_graph, HeuristicUsed::SameGraph);
        if res.satisfies
            || !res.children_to_fetch.is_empty()
            || !res.children_to_reevaluate.is_empty()
        {
            return res;
        }
    }
    if !subject_prefix.is_empty() {
        let res = make_res(subject_prefix, HeuristicUsed::SubjectPrefix);
        if res.satisfies
            || !res.children_to_fetch.is_empty()
            || !res.children_to_reevaluate.is_empty()
        {
            return res;
        }
    }
    make_res(all, HeuristicUsed::All)
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
            pred_schema.minCardinality,
            pred_schema.maxCardinality,
            &children,
        );
        // same-graph bucket chosen first; has pending child so should be considered
        assert_eq!(res.heuristic_used, HeuristicUsed::SameGraph);
        assert_eq!(res.counts.pending, 1);
        assert_eq!(res.children_to_reevaluate.len(), 1);
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
        assert_eq!(res.children_to_fetch.len(), 1); // untracked child
        assert_eq!(res.children_to_reevaluate.len(), 1); // pending child
    }
}
