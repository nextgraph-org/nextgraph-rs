# NextGraph ORM (rust-side) — Developer Overview

This folder implements the rust-side "ORM" layer that turns RDF quads into ergonomic JSON objects (and back), scoped by a shape and a scope (NURI). At a high level:

- You provide a shape and a scope (NURI).
- The verifier queries triples that match the shape, builds tracked state, validates it, and materializes JSON objects (serde_json::Value).
- You can send JSON "patches" against those objects; the verifier turns them into SPARQL updates, applies them, and re-validates/builds diffs to stream back.
- On database updates, patches are generated and sent to the frontend.

The ORM lets apps work with graph data as if it were typed objects while preserving RDF semantics and multi-graph realities.

If you just want to use the SDK, see the [TypeScript library](../../../../sdk/js/orm/README.md). You can also use the [Rust SDK](../../../../sdk/rust/README.md) which is however not documented and probably not going to be of big use (see the [tests](../../../../sdk/rust/src/tests/) as a reference).

## Core concepts

**Shape**: A typed projection of the RDF you care about. A shape defines predicates, their readable names, cardinalities, and value types (literal, number, boolean, iri, or another shape).

**Scope (NURI)**: The graph or store you query in. An ORM session is anchored to one scope; objects can live in the same or other graphs.

**TORMO**: Tracked ORM Object. The in-memory unit that this module maintains per (graph, subject, shape). A TORMO tracks relevant predicates, nested children, current literal values, and its validation state. \
**Note:** Neither TORMOs nor other data structures retains the *values* sent to the frontend during a session, to prevent the duplication of data. TORMOs are used to track and update the validity of objects. An exception are required literal values which we need to track validity (unless we wanted to re-run a SPARQL query on any change of an affected predicate).

**Validation**: Each TORMO is marked Valid, Invalid, Pending, Untracked, or ToDelete. Validation walks the shape’s predicates, enforces cardinality, data types, and nested-shape constraints. Pending objects may trigger fetch of additional triples or require child objects to settle.

**Changes vs. state**: We update tracked state incrementally while also recording per-object changes in a side structure (TrackedOrmObjectChange) temporarily, so we can materialize fresh JSON ORM objects or compute diffs without losing prior state.

## Data model (types)

Defined in `engine/verifier/src/orm/types.rs` (internal) and `engine/net/src/orm.rs` (outwards-facing):

### Internal Types

- TrackedOrmObject ("TORMO"):
  - `tracked_predicates: Map<predicate IRI, TrackedOrmPredicate>` relevant to the shape
  - `parents: Vec<TORMO>` back-links for parent objects using this as a nested child
  - `valid: Valid | Invalid | Pending | Untracked | ToDelete`
  - `subject_iri`, `graph_iri`
  - `shape: Arc<OrmSchemaShape>`
- TrackedOrmPredicate:
  - `schema: OrmSchemaPredicate`
  - `tracked_children: Vec<TORMO>` when predicate valueType is shape
  - `current_cardinality: i32` (number of quads seen for this predicate)
  - `current_literals: Option<Vec<BasicType>>` for literal/primitive predicates
- TrackedOrmObjectChange:
  - `tracked_orm_object: Arc<TORMO>`
  - `predicates: Map<predicate IRI, TrackedOrmPredicateChanges>`
  - `is_validated: bool; prev_valid: Validity`
- TrackedOrmPredicateChanges: holds values_added / values_removed during this turn
- OrmSubscription: One client session bound to a shape type and NURI; stores all TORMOs, cross-graph child tracking, and a channel to send the initial ORM object and subsequent patches back.

### Outward-Facing Types (Schema and Patches)

For an example of how the schema looks like, see the [shex-orm generator README](../../../../sdk/js/shex-orm/README.md).

For the patch format, see the [TypeScript definitions](../../../../sdk/js/orm/src/connector/applyPatches.ts).

All values (including patch `value`) use `serde_json::Value` externally for flexibility. Validation & conversion to RDF happens inside the verifier.


## Lifecycle and data flow

* Start a subscription
  * `Verifier.start_orm(nuri, shape_type, session_id)` creates an `OrmSubscription`, registers it, queries the graph with a SELECT built from the shape, applies quads, validates, and sends an initial materialized JSON object map back to the client.

* Change processing loop
  * Incoming quad diffs (from patches or external SPARQL updates) are grouped by `(graph, subject)`.
  * For each affected `(shape, graph, subject)` we apply adds/removes (`add_remove_quads.rs`), record predicate changes, reconcile newly referenced child subjects, and validate.
  * Prioritization of child objects ("bucketing") no longer uses a standalone "apply_quads_changes" entry point. It is performed inside the validation cycle via `assess_and_rank_children` (see `utils.rs`): buckets are preferred in order: Same Graph → Authoritative Graph (subject-prefix) → Any Graph. Validity ranking within a bucket is `Valid > Pending > Untracked > Invalid`.
  * The loop maintains a LIFO stack: children are scheduled first, then the current object, then parents. A cycle guard (`currently_validating`) and a loop counter (hard cap 100) prevent infinite recursion.

