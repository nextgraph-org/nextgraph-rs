export interface ShapeType<T extends BaseType> {
    schema: Schema;
    shape: string;
}

export interface BaseType extends Record<string, any> {
    id: string;
}

export type Schema = {
    [id: string]: Shape;
};

export interface Shape {
    iri: string;
    predicates: Predicate[];
}

export type DataType = {
    literals?: number[] | string[] | boolean;
    valType: "number" | "string" | "boolean" | "iri" | "literal";
};

export interface Predicate {
    /** Type of property. */
    valType: DataType["valType"] | "nested" | "eitherOf";
    /** The RDF predicate URI. */
    iri: string;
    /** The alias of the `predicateUri` when serialized to a JSON object. */
    readablePredicate: string;
    /** The required literal value(s), if type is `literal`. Others are allowed, if `extra` is true. */
    literalValue?: number | string | boolean | number[] | string[]; // TODO: We could live without this and use eitherOf instead...
    /** If type is `nested`, the shape or its IRI.  */
    nestedShape?: string | Shape; // TODO: Only allow Shape while parsing from traverser. We flatten afterwards.
    /** Maximum allowed number of values. `-1` means infinite. */
    maxCardinality: number;
    /** Minimum required number of values */
    minCardinality: number;
    /** If type is `eitherOf`, specifies multiple allowed types (CompactSchemaValue, shapes, or shape IRI). */
    eitherOf?: (DataType | Shape | string)[]; // TODO: Shape is going to be by reference.
    /** If other (additional) values are permitted. Useful for literals. */
    extra?: boolean;
}
