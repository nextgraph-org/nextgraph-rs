/* eslint-disable @typescript-eslint/no-explicit-any */

import ShexJTraverser from "@ldo/traverser-shexj";
import type { Annotation } from "shexj";
import * as dom from "dts-dom";
import type { InterfaceDeclaration } from "dts-dom";

export interface ShapeInterfaceDeclaration extends InterfaceDeclaration {
    shapeId?: string;
}

// Collected enum alias names (e.g., AuthenticatedAgentId) to emit at end
export const additionalCompactEnumAliases = new Set<string>();

export interface CompactTransformerContext {
    getNameFromIri: (iri: string, rdfType?: string) => string;
}

function commentFromAnnotations(
    annotations?: Annotation[]
): string | undefined {
    const commentAnnotationObject = annotations?.find(
        (annotation) =>
            annotation.predicate ===
            "http://www.w3.org/2000/01/rdf-schema#comment"
    )?.object;
    if (typeof commentAnnotationObject === "string")
        return commentAnnotationObject;
    return commentAnnotationObject?.value;
}

export function toCamelCase(text: string) {
    return text
        .replace(/([-_ ]){1,}/g, " ")
        .split(/[-_ ]/)
        .reduce((cur, acc) => {
            return cur + acc[0].toUpperCase() + acc.substring(1);
        });
}

/**
 * Name functions
 */
export function iriToName(iri: string): string {
    try {
        const url = new URL(iri);
        let name: string;
        if (url.hash) {
            name = url.hash.slice(1);
        } else {
            const splitPathname = url.pathname.split("/");
            name = splitPathname[splitPathname.length - 1];
        }
        return name.replace(/(?<!^)Shape$/, "");
    } catch (err) {
        return iri;
    }
}

export function nameFromAnnotationOrId(obj: {
    id?: string;
    annotations?: Annotation[];
}): string | undefined {
    const labelAnnotationObject = obj.annotations?.find(
        (annotation) =>
            annotation.predicate ===
            "http://www.w3.org/2000/01/rdf-schema#label"
    )?.object;
    if (labelAnnotationObject && typeof labelAnnotationObject === "string") {
        return toCamelCase(iriToName(labelAnnotationObject));
    } else if (
        labelAnnotationObject &&
        typeof labelAnnotationObject !== "string"
    ) {
        return toCamelCase(labelAnnotationObject.value);
    } else if (obj.id) {
        return toCamelCase(iriToName(obj.id));
    }
}

// Helper: classify a dom.Type into categories we care about.
function isObjectLike(t: dom.Type): boolean {
    return (
        (t as dom.ObjectType).kind === "object" ||
        (t as dom.InterfaceDeclaration).kind === "interface"
    );
}

function isPrimitiveLike(t: dom.Type): boolean {
    const kind = (t as any)?.kind;
    if (kind === "name") return true; // named references and intrinsic tokens
    if (kind === "union") {
        return (t as dom.UnionType).members.every(isPrimitiveLike);
    }
    if (kind === "type-parameter") return true;
    // Fallback: treat scalar intrinsic tokens as primitive
    const intrinsicKinds = new Set([
        "string",
        "number",
        "boolean",
        "undefined",
    ]);
    return intrinsicKinds.has(kind || "");
}

// Small helpers for unions and alias naming
function isUnionType(t: dom.Type): t is dom.UnionType {
    return (t as any)?.kind === "union";
}

function unionOf(types: dom.Type[]): dom.Type {
    const flat: dom.Type[] = [];
    const collect = (tt: dom.Type) => {
        if (isUnionType(tt)) tt.members.forEach(collect);
        else flat.push(tt);
    };
    types.forEach(collect);
    const seen = new Set<string>();
    const unique: dom.Type[] = [];
    flat.forEach((m) => {
        const key =
            (m as any).name ||
            (m as any).value ||
            (m as any).kind + JSON.stringify(m);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(m);
        }
    });
    if (unique.length === 0) return dom.type.any as unknown as dom.Type;
    if (unique.length === 1) return unique[0];
    return dom.create.union(unique);
}

function setOf(inner: dom.Type): dom.NamedTypeReference {
    return {
        kind: "name",
        name: "Set",
        typeArguments: [inner],
    } as any;
}

