export interface ShapeType<T extends BaseType> {
    schema: Schema;
    shape: string;
}

export interface BaseType extends Record<string, any> {
    "@id": string;
}

export type Schema = {
    [id: string]: Shape;
};

export interface Shape {
    iri: string;
    predicates: Predicate[];
}

export type DataType = {
    /** The required literal value(s), if type is `literal`. Others are allowed, if `extra` is true. */
    literals?: number[] | string[] | boolean;
    /** If `valType` is `"shape"`, the nested shape or its reference. Use reference for serialization. */
    shape?: string | Shape;
    /** The type of object value for a triple constraint. */
    valType: "number" | "string" | "boolean" | "iri" | "literal" | "shape";
};

export interface Predicate {
    /** Allowed type of object. If more than one is present, either of them is allowed. */
    dataTypes: DataType[];
    /** The RDF predicate URI. */
    iri: string;
    /** The alias of the `predicateUri` when serialized to a JSON object. */
    readablePredicate: string;
    /** Maximum allowed number of values. `-1` means infinite. */
    maxCardinality: number;
    /** Minimum required number of values */
    minCardinality: number;
    /** If other (additional) values are permitted. Useful for literals. */
    extra?: boolean;
}
