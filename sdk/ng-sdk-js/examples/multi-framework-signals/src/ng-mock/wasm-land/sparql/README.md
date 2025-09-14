# SPARQL builders

Utilities to build SPARQL SELECT and CONSTRUCT queries from a ShapeConstraint structure.

Exports:

- buildSelectQuery(shape, options)
- buildConstructQuery(shape, options)

Options:

- prefixes: Record<prefix, IRI>
- graph: named graph IRI or CURIE
- includeOptionalForMinZero: wrap min=0 predicates in OPTIONAL (default true)
