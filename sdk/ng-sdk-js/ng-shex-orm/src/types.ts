export interface ShapeType<T extends OrmBase> {
    schema: Schema;
    shape: "http://example.org/Cat";
}

export interface OrmBase extends Record<string, any> {
    id: string;
}

export type Schema = {
    [id: string]: Shape;
};

export interface Shape {
    iri: string;
    predicates: SchemaProperty[];
}

export type SchemaValue = {
    literals?: number[] | string[] | boolean;
    type: "number" | "string" | "boolean" | "literal";
};

export interface SchemaProperty {
    /** Type of property. */
    type: "number" | "string" | "boolean" | "literal" | "nested" | "eitherOf";
    /** The RDF predicate URI. */
    predicateUri: string;
    /** The alias of the `predicateUri` when serialized to a JSON object. */
    readablePredicate: string;
    /** The required literal value(s), if type is `literal`. Others are allowed, if `extra` is true. */
    literalValue?: number | string | boolean | number[] | string[];
    /** If type is `nested`, the shape or its IRI.  */
    nestedSchema?: string | Shape;
    /** Maximum allowed number of values. `-1` means infinite. */
    maxCardinality: number;
    /** Minimum required number of values */
    minCardinality: number;
    /** If type is `eitherOf`, specifies multiple allowed types (CompactSchemaValue, shapes, or shape IRI). */
    eitherOf?: (SchemaValue | Shape | string)[];
    /** If other (additional) values are permitted. Useful for literals. */
    extra?: boolean;
}
