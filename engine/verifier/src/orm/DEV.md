# NextGraph ORM (Verifier-side) — Developer Overview

This folder implements the verifier-side "ORM" layer that turns RDF quads into ergonomic JSON objects (and back), scoped by a shape and a scope (NURI). At a high level:

- You provide a shape and a scope (NURI).
- The verifier queries triples that match the shape, builds tracked state, validates it, and materializes JSON objects (serde_json::Value).
- You can send JSON "patches" against those objects; the verifier turns them into SPARQL updates, applies them, and re-validates/builds diffs to stream back.

The ORM lets apps work with graph data as if it were typed objects while preserving RDF semantics and multi-graph realities.

If you just want to use the SDK, see the [TypeScript library](../../../../sdk/js/signals/README.md). You can also use the [Rust SDK](../../../../sdk/rust/README.md) which is however not documented (see the tests as a reference).

## Core concepts

- Shape: A typed projection of the RDF you care about. A shape defines predicates, their readable names, cardinalities, and value types (literal, number, boolean, iri, or another shape).
- Scope (NURI): The graph you query in. An ORM session is anchored to one scope; objects can live in the same or other graphs.
- TORMO: Tracked ORM Object. The in-memory unit that this module maintains per (graph, subject, shape). A TORMO tracks relevant predicates, nested children, current literal values, and its validation state.
- Validation: Each TORMO is marked Valid, Invalid, Pending, Untracked, or ToDelete. Validation walks the shape’s predicates, enforces cardinality, data types, and nested-shape constraints. Pending objects may trigger fetch of additional triples or require child objects to settle.
- Changes vs. state: We update tracked state incrementally while also recording per-object changes in a side structure (TrackedOrmObjectChange) so we can materialize fresh JSON and compute diffs without losing prior state.

## Data model (types)

Defined in `types.rs`:

- TrackedOrmObject ("TORMO"):
  - tracked_predicates: Map<predicate IRI, TrackedOrmPredicate> relevant to the shape
  - parents: Vec<TORMO> back-links for parent objects using this as a nested child
  - valid: Valid | Invalid | Pending | Untracked | ToDelete
  - subject_iri, graph_iri
  - shape: Arc<OrmSchemaShape>
- TrackedOrmPredicate:
  - schema: OrmSchemaPredicate
  - tracked_children: Vec<TORMO> when predicate valueType is shape
  - current_cardinality: i32 (number of quads seen for this predicate)
  - current_literals: Option<Vec<BasicType>> for literal/primitive predicates
- TrackedOrmObjectChange:
  - tracked_orm_object: Arc<TORMO>
  - predicates: Map<predicate IRI, TrackedOrmPredicateChanges>
  - is_validated: bool; prev_valid: Validity
- TrackedOrmPredicateChanges: holds values_added / values_removed during this turn
- OrmSubscription: One client session bound to a shape type and NURI; stores all TORMOs, cross-graph child tracking, and a channel to send results back.

## Lifecycle and data flow

1) Start a subscription
- Verifier.start_orm(nuri, shape_type, session_id) creates an OrmSubscription, registers it, queries the graph with a SELECT built from the shape, applies quads, validates, and sends an initial materialized JSON object map back to the client.

2) Applying quad changes
TODO: Update this section
- Verifier.apply_quads_changes(...) is the main entry for updates (both initial and subsequent):
  - Buckets triples by (graph, subject), per-shape.
  - For each touched (graph, subject, shape):
    - add/remove their quads to TORMO (see add_remove_quads.rs), tracking values_added/removed
    - reconcile and link parent<->child references via object IRIs
    - validate the object (shape_validation.rs)
    - queue nested children first, then self, then parents, repeating until quiescent

1) Validation details
- update_subject_validity(...) enforces:
  - Cardinality (min/max, with -1 meaning unbounded)
  - Literal constraints (required literal sets, or extra values allowed)
  - Type constraints (boolean/number/string/iri)
  - Nested shape constraints, with heuristics:
    - For traversal and ranking, children are grouped by same-graph, subject-prefix, and "all" buckets; valid > pending > untracked > invalid ordering.
    - Multi-valued predicates use bucket assessment to determine if any subset satisfies min/max or if we need to mark parent Pending and schedule relevant children.
