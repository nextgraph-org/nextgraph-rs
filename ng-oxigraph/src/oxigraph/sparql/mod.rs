// partial Copyright (c) 2022-2025 Niko Bonnieure, Par le Peuple, NextGraph.org developers
// All rights reserved.
// partial Copyright (c) 2018 Oxigraph developers
// All work licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice or not, may not be copied, modified, or distributed except
// according to those terms.

//! [SPARQL](https://www.w3.org/TR/sparql11-overview/) implementation.
//!
//! Stores execute SPARQL. See [`Store`](crate::oxigraph::store::Store::query()) for an example.

mod algebra;
mod dataset;
mod error;
mod eval;
mod http;
mod model;
pub mod results;
mod service;
mod update;

use super::model::{NamedNode, Term};
pub use super::sparql::algebra::{Query, QueryDataset, Update};
use super::sparql::dataset::DatasetView;
pub use super::sparql::error::EvaluationError;
use super::sparql::eval::{EvalNodeWithStats, SimpleEvaluator, Timer};
pub use super::sparql::model::{QueryResults, QuerySolution, QuerySolutionIter, QueryTripleIter};
pub use super::sparql::service::ServiceHandler;
use super::sparql::service::{EmptyServiceHandler, ErrorConversionServiceHandler};
pub(super) use super::sparql::update::evaluate_update;
use super::storage::StorageReader;
pub use crate::oxrdf::{Variable, VariableNameParseError};
use crate::oxsdatatypes::{DayTimeDuration, Float};
use crate::spargebra;
pub use crate::spargebra::SparqlSyntaxError;
use crate::sparopt::algebra::GraphPattern;
use crate::sparopt::Optimizer;
use json_event_parser::{JsonEvent, ToWriteJsonWriter};
use std::collections::HashMap;
use std::rc::Rc;
use std::sync::Arc;
use std::time::Duration;
use std::{fmt, io};

#[allow(clippy::needless_pass_by_value)]
pub(crate) fn evaluate_query(
    reader: StorageReader,
    query: impl TryInto<Query, Error = impl Into<EvaluationError>>,
    options: QueryOptions,
    run_stats: bool,
) -> Result<(Result<QueryResults, EvaluationError>, QueryExplanation), EvaluationError> {
    let query = query.try_into().map_err(Into::into)?;
    let dataset = DatasetView::new(reader, &query.dataset, options.get_default_graph());
    let start_planning = Timer::now();
    let (results, plan_node_with_stats, planning_duration) = match query.inner {
        spargebra::Query::Select {
            pattern, base_iri, ..
        } => {
            let mut pattern = GraphPattern::from(&pattern);
            if !options.without_optimizations {
                pattern = Optimizer::optimize_graph_pattern(pattern);
            }
            let planning_duration = start_planning.elapsed();
            let (results, explanation) = SimpleEvaluator::new(
                Rc::new(dataset),
                base_iri.map(Rc::new),
                options.service_handler(),
                Arc::new(options.custom_functions),
                run_stats,
            )
            .evaluate_select(&pattern);
            (Ok(results), explanation, planning_duration)
        }
        spargebra::Query::Ask {
            pattern, base_iri, ..
        } => {
            let mut pattern = GraphPattern::from(&pattern);
            if !options.without_optimizations {
                pattern = Optimizer::optimize_graph_pattern(GraphPattern::Reduced {
                    inner: Box::new(pattern),
                });
            }
            let planning_duration = start_planning.elapsed();
            let (results, explanation) = SimpleEvaluator::new(
                Rc::new(dataset),
                base_iri.map(Rc::new),
                options.service_handler(),
                Arc::new(options.custom_functions),
                run_stats,
            )
            .evaluate_ask(&pattern);
            (results, explanation, planning_duration)
        }
        spargebra::Query::Construct {
            template,
            pattern,
            base_iri,
            ..
        } => {
            let mut pattern = GraphPattern::from(&pattern);
            if !options.without_optimizations {
                pattern = Optimizer::optimize_graph_pattern(GraphPattern::Reduced {
                    inner: Box::new(pattern),
                });
            }
            let planning_duration = start_planning.elapsed();
            let (results, explanation) = SimpleEvaluator::new(
                Rc::new(dataset),
                base_iri.map(Rc::new),
                options.service_handler(),
                Arc::new(options.custom_functions),
                run_stats,
            )
            .evaluate_construct(&pattern, &template);
            (Ok(results), explanation, planning_duration)
        }
        spargebra::Query::Describe {
            pattern, base_iri, ..
        } => {
            let mut pattern = GraphPattern::from(&pattern);
            if !options.without_optimizations {
                pattern = Optimizer::optimize_graph_pattern(GraphPattern::Reduced {
                    inner: Box::new(pattern),
                });
            }
            let planning_duration = start_planning.elapsed();
            let (results, explanation) = SimpleEvaluator::new(
                Rc::new(dataset),
                base_iri.map(Rc::new),
                options.service_handler(),
                Arc::new(options.custom_functions),
                run_stats,
            )
            .evaluate_describe(&pattern);
            (Ok(results), explanation, planning_duration)
        }
    };
    let explanation = QueryExplanation {
        inner: plan_node_with_stats,
        with_stats: run_stats,
        parsing_duration: query.parsing_duration,
        planning_duration,
    };
    Ok((results, explanation))
}