* Validation details
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

* Cleanup
  * `OrmSubscription::cleanup_tracked_orm_objects()` runs after patches/diffs are sent. It removes `ToDelete` objects and unlinks children whose parent sets became empty. Invalid objects referenced by parents transition to `ToDelete` first and are pruned in this phase.

## Materializing objects (JSON shape)

Defined in `initialize.rs` (`materialize_orm_object`):

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

* Root: `"/graphIri|subjectIri"`
* Property: append `"/<readablePredicate>"`
* Single nested object: append the readable predicate and then operate on nested fields. If multiple candidates exist the heuristic (Same Graph → Subject Prefix → Any Graph) selects one. You can pre-resolve a specific child by first setting `/.../@id` and `/.../@graph` and then applying field patches under that path. Explicit selectors may be added later.
* Multi nested objects: append the child composite key `"/childGraph|childSubject"` after the predicate, then its fields.
* Special keys for object creation: set `"/.../@id"` and `"/.../@graph"` before adding fields. Path escaping uses JSON Pointer rules: `~0` decodes to `~`, `~1` decodes to `/`.

Examples:
- Remove all values for a property: `"/g|s/prop"`
- Remove one specific object link: `"/g|s/children/childGraphIri|childSubjectIri"`
- Add a literal: `"/g|s/prop"` with value = 42
- Add a nested object (single): add `"/g|s/nested/@id"` and `"/g|s/nested/@graph"` first, then fields under `"/g|s/nested/..."`
- Add a nested object (multi): set child key under `"/g|s/children/gChild|sChild/..."`

Utilities in `utils.rs` handle escaping, IRI detection, and converting JSON to SPARQL values.

## Patches and SPARQL updates

* Frontend sends `OrmPatches` (`Vec<OrmPatch>`) with `op = add/remove`, `valType = set | object` (no `valType` implied primitive value), `path` as above, and optional `value`.
- handle_frontend_update.rs:
  - create_sparql_update_query_for_patches(...) translates patches into SPARQL:
    - removes first (DELETE WHERE) then adds (INSERT WHERE), with proper WHERE path navigation
    - single-valued properties overwrite by first deleting any existing value
    - object link removals target exactly one triple when you include the child composite key
  - process_sparql_update(...) applies the update in the store, returning revert information if needed.

Failure handling and reverts:
* TODO: On failure, no automatic client-visible revert patches are currently sent. Quad-level revert data exists internally but user-level patch reversion is future work.

## How objects are created

* For nested objects, the client creates the target subject/graph explicitly by setting `/.../@id` and `/.../@graph`. This established a link to the object.
  Subsequent (and if the object existed, optional) patches populate the object.

## Tracking nested subjects (cross-graph) and linking

* When an object contains a shape-valued predicate, additions record object IRIs in `values_added` (strings).
* `` updates `tracked_nested_subjects`, identifies candidate graphs (tracked, newly added, removed, then parent's graph), links parents ↔ children, and queues children for evaluation/fetch.reconcile_links_for_subject_additions
* `link_to_tracking_parents` establishes reverse links when a child appears later.

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

* Cycles: guard with `currently_validating`; loop counter (cap 100) logs/panics if exceeded.
* Pending children: parents become `Pending`, scheduling fetch or re-evaluation. Links established mid-loop can revert objects back to `Pending` until stabilization.
* Deletions: Invalid objects with parents become `ToDelete`; pruned during cleanup without cascading deletions to unrelated parents.
* Multi-valued nested: returned as a map keyed by `"graph|subject"` (unordered). In TypeScript signals these maps are treated as sets.

## Contract for consumers

Input:
- ShapeType (schema + root shape IRI)
- Scope (NURI)

Output:
- Initial Value: JSON object mapping "graph|subject" => object
- Subsequent updates: diffs are computed internally and can be materialized as needed

Success:
* Objects that meet shape constraints are `Valid` and included.
* Nested objects are embedded (single) or mapped (multi) across graphs; root is always a multi-object container (most shapes match multiple subjects, e.g. contacts).

Failure/pending cases:
* Invalid objects are pruned (or scheduled for cleanup if referenced).
* `Pending` indicates more data is needed, child validation not finished, or links just established.
* Validity is re-evaluated whenever new quads arrive; partial linking during a cycle can temporarily revert `Valid` objects to `Pending`.

## Notes on patch sending and application

* Apply deletes before adds.
* Single-valued predicates: `add` implies overwrite (DELETE then INSERT). Sending two `add` patches for the same single-valued predicate will only keep the latter.
* Use composite child keys for multi-valued targets; use `/.../@id` and `/.../@graph` staging for single nested object creation.
* After updates, re-validation may schedule fetches (`FetchAndReevaluate`) to maintain consistency.
* Engine currently runs single-threaded (may become multi-threaded later).

