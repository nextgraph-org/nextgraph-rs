// Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.

use ng_oxigraph::oxrdf::Subject;
use ng_repo::types::OverlayId;

use std::collections::HashMap;
use std::collections::HashSet;

use lazy_static::lazy_static;
use regex::Regex;

pub use ng_net::orm::{OrmPatches, OrmShapeType};
use ng_net::{app_protocol::*, orm::*};
use ng_oxigraph::oxrdf::Triple;

pub fn group_by_subject_for_shape<'a>(
    shape: &OrmSchemaShape,
    triples: &'a [Triple],
    allowed_subjects: &[String],
) -> HashMap<String, Vec<&'a Triple>> {
    let mut triples_by_subject: HashMap<String, Vec<&Triple>> = HashMap::new();
    let allowed_preds_set: HashSet<&str> =
        shape.predicates.iter().map(|p| p.iri.as_str()).collect();
    let allowed_subject_set: HashSet<&str> = allowed_subjects.iter().map(|s| s.as_str()).collect();
    for triple in triples {
        // triple.subject must be in allowed_subjects (or allowed_subjects empty)
        // and triple.predicate must be in allowed_preds.
        if allowed_preds_set.contains(triple.predicate.as_str()) {
            // filter subjects if list provided
            let subj = match &triple.subject {
                Subject::NamedNode(n) => n.clone().into_string(),
                _ => continue,
            };
            // Subject must be in allowed subjects (or allowed_subjects is empty).
            if allowed_subject_set.is_empty() || allowed_subject_set.contains(&subj.as_str()) {
                triples_by_subject
                    .entry(subj)
                    .or_insert_with(Vec::new)
                    .push(triple);
            }
        }
    }

    return triples_by_subject;
}

pub fn nuri_to_string(nuri: &NuriV0) -> String {
    // Get repo_id and overlay_id from the nuri
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

pub fn escape_json_pointer(path_segment: &String) -> String {
    path_segment.replace("~", "~0").replace("/", "~1")
}

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