- Outcomes:
  - Valid: can be materialized.
  - Invalid: if parent is not root object, mark ToDelete (to unlink and clean up); otherwise Untracked; children scheduled for cleanup.
  - Pending: schedule children (fetch or re-evaluate) and plan to re-evaluate self later.
  - Untracked: means we need to fetch its triples if referenced.

1) Cleanup
- OrmSubscription::cleanup_tracked_orm_objects() removes TORMOs marked ToDelete and unlinks children that no longer have parents tracking them.

## Materializing objects (JSON shape)

Defined in `initialize.rs` (materialize_orm_object):

- Root return is a JSON object mapping "graph|subject" => object.
- Each object contains:
  - "@id": subject IRI
  - "@graph": graph IRI
  - For each predicate in the shape:
    - For basic types: a primitive value or array when maxCardinality > 1 or -1.
    - For nested shapes:
      - If single-valued: embed the nested object directly.
      - If multi-valued: embed an object mapping "childGraph|childSubject" => nested object (unordered map, since there’s no canonical order across graphs).
- Missing optional arrays are represented as empty arrays to keep the shape predictable.
- Every call to `start_orm` creates a fresh `OrmSubscription` for the provided (nuri, shape, session). Initialization builds state exclusively inside that subscription and materializes from the corresponding changes, so prior subscriptions or runs cannot leak state into a new initialization. This matches the expectation that a new init produces a clean materialization.

Example (simplified):
```json
{
  "graphA|urn:obj1": {
    "@id": "urn:obj1",
    "@graph": "graphA",
    "stringValue": "hello",
    "objectValue": {
      "nestedString": "nested"
    },
    "anotherObject": {
      "graphA|urn:child1": { "@id": "...", "@graph": "...", "prop": 1 },
      "graphB|urn:child2": { "@id": "...", "@graph": "...", "prop": 2 }
    }
  }
}
```

## Path addressing in patches

Paths are JSON Pointer–like strings with escaping (~0, ~1), and start with the composite root key:

- Root: "/graphIri|subjectIri"
- Property: append "/<readablePredicate>"
- Single nested object: append readablePredicate and then operate on the nested fields. Today, the engine will pick a concrete child via heuristic (same-graph, then subject-prefix) if there are multiple candidates. Alternatively, you can pre-resolve a specific child by adding /.../@id and /.../@graph first and then sending field patches. Explicit single-child selectors are an open topic/TODO and could be introduced in the future.
- Multi nested objects: append the child key "/childGraph|childSubject" after the predicate (to target that specific child), then its fields.
- Special keys for object creation: if you add a new nested object, you can set:
  - "/.../@id" with the desired subject IRI
  - "/.../@graph" with the graph IRI where the child will live
  The code will pre-resolve these so subsequent patches under that base path refer to the intended child.

Examples:
- Remove all values for a property: "/g|s/prop"
- Remove one specific array element or object link: "/g|s/children/gChild|sChild"
- Add a literal: "/g|s/prop" with value = 42
- Add a nested object (single): set "/g|s/nested/@id" and "/g|s/nested/@graph" first, then fields under "/g|s/nested/..."
- Add a nested object (multi): set child key under "/g|s/children/gChild|sChild/..."

Utilities in `utils.rs` handle escaping, IRI detection, and converting JSON to SPARQL values.

## Patches and SPARQL updates

- Frontend sends OrmPatches (Vec<OrmPatch>) with op = add/remove, valType = primitive or object, path as above, and optional value.
- handle_frontend_update.rs:
  - create_sparql_update_query_for_patches(...) translates patches into SPARQL:
    - removes first (DELETE WHERE) then adds (INSERT WHERE), with proper WHERE path navigation
    - single-valued properties overwrite by first deleting any existing value
    - object link removals target exactly one triple when you include the child composite key
  - process_sparql_update(...) applies the update in the store, returning revert information if needed.
  - orm_update_self(...) is called to revert in case of partial failure and to trigger any follow-up updates.