function recordOf(key: dom.Type, value: dom.Type): dom.NamedTypeReference {
    return {
        kind: "name",
        name: "Record",
        typeArguments: [key, value],
    } as any;
}

// Note: aliasing helpers previously used in earlier versions were removed.

// Property name collision resolution using predicate IRI mapping
const predicateIriByProp = new WeakMap<dom.PropertyDeclaration, string>();

// Note: collisions are handled by annotateReadablePredicates pre-pass.

// Merge duplicate properties without introducing LdSet. If a property appears multiple
// times (e.g., via EXTENDS or grouped expressions) we:
//  - union the types (flattening existing unions)
//  - if one side is Set<T> and the other is plain U, produce Set<T|U>
//  - if both are Set<A>, Set<B> -> Set<A|B>
//  - preserve optional flag if any occurrence optional
function dedupeCompactProperties(
    props: dom.PropertyDeclaration[]
): dom.PropertyDeclaration[] {
    const isSetRef = (t: dom.Type): t is dom.NamedTypeReference =>
        (t as any).kind === "name" && (t as any).name === "Set";
    const getSetInner = (t: dom.Type): dom.Type =>
        isSetRef(t) ? (t as any).typeArguments[0] : t;

    // Group by composite key (name + predicate IRI)
    const groups = new Map<string, dom.PropertyDeclaration[]>();
    for (const p of props) {
        const pred = predicateIriByProp.get(p) || "";
        const key = `${p.name}\u0000${pred}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
    }

    const merged: dom.PropertyDeclaration[] = [];
    for (const [, group] of groups) {
        if (group.length === 1) {
            merged.push(group[0]);
            continue;
        }
        let acc = group[0];
        for (let i = 1; i < group.length; i++) {
            const next = group[i];
            const accSet = isSetRef(acc.type);
            const nextSet = isSetRef(next.type);
            let mergedType: dom.Type;
            if (accSet && nextSet) {
                mergedType = setOf(
                    unionOf([getSetInner(acc.type), getSetInner(next.type)])
                );
            } else if (accSet && !nextSet) {
                mergedType = setOf(unionOf([getSetInner(acc.type), next.type]));
            } else if (!accSet && nextSet) {
                mergedType = setOf(unionOf([acc.type, getSetInner(next.type)]));
            } else {
                mergedType = unionOf([acc.type, next.type]);
            }
            const optional =
                acc.flags === dom.DeclarationFlags.Optional ||
                next.flags === dom.DeclarationFlags.Optional
                    ? dom.DeclarationFlags.Optional
                    : dom.DeclarationFlags.None;
            const mergedProp = dom.create.property(
                acc.name,
                mergedType,
                optional
            );
            mergedProp.jsDocComment =
                acc.jsDocComment && next.jsDocComment
                    ? `${acc.jsDocComment} | ${next.jsDocComment}`
                    : acc.jsDocComment || next.jsDocComment;
            const pred =
                predicateIriByProp.get(acc) || predicateIriByProp.get(next);
            if (pred) predicateIriByProp.set(mergedProp, pred);
            acc = mergedProp;
        }
        merged.push(acc);
    }
    return merged;
}

/** Add `@id` and `@graph` optional readonly props for nested objects */
function addIdAndGraphProperties(t: dom.Type): dom.Type {
    if ((t as any)?.kind === "object") {
        const members = (t as any).members as
            | dom.PropertyDeclaration[]
            | undefined;
        if (!members) return t;

        const props = (members.filter?.((m: any) => m?.kind === "property") ||
            []) as dom.PropertyDeclaration[];
        if (!props.some((m) => m.name === "@id")) {
            members.unshift(
                dom.create.property(
                    "@id",
                    dom.create.namedTypeReference("IRI"),
                    dom.DeclarationFlags.Optional | dom.DeclarationFlags.ReadOnly
                ),
                dom.create.property(
                    "@graph",
                    dom.create.namedTypeReference("IRI"),
                    dom.DeclarationFlags.Optional | dom.DeclarationFlags.ReadOnly
                )
            );
        }
    }
    return t;
}

function addIdAndGraphIriToUnionObjects(t: dom.Type): dom.Type {
    if (!isUnionType(t)) return t;
    const members = (t as dom.UnionType).members.map((m) =>
        (m as any)?.kind === "object" ? addIdAndGraphProperties(m) : m
    );
    return dom.create.union(members);
}

// Create property and attach predicate IRI and annotations consistently
function createProperty(
    name: string,
    type: dom.Type,
    flags: dom.DeclarationFlags,
    predicateIri?: string,
    annotations?: Annotation[]
): dom.PropertyDeclaration {
    const prop = dom.create.property(name, type, flags);
    if (predicateIri) predicateIriByProp.set(prop, predicateIri);
    const cmt = commentFromAnnotations(annotations) || "";
    prop.jsDocComment = cmt
        ? `${cmt}\n\nOriginal IRI: ${predicateIri ?? ""}`.trim()
        : `Original IRI: ${predicateIri ?? ""}`;
    return prop;
}

export const ShexJTypingTransformerCompact = ShexJTraverser.createTransformer<
    {
        Schema: { return: dom.TopLevelDeclaration[] };
        ShapeDecl: { return: dom.InterfaceDeclaration };
        Shape: { return: dom.InterfaceDeclaration };
        EachOf: { return: dom.ObjectType | dom.InterfaceDeclaration };
        TripleConstraint: { return: dom.PropertyDeclaration };
        NodeConstraint: { return: dom.Type };
        ShapeOr: { return: dom.UnionType };
        ShapeAnd: { return: dom.IntersectionType };
        ShapeNot: { return: never };
        ShapeExternal: { return: never };
    },
    null
>({
    // Transformer from Schema to interfaces
    Schema: {
        transformer: async (_schema, getTransformedChildren) => {
            const transformedChildren = await getTransformedChildren();
            const interfaces: dom.TopLevelDeclaration[] = [];
            transformedChildren.shapes?.forEach((shape) => {
                if (
                    typeof shape !== "string" &&
                    (shape as dom.InterfaceDeclaration).kind === "interface"
                ) {
                    interfaces.push(shape as dom.InterfaceDeclaration);
                }
            });
            return interfaces;
        },
    },

    // Transformer from ShapeDecl to interface
    ShapeDecl: {
        transformer: async (shapeDecl, getTransformedChildren) => {
            const shapeName = nameFromAnnotationOrId(shapeDecl) || "Shape";
            const { shapeExpr } = await getTransformedChildren();
            if ((shapeExpr as dom.InterfaceDeclaration).kind === "interface") {
                const shapeInterface = shapeExpr as ShapeInterfaceDeclaration;
                shapeInterface.name = shapeName;
                // Preserve shape id for downstream shapeTypes generation
                shapeInterface.shapeId = shapeDecl.id;
                
                // Ensure root-level @id and @graph are present as readonly (mandatory)
                const hasId = shapeInterface.members.find(
                    (m) => m.kind === "property" && m.name === "@id"
                );
                const hasGraph = shapeInterface.members.find(
                    (m) => m.kind === "property" && m.name === "@graph"
                );
                
                if (!hasId || !hasGraph) {
                    const propsToAdd: dom.PropertyDeclaration[] = [];
                    if (!hasGraph) {
                        propsToAdd.push(
                            dom.create.property(
                                "@graph",
                                dom.create.namedTypeReference("IRI"),
                                dom.DeclarationFlags.ReadOnly
                            )
                        );
                    }
                    if (!hasId) {
                        propsToAdd.push(
                            dom.create.property(
                                "@id",
                                dom.create.namedTypeReference("IRI"),
                                dom.DeclarationFlags.ReadOnly
                            )
                        );
                    }
                    shapeInterface.members.unshift(...propsToAdd);
                }
                return shapeInterface;
            }
            throw new Error(
                "Unsupported direct shape expression on ShapeDecl for compact format."
            );
        },
    },

    // Transformer from Shape to interface
    Shape: {
        transformer: async (
            _shape,
            getTransformedChildren,
            setReturnPointer
        ) => {
            const newInterface: ShapeInterfaceDeclaration =
                dom.create.interface("");
            setReturnPointer(newInterface);
            const transformedChildren = await getTransformedChildren();
            if (
                typeof transformedChildren.expression !== "string" &&
                transformedChildren.expression &&
                ((transformedChildren.expression as dom.ObjectType).kind ===
                    "object" ||
                    (transformedChildren.expression as dom.InterfaceDeclaration)
                        .kind === "interface")
            ) {
                newInterface.members.push(
                    ...(transformedChildren.expression as dom.ObjectType)
                        .members
                );
            } else if (
                (transformedChildren.expression as dom.PropertyDeclaration)
                    ?.kind === "property"
            ) {
                newInterface.members.push(
                    transformedChildren.expression as dom.PropertyDeclaration
                );
            }
            if (transformedChildren.extends) {
                transformedChildren.extends.forEach((ext) => {
                    const extInt = ext as dom.InterfaceDeclaration;
                    if (extInt.kind === "interface") {
                        const merged = [
                            ...extInt.members.filter(
                                (m) =>
                                    !(m.kind === "property" && m.name === "@id")
                            ),
                            ...newInterface.members,
                        ].filter(
                            (m): m is dom.PropertyDeclaration =>
                                m.kind === "property"
                        );
                        newInterface.members = dedupeCompactProperties(merged);
                    }
                });
            }
            // Final pass: ensure only a single @id and a single @graph property, normalize to readonly
            const idSeen = new Set<number>();
            const graphSeen = new Set<number>();
            newInterface.members = newInterface.members.filter((m, idx) => {
                if (m.kind !== "property") return true;
                
                if (m.name === "@id") {
                    if (idSeen.size === 0) {
                        idSeen.add(idx);
                        // normalize id type to IRI and make readonly
                        m.type = dom.create.namedTypeReference("IRI");
                        m.flags = dom.DeclarationFlags.ReadOnly;
                        return true;
                    }
                    return false;
                }
                
                if (m.name === "@graph") {
                    if (graphSeen.size === 0) {
                        graphSeen.add(idx);
                        // normalize graph type to IRI and make readonly
                        m.type = dom.create.namedTypeReference("IRI");
                        m.flags = dom.DeclarationFlags.ReadOnly;
                        return true;
                    }
                    return false;
                }
                
                return true;
            });
            return newInterface;
        },
    },

    // Transformer from EachOf to object type. EachOf contains the `expressions` array of properties (TripleConstraint)
    EachOf: {
        transformer: async (
            eachOf,
            getTransformedChildren,
            setReturnPointer
        ) => {
            const transformedChildren = await getTransformedChildren();
            const name = nameFromAnnotationOrId(eachOf);

            const objectType = name
                ? dom.create.interface(name)
                : dom.create.objectType([]);
            setReturnPointer(objectType);
            const inputProps: dom.PropertyDeclaration[] = [];
            transformedChildren.expressions.forEach((expr) => {
                if (!expr || typeof expr === "string") return;
                const kind = (expr as any).kind;
                if (kind === "property") {
                    inputProps.push(expr as dom.PropertyDeclaration);
                } else if (kind === "object" || kind === "interface") {
                    const mlist = (
                        expr as dom.ObjectType | dom.InterfaceDeclaration
                    ).members;
                    mlist.forEach((m) => {
                        if ((m as any).kind === "property") {
                            inputProps.push(m as dom.PropertyDeclaration);
                        }
                    });
                }
            });
            const deduped = dedupeCompactProperties(inputProps);
            objectType.members.push(...deduped);
            return objectType;
        },
    },

    // Transformer from triple constraints to type properties.
    TripleConstraint: {
        transformer: async (
            tripleConstraint,
            getTransformedChildren,
            _setReturnPointer,
            node
        ) => {
            const transformedChildren = await getTransformedChildren();
            const baseName = (tripleConstraint as any)
                .readablePredicate as string;

            const max = tripleConstraint.max;
            const isPlural = max === -1 || (max !== undefined && max !== 1);
            const isOptional = tripleConstraint.min === 0;

            let valueType: dom.Type = dom.type.any;
            if (transformedChildren.valueExpr)
                valueType = transformedChildren.valueExpr as dom.Type;

            // Generic: If valueExpr is a NodeConstraint with concrete `values`,
            // build a union of named alias references derived from those values.
            // Works for any predicate (not only rdf:type).
            const originalValueExpr: any = (tripleConstraint as any)?.valueExpr;
            if (
                originalValueExpr &&
                typeof originalValueExpr === "object" &&
                originalValueExpr.type === "NodeConstraint" &&
                Array.isArray(originalValueExpr.values) &&
                originalValueExpr.values.length > 0
            ) {
                const aliasRefs: dom.Type[] = [];
                for (const v of originalValueExpr.values) {
                    // valueSetValue can be string IRIREF or ObjectLiteral or other stems; handle IRIREF and ObjectLiteral
                    if (typeof v === "string") {
                        // For concrete IRIREF values, use a string literal of the IRI
                        aliasRefs.push(dom.type.stringLiteral(v));
                    } else if (v && typeof v === "object") {
                        // ObjectLiteral has `value`; use that literal as alias base
                        const literalVal = (v as any).value as
                            | string
                            | undefined;
                        if (literalVal) {
                            // For explicit literal values, use a string literal type
                            aliasRefs.push(dom.type.stringLiteral(literalVal));
                        }
                        // For other union members (IriStem, ranges, Language, etc.), skip here; fall back covered below if none collected
                    }
                }
                if (aliasRefs.length > 0) {
                    const union = unionOf(aliasRefs);
                    const final = isPlural ? setOf(union) : union;
                    return createProperty(
                        baseName,
                        final,
                        isOptional
                            ? dom.DeclarationFlags.Optional
                            : dom.DeclarationFlags.None,
                        tripleConstraint.predicate,
                        tripleConstraint.annotations
                    );
                }
            }

            if (
                (valueType as dom.InterfaceDeclaration).kind === "interface" &&
                !(valueType as dom.InterfaceDeclaration).name
            ) {
                valueType = dom.create.objectType(
                    (valueType as dom.InterfaceDeclaration)
                        .members as dom.PropertyDeclaration[]
                );
            }

            // Normalize NodeConstraint returned object forms for IRIs into IRI
            // Heuristic: existing transformer (compact) returns string/number/boolean OR object/interface.
            // We treat any simple string/number/boolean/name as primitive.

            // Determine category
            const objLike = isObjectLike(valueType);
            const isUnion =
                (valueType as unknown as { kind?: string })?.kind === "union";
            const unionMembers: dom.Type[] = isUnion
                ? (valueType as dom.UnionType).members
                : [];
            const unionAllObjLike =
                isUnion &&
                unionMembers.length > 0 &&
                unionMembers.every(isObjectLike);
            const primLike = isPrimitiveLike(valueType);
            if (
                !primLike &&
                !objLike &&
                (valueType as dom.UnionType).kind === "union"
            ) {
                const u = valueType as dom.UnionType;
                const hasObj = u.members.some(isObjectLike);
                const hasPrim = u.members.some(isPrimitiveLike);
                if (isPlural && hasObj && hasPrim) {
                    throw new Error(
                        `Mixed plural union (object + primitive) not supported for predicate ${tripleConstraint.predicate}`
                    );
                }
            }

            let finalType: dom.Type;
            if (isPlural) {
                if (objLike || unionAllObjLike) {
                    if (
                        (valueType as dom.InterfaceDeclaration).kind ===
                            "interface" &&
                        (valueType as dom.InterfaceDeclaration).name
                    ) {
                        const ifaceName = (
                            valueType as dom.InterfaceDeclaration
                        ).name;
                        // Set of full object instances
                        finalType = setOf(
                            dom.create.namedTypeReference(ifaceName)
                        );
                    } else {
                        // Anonymous object or union of anonymous/interface objects
                        let valueForSet: dom.Type = valueType;
                        if (unionAllObjLike) {
                            // Ensure each union member has @id and @graph as optional readonly
                            valueForSet =
                                addIdAndGraphIriToUnionObjects(valueType);
                        } else {
                            valueForSet = addIdAndGraphProperties(valueType);
                        }
                        finalType = setOf(valueForSet);
                    }
                } else {
                    finalType = setOf(valueType);
                }
            } else {
                // Singular
                // If anonymous object or union of object-like types, ensure id: IRI is present (mandatory)
                if (objLike) {
                    if ((valueType as dom.ObjectType).kind === "object") {
                        valueType = addIdAndGraphProperties(valueType);
                    }
                } else if (isUnion && unionAllObjLike) {
                    valueType = addIdAndGraphIriToUnionObjects(valueType);
                }
                // Singular: always the interface/object type itself (never Id union)
                if (
                    (valueType as dom.InterfaceDeclaration).kind ===
                        "interface" &&
                    (valueType as dom.InterfaceDeclaration).name
                ) {
                    finalType = dom.create.namedTypeReference(
                        (valueType as dom.InterfaceDeclaration).name
                    );
                } else {
                    finalType = valueType;
                }
            }
            return createProperty(
                baseName,
                finalType,
                isOptional
                    ? dom.DeclarationFlags.Optional
                    : dom.DeclarationFlags.None,
                tripleConstraint.predicate,
                tripleConstraint.annotations
            );
        },
    },

    // Transformer from node constraint to type
    NodeConstraint: {
        transformer: async (nodeConstraint) => {
            if (nodeConstraint.datatype) {
                switch (nodeConstraint.datatype) {
                    case "http://www.w3.org/2001/XMLSchema#boolean":
                        return dom.type.boolean;
                    case "http://www.w3.org/2001/XMLSchema#byte":
                    case "http://www.w3.org/2001/XMLSchema#decimal":
                    case "http://www.w3.org/2001/XMLSchema#double":
                    case "http://www.w3.org/2001/XMLSchema#float":
                    case "http://www.w3.org/2001/XMLSchema#int":
                    case "http://www.w3.org/2001/XMLSchema#integer":
                    case "http://www.w3.org/2001/XMLSchema#long":
                    case "http://www.w3.org/2001/XMLSchema#negativeInteger":
                    case "http://www.w3.org/2001/XMLSchema#nonNegativeInteger":
                    case "http://www.w3.org/2001/XMLSchema#nonPositiveInteger":
                    case "http://www.w3.org/2001/XMLSchema#positiveInteger":
                    case "http://www.w3.org/2001/XMLSchema#short":
                    case "http://www.w3.org/2001/XMLSchema#unsignedLong":
                    case "http://www.w3.org/2001/XMLSchema#unsignedInt":
                    case "http://www.w3.org/2001/XMLSchema#unsignedShort":
                    case "http://www.w3.org/2001/XMLSchema#unsignedByte":
                        return dom.type.number;
                    default:
                        return dom.type.string; // treat most as string
                }
            }
            if (nodeConstraint.nodeKind) {
                switch (nodeConstraint.nodeKind) {
                    case "iri":
                        return dom.create.namedTypeReference("IRI");
                    case "bnode":
                        return dom.type.string; // opaque id as string
                    case "nonliteral":
                        return dom.create.namedTypeReference("IRI");
                    case "literal":
                    default:
                        return dom.type.string;
                }
            }
            if (nodeConstraint.values) {
                const u = dom.create.union([]);
                nodeConstraint.values.forEach((v) => {
                    if (typeof v === "string")
                        u.members.push(dom.type.stringLiteral(v));
                });
                if (!u.members.length) return dom.type.string;
                if (u.members.length === 1) return u.members[0];
                return u;
            }
            return dom.type.any;
        },
    },

    // Transformer from ShapeOr to union type
    ShapeOr: {
        transformer: async (_shapeOr, getTransformedChildren) => {
            const tc = await getTransformedChildren();

            return dom.create.union(tc.shapeExprs as dom.Type[]);
        },
    },

    // Transformer from ShapeAnd to intersection type
    ShapeAnd: {
        transformer: async (_shapeAnd, getTransformedChildren) => {
            const tc = await getTransformedChildren();
            const valid: dom.Type[] = [];
            tc.shapeExprs.forEach((t) => {
                if (typeof t === "object") valid.push(t);
            });
            return dom.create.intersection(valid);
        },
    },

    // Transformer from ShapeNot to type - not supported.
    ShapeNot: {
        transformer: async () => {
            throw new Error("ShapeNot not supported (compact)");
        },
    },

    // Transformer from ShapeExternal to type - not supported.
    ShapeExternal: {
        transformer: async () => {
            throw new Error("ShapeExternal not supported (compact)");
        },
    },
});