/// Options for SPARQL query evaluation.
///
///
/// If the `"http-client"` optional feature is enabled,
/// a simple HTTP 1.1 client is used to execute [SPARQL 1.1 Federated Query](https://www.w3.org/TR/sparql11-federated-query/) SERVICE calls.
///
/// Usage example disabling the federated query support:
/// ```
/// use oxigraph::sparql::QueryOptions;
/// use oxigraph::store::Store;
///
/// let store = Store::new()?;
/// store.query_opt(
///     "SELECT * WHERE { SERVICE <https://query.wikidata.org/sparql> {} }",
///     QueryOptions::default().without_service_handler(),
/// )?;
/// # Result::<_,Box<dyn std::error::Error>>::Ok(())
/// ```
#[derive(Clone, Default)]
pub struct QueryOptions {
    service_handler: Option<Arc<dyn ServiceHandler<Error = EvaluationError>>>,
    custom_functions: CustomFunctionRegistry,
    http_timeout: Option<Duration>,
    http_redirection_limit: usize,
    without_optimizations: bool,
    default_graph: Option<String>,
}

pub(crate) type CustomFunctionRegistry =
    HashMap<NamedNode, Arc<dyn (Fn(&[Term]) -> Option<Term>) + Send + Sync>>;

impl QueryOptions {
    /// Use a given [`ServiceHandler`] to execute [SPARQL 1.1 Federated Query](https://www.w3.org/TR/sparql11-federated-query/) SERVICE calls.
    #[inline]
    #[must_use]
    pub fn with_service_handler(mut self, service_handler: impl ServiceHandler + 'static) -> Self {
        self.service_handler = Some(Arc::new(ErrorConversionServiceHandler::wrap(
            service_handler,
        )));
        self
    }

    pub fn set_default_graph(&mut self, dg: Option<String>) {
        self.default_graph = dg;
    }

    pub fn get_default_graph(&self) -> &Option<String> {
        &self.default_graph
    }

    /// Disables the `SERVICE` calls
    #[inline]
    #[must_use]
    pub fn without_service_handler(mut self) -> Self {
        self.service_handler = Some(Arc::new(EmptyServiceHandler));
        self
    }

    /// Sets a timeout for HTTP requests done during SPARQL evaluation.
    #[cfg(feature = "http-client")]
    #[inline]
    #[must_use]
    pub fn with_http_timeout(mut self, timeout: Duration) -> Self {
        self.http_timeout = Some(timeout);
        self
    }

    /// Sets an upper bound of the number of HTTP redirection followed per HTTP request done during SPARQL evaluation.
    ///
    /// By default this value is `0`.
    #[cfg(feature = "http-client")]
    #[inline]
    #[must_use]
    pub fn with_http_redirection_limit(mut self, redirection_limit: usize) -> Self {
        self.http_redirection_limit = redirection_limit;
        self
    }