Failure handling and reverts:
- On failure, the desired behavior is to emit and apply a new set of patches that revert the previous ones (at the ORM level). The current implementation already computes triple-level revert data (quads) and uses a backend revert path; mapping that to OrmPatches for client-visible reverts is straightforward future work.

## How objects are created

- For nested objects, the client typically creates the target subject/graph explicitly by setting /.../@id and /.../@graph. The next add patches under that base path generate triples linking the parent to that subject and populate its literals.
- If the child already exists (tracked or present in the dataset), the patches target it directly via the composite child key under a multi-valued predicate or via the single-valued selection heuristic.

## Tracking nested subjects (cross-graph) and linking

- When an object contains a shape-valued predicate, add_quads_for_subject notes the object IRIs in values_added (as strings).
- reconcile_links_for_subject_additions(...) updates `tracked_nested_subjects` with parent references per (child subject, child shape), tries to find candidate graphs (tracked or from diffs), links parents<->children if possible, and queues children for evaluation/fetch.
- link_to_tracking_parents(...) also establishes the reverse link when a child appears later.

## File overview

- add_remove_quads.rs: For a given (graph, subject, shape), apply added/removed quads into TORMO state and record TrackedOrmPredicateChanges. Literal values are collected in current_literals to enable literal-set validation.
- initialize.rs: Entry to start an ORM subscription (start_orm), initial querying (shape_type_to_sparql_select), application of quads, and materialization (materialize_orm_object). The initial response is a JSON object mapping "graph|subject" to materialized objects.
- process_changes.rs: The main engine to apply diffs, maintain the validation stack (children first, then self, then parents), link parent-child relationships, fetch nested data when required, and ensure each (shape,graph,subject) is applied and validated once per cycle.
- shape_validation.rs: Validation logic for cardinality, literals, types, nested shapes. Emits children/parents to schedule and whether self needs re-evaluation (or re-fetch) after children settle.
- query.rs: Builds SPARQL SELECT/CONSTRUCT queries from shapes. SELECT returns rows binding ?s ?p ?o ?g and mirrors the CONSTRUCT semantics with nested-layer graph attribution.
- utils.rs: Helpers for grouping quads, escaping JSON pointer segments, JSON->SPARQL value conversion, IRI detection, and the child assessment heuristics.
- types.rs: All ORM-internal types, tracked state, subscription structure, and change maps.
- handle_frontend_update.rs: Translates frontend JSON patches to SPARQL updates; triggers update application and optional self-reverts.
- mod.rs: Module wiring and a tiny helper to clean closed subscriptions.

## Error handling and edge cases

- Cycles: process_changes.rs guards with a currently_validating set; exceeding reasonable loops indicates cycles; the code logs and panics under a debug safeguard.
- Pending children: parents become Pending and schedule child evaluation/fetch. After children settle, self is re-evaluated to transition to Valid or Invalid.
- Deletions: Invalid objects with parents are marked ToDelete; cleanup later unlinks them without cascading deletions across other parents.
- Multi-valued nested: Returned as an object (map) keyed by "graph|subject" to avoid implying order.
- Data types: String values that look like IRIs (heuristic) are treated as IRIs when generating SPARQL.

## Contract for consumers

Input:
- ShapeType (schema + root shape IRI)
- Scope (NURI)

Output:
- Initial Value: JSON object mapping "graph|subject" => object
- Subsequent updates: diffs are computed internally and can be materialized as needed

Success:
- Objects that meet the shape constraints are Valid and included in the JSON output
- Nested objects are embedded (single) or mapped (multi), consistently across graphs

Failure/pending cases:
- Invalid objects are pruned (or scheduled for cleanup if referenced)
- Pending indicates more data is needed or child validation not finished

## Notes on patch sending and application

- Apply deletes before adds.
- For single-valued predicates, add implies overwrite (implemented by a preceding DELETE of ?o).
- Use composite child keys for multi-valued targets, and @id/@graph staging for creating or addressing a specific single nested child.
- After updates, the verifier re-queries as needed (for nested shapes marked FetchAndReevaluate) to maintain full TORMO consistency.

