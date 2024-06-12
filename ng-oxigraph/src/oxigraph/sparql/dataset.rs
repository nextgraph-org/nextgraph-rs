use crate::oxigraph::model::TermRef;
use crate::oxigraph::sparql::algebra::QueryDataset;
use crate::oxigraph::sparql::EvaluationError;
use crate::oxigraph::storage::numeric_encoder::{
    insert_term, EncodedQuad, EncodedTerm, StrHash, StrLookup,
};
use crate::oxigraph::storage::{MatchBy, StorageError, StorageReader};
use crate::oxigraph::store::CorruptionError;

use std::cell::RefCell;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use std::iter::empty;
pub struct DatasetView {
    reader: StorageReader,
    extra: RefCell<HashMap<StrHash, String>>,
    dataset: EncodedDatasetSpec,
}

struct ErrorIterator {
    err: Option<Result<EncodedQuad, EvaluationError>>,
}

impl Iterator for ErrorIterator {
    type Item = Result<EncodedQuad, EvaluationError>;
    fn next(&mut self) -> Option<Self::Item> {
        self.err.take()
    }
}

impl DatasetView {
    pub fn new(reader: StorageReader, dataset: &QueryDataset) -> Self {
        let dataset = EncodedDatasetSpec {
            default: dataset
                .default_graph_graphs()
                .map(|graphs| graphs.iter().map(|g| g.as_ref().into()).collect::<Vec<_>>()),
            named: dataset
                .available_named_graphs()
                .map(|graphs| graphs.iter().map(|g| g.as_ref().into()).collect::<Vec<_>>()),
        };
        Self {
            reader,
            extra: RefCell::new(HashMap::default()),
            dataset,
        }
    }

    fn parse_graph_name(&self, graph_name: &EncodedTerm) -> Result<MatchBy, StorageError> {
        match graph_name {
            EncodedTerm::NamedNode { iri_id } => {
                let graph_name_string = self.get_str(iri_id)?.ok_or::<StorageError>(
                    CorruptionError::msg("graph_name not found in parse_graph_name").into(),
                )?;
                self.reader
                    .parse_graph_name(&graph_name_string, Some(*iri_id))
            }
            _ => Err(CorruptionError::msg(
                "Invalid graph_name (not a NamedNode) in parse_graph_name",
            )
            .into()),
        }
    }

    fn store_encoded_quads_for_pattern<'a>(
        &'a self,
        subject: Option<&'a EncodedTerm>,
        predicate: Option<&'a EncodedTerm>,
        object: Option<&'a EncodedTerm>,
        graph_name: Option<&'a EncodedTerm>,
    ) -> Box<dyn Iterator<Item = Result<EncodedQuad, EvaluationError>>> {
        let graph = if let Some(g) = graph_name {
            match self.parse_graph_name(g) {
                Ok(match_by) => Some(match_by),
                Err(e) => {
                    return Box::new(ErrorIterator {
                        err: Some(Err(e.into())),
                    })
                }
            }
        } else {
            None
        };

        Box::new(
            self.reader
                .quads_for_pattern(subject, predicate, object, graph)
                .map(|t| t.map_err(Into::into)),
        )
    }

    #[allow(clippy::needless_collect)]
    pub fn encoded_quads_for_pattern(
        &self,
        subject: Option<&EncodedTerm>,
        predicate: Option<&EncodedTerm>,
        object: Option<&EncodedTerm>,
        graph_name: Option<&EncodedTerm>,
    ) -> Box<dyn Iterator<Item = Result<EncodedQuad, EvaluationError>>> {
        if let Some(graph_name) = graph_name {
            if graph_name.is_default_graph() {
                if let Some(default_graph_graphs) = &self.dataset.default {
                    if default_graph_graphs.len() == 1 {
                        // Single graph optimization
                        Box::new(
                            self.store_encoded_quads_for_pattern(
                                subject,
                                predicate,
                                object,
                                Some(&default_graph_graphs[0]),
                            )
                            .map(|quad| {
                                let quad = quad?;
                                Ok(EncodedQuad::new(
                                    quad.subject,
                                    quad.predicate,
                                    quad.object,
                                    EncodedTerm::DefaultGraph,
                                ))
                            }),
                        )
                    } else {
                        let iters = default_graph_graphs
                            .iter()
                            .map(|graph_name| {
                                self.store_encoded_quads_for_pattern(
                                    subject,
                                    predicate,
                                    object,
                                    Some(graph_name),
                                )
                            })
                            .collect::<Vec<_>>();
                        Box::new(iters.into_iter().flatten().map(|quad| {
                            let quad = quad?;
                            Ok(EncodedQuad::new(
                                quad.subject,
                                quad.predicate,
                                quad.object,
                                EncodedTerm::DefaultGraph,
                            ))
                        }))
                    }
                } else {
                    Box::new(
                        self.store_encoded_quads_for_pattern(subject, predicate, object, None)
                            .map(|quad| {
                                let quad = quad?;
                                Ok(EncodedQuad::new(
                                    quad.subject,
                                    quad.predicate,
                                    quad.object,
                                    EncodedTerm::DefaultGraph,
                                ))
                            }),
                    )
                }
            } else if self
                .dataset
                .named
                .as_ref()
                .map_or(true, |d| d.contains(graph_name))
            {
                Box::new(self.store_encoded_quads_for_pattern(
                    subject,
                    predicate,
                    object,
                    Some(graph_name),
                ))
            } else {
                Box::new(empty())
            }
        } else if let Some(named_graphs) = &self.dataset.named {
            let iters = named_graphs
                .iter()
                .map(|graph_name| {
                    self.store_encoded_quads_for_pattern(
                        subject,
                        predicate,
                        object,
                        Some(graph_name),
                    )
                })
                .collect::<Vec<_>>();
            Box::new(iters.into_iter().flatten())
        } else {
            Box::new(
                // TODO: filter could be removed here as we never return quads with defaultGraph as graph
                self.store_encoded_quads_for_pattern(subject, predicate, object, None)
                    .filter(|quad| match quad {
                        Err(_) => true,
                        Ok(quad) => !quad.graph_name.is_default_graph(),
                    }),
            )
        }
    }

    pub fn encode_term<'a>(&self, term: impl Into<TermRef<'a>>) -> EncodedTerm {
        let term = term.into();
        let encoded = term.into();
        insert_term(term, &encoded, &mut |key, value| {
            self.insert_str(key, value);
            Ok(())
        })
        .unwrap();
        encoded
    }

    pub fn insert_str(&self, key: &StrHash, value: &str) {
        if let Entry::Vacant(e) = self.extra.borrow_mut().entry(*key) {
            if !matches!(self.reader.contains_str(key), Ok(true)) {
                e.insert(value.to_owned());
            }
        }
    }
}

impl StrLookup for DatasetView {
    fn get_str(&self, key: &StrHash) -> Result<Option<String>, StorageError> {
        Ok(if let Some(value) = self.extra.borrow().get(key) {
            Some(value.clone())
        } else {
            self.reader.get_str(key)?
        })
    }
}

struct EncodedDatasetSpec {
    default: Option<Vec<EncodedTerm>>,
    named: Option<Vec<EncodedTerm>>,
}