    /// Adds a custom SPARQL evaluation function.
    ///
    /// Example with a function serializing terms to N-Triples:
    /// ```
    /// use oxigraph::model::*;
    /// use oxigraph::sparql::{QueryOptions, QueryResults};
    /// use oxigraph::store::Store;
    ///
    /// let store = Store::new()?;
    ///
    /// if let QueryResults::Solutions(mut solutions) = store.query_opt(
    ///     "SELECT (<http://www.w3.org/ns/formats/N-Triples>(1) AS ?nt) WHERE {}",
    ///     QueryOptions::default().with_custom_function(
    ///         NamedNode::new("http://www.w3.org/ns/formats/N-Triples")?,
    ///         |args| args.get(0).map(|t| Literal::from(t.to_string()).into()),
    ///     ),
    /// )? {
    ///     assert_eq!(
    ///         solutions.next().unwrap()?.get("nt"),
    ///         Some(&Literal::from("\"1\"^^<http://www.w3.org/2001/XMLSchema#integer>").into())
    ///     );
    /// }
    /// # Result::<_,Box<dyn std::error::Error>>::Ok(())
    /// ```
    #[inline]
    #[must_use]
    pub fn with_custom_function(
        mut self,
        name: NamedNode,
        evaluator: impl Fn(&[Term]) -> Option<Term> + Send + Sync + 'static,
    ) -> Self {
        self.custom_functions.insert(name, Arc::new(evaluator));
        self
    }

    fn service_handler(&self) -> Arc<dyn ServiceHandler<Error = EvaluationError>> {
        self.service_handler.clone().unwrap_or_else(|| {
            if cfg!(feature = "http-client") {
                Arc::new(service::SimpleServiceHandler::new(
                    self.http_timeout,
                    self.http_redirection_limit,
                ))
            } else {
                Arc::new(EmptyServiceHandler)
            }
        })
    }

    #[doc(hidden)]
    #[inline]
    #[must_use]
    pub fn without_optimizations(mut self) -> Self {
        self.without_optimizations = true;
        self
    }
}

/// Options for SPARQL update evaluation.
#[derive(Clone, Default)]
pub struct UpdateOptions {
    query_options: QueryOptions,
}

impl From<QueryOptions> for UpdateOptions {
    #[inline]
    fn from(query_options: QueryOptions) -> Self {
        Self { query_options }
    }
}

impl UpdateOptions {
    pub fn set_default_graph(&mut self, dg: Option<String>) {
        self.query_options.set_default_graph(dg);
    }
}

/// The explanation of a query.
#[derive(Clone)]
pub struct QueryExplanation {
    inner: Rc<EvalNodeWithStats>,
    with_stats: bool,
    parsing_duration: Option<DayTimeDuration>,
    planning_duration: Option<DayTimeDuration>,
}

impl QueryExplanation {
    /// Writes the explanation as JSON.
    pub fn write_in_json(&self, write: impl io::Write) -> io::Result<()> {
        let mut writer = ToWriteJsonWriter::new(write);
        writer.write_event(JsonEvent::StartObject)?;
        if let Some(parsing_duration) = self.parsing_duration {
            writer.write_event(JsonEvent::ObjectKey("parsing duration in seconds".into()))?;
            writer.write_event(JsonEvent::Number(
                parsing_duration.as_seconds().to_string().into(),
            ))?;
        }
        if let Some(planning_duration) = self.planning_duration {
            writer.write_event(JsonEvent::ObjectKey("planning duration in seconds".into()))?;
            writer.write_event(JsonEvent::Number(
                planning_duration.as_seconds().to_string().into(),
            ))?;
        }
        writer.write_event(JsonEvent::ObjectKey("plan".into()))?;
        self.inner.json_node(&mut writer, self.with_stats)?;
        writer.write_event(JsonEvent::EndObject)
    }
}

impl fmt::Debug for QueryExplanation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut obj = f.debug_struct("QueryExplanation");
        if let Some(parsing_duration) = self.parsing_duration {
            obj.field(
                "parsing duration in seconds",
                &f32::from(Float::from(parsing_duration.as_seconds())),
            );
        }
        if let Some(planning_duration) = self.planning_duration {
            obj.field(
                "planning duration in seconds",
                &f32::from(Float::from(planning_duration.as_seconds())),
            );
        }
        obj.field("tree", &self.inner);
        obj.finish_non_exhaustive()
    }
}
