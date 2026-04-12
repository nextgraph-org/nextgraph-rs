// Copyright (c) 2025 Laurin Weger, Par le Peuple, NextGraph.org developers
// All rights reserved.
// Licensed under the Apache License, Version 2.0
// <LICENSE-APACHE2 or http://www.apache.org/licenses/LICENSE-2.0>
// or the MIT license <LICENSE-MIT or http://opensource.org/licenses/MIT>,
// at your option. All files in the project carrying such
// notice may not be copied, modified, or distributed except
// according to those terms.
// SPDX-License-Identifier: Apache-2.0 OR MIT

import type {
    DataType,
    Predicate,
    Schema,
    Shape,
    ShapeType,
} from "@ng-org/shex-orm";
import { deepClone, guessIsIri } from "./connector/utils.ts";
import { RootShapeType } from "./tests/shapes/orm/testShape.shapeTypes.ts";
import { Scope } from "./types.ts";

const RDF_TYPE_IRI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

/**
 * Extract a Shape entry from a ShapeType
 * @param ST The `typeof MyShapeType`
 * @param ShapeIri Optional. The IRI of the shape if not the main shape.
 */
type ShapeSchemaOf<
    ST extends ShapeType<any>,
    ShapeIri extends keyof ST["schema"] = ST["shape"],
> = ST["schema"][ShapeIri];

/**
 * Extract the entry from a ShapeType
 * @param ST The `typeof MyShapeType`
 * @param ShapeIri Optional. The IRI of the shape if not the main shape.
 */

type PredicatesOf<
    ST extends ShapeType<any>,
    ShapeIri extends keyof ST["schema"] = ST["shape"],
> = ST["schema"][ShapeIri]["predicates"];

/**
 * Union of readable predicate names for a ShapeType.
 * @param ST The `typeof MyShapeType`
 * @param ShapeIri Optional. The IRI of the shape if not the main shape.
 */
type PredicateNamesOf<
    ST extends ShapeType<any>,
    ShapeIri extends keyof ST["schema"] = ST["shape"],
> = PredicatesOf<ST, ShapeIri>[number]["readablePredicate"];

/**
 * Finds the predicate schema entry by its readablePredicate name.
 * @param ST The `typeof MyShapeType`
 * @param ShapeIri Optional. The IRI of the shape if not the main shape.
 */
type PredicateOf<
    ST extends ShapeType<any>,
    Name extends PredicateNamesOf<ST>,
    ShapeIri extends keyof ST["schema"] = ST["shape"],
> = Extract<
    PredicatesOf<ST, ShapeIri>[number],
    { readonly readablePredicate: Name }
>;

/** The typescript equivalent for an ORM basic datatype (string, number, boolean, iri as string). */
type OrmDataTypeToType<DT extends DataType> =
    DT["literals"] extends Array<any>
        ? Array<DT["literals"][number]>
        : "string" extends DT["valType"]
          ? string
          : "number" extends DT["valType"]
            ? number
            : "boolean" extends DT["valType"]
              ? boolean
              : "iri" extends DT["valType"]
                ? string
                : "shape" extends DT["valType"]
                  ? object
                  : never;

type FilterValType =
    | {
          valType: "number";
          literals: number[];
      }
    | {
          valType: "string";
          literals: string[];
      }
    | {
          valType: "boolean";
          literals: boolean[];
      }
    | {
          valType: "iri";
          literals: string[];
      };

type AllowedTypeFromPredicate<P extends Predicate> = OrmDataTypeToType<
    P["dataTypes"][number]
>;

type NonEmptyArray<T> = [T, ...T[]];
type FlattenArray<T> = T extends Array<infer C> ? FlattenArray<C> : T;
type AllowArray<T, S = FlattenArray<T>> = S | S[];

type WhereConfig<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = {
    [P in Pred as P["readablePredicate"]]?: "shape" extends P["dataTypes"][number]["valType"]
        ? // Nested shape?
          // Only supported if there is a single nested shape
          P["dataTypes"] extends [any]
            ? WhereConfig<
                  ST,
                  P["dataTypes"][number]["shape"] extends string
                      ? P["dataTypes"][number]["shape"]
                      : never
              >
            : never
        : // Basic type
          AllowArray<
              | AllowedTypeFromPredicate<P>
              | { "|gt": AllowedTypeFromPredicate<P> }
              | { "|lt": AllowedTypeFromPredicate<P> }
              | {
                    "|lt": AllowedTypeFromPredicate<P>;
                    "|gt": AllowedTypeFromPredicate<P>;
                }
          >;
};

type SingleKeyObject<T extends Record<string, unknown>> = {
    [K in keyof T]: { [_ in K]: T[K] } & { [_ in Exclude<keyof T, K>]?: never };
}[keyof T];

/**
 * Defines how results are sorted.
 * Must contain a single property with the key being the property to sort by
 * and the value being `"asc"`, `"desc"`.
 */
// TODO: Rust config requires them to be an array.
type OrderByConfigObject<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = SingleKeyObject<{
    [P in Pred as P["maxCardinality"] extends 1
        ? P["readablePredicate"]
        : never]: "shape" extends P["dataTypes"][number]["valType"]
        ? //  No support for ordering by nested objects
          //  OrderByConfigObject<
          //       ST,
          //       P["dataTypes"][number]["shape"] extends string
          //           ? P["dataTypes"][number]["shape"]
          //           : never
          //   >
          never
        : "asc" | "desc";
}>;

type SelectConfig<
    ST extends ShapeType<any>,
    SchemaIri extends keyof ST["schema"] = ST["shape"],
    Pred extends
        ST["schema"][string]["predicates"][number] = ST["schema"][SchemaIri]["predicates"][number],
> = {
    [P in Pred as P["readablePredicate"]]?: "shape" extends P["dataTypes"][number]["valType"]
        ? // Nested shape?
          // Only supported if there is a single nested shape
          P["dataTypes"] extends [any]
            ?
                  | SelectConfig<
                        ST,
                        P["dataTypes"][number]["shape"] extends string
                            ? P["dataTypes"][number]["shape"]
                            : never
                    >
                  | boolean
            : boolean
        : // Basic type
          boolean;
};

type Cursor = string;

type FilterConfig<ST extends ShapeType<any>> = Scope & {
    where?: WhereConfig<ST>;

    /** Property / Properties to sort data by. */
    orderBy?: NonEmptyArray<OrderByConfigObject<ST>> | OrderByConfigObject<ST>;

    /** Optional subset of properties to query. */
    select?: SelectConfig<ST>;

    pageSize?: number;
    // TODO: Revisit
    page?: {
        /** IRI of subject. */
        cursor: Cursor | undefined;
        /** Page size, use negative value to traverse backwards. */
        take: number;
        /** By default, it's set to `1`, to not include cursor itself (like in prisma). Default is 0, if no cursor is given (initial page). */
        skip?: number;
    };

    /**
     * If false, no query is made. Useful in frontend components where not all data is available yet.
     * @default true
     */
    enabled?: boolean;
};

type RST = FilterConfig<typeof RootShapeType>;

const test: RST = {
    graphs: "did:ng:my:nuri:doc",
    subjects: ["some:iri1", "some:iri2", "some:iri3", "some:iri4"],
    where: {
        child3: {
            "@type": ["did:ng:z:Child2"],
            childChild: { childChildNum: 2 },
        },
        // @ts-expect-error
        children1Or2: {},
    },
    orderBy: [
        { anInteger: "desc" },
        {
            child3: { childChild: { childChildNum: "asc" } },
        },
        // @ts-expect-error
        {},
        // @ts-expect-error
        { aDate: "asc", anInteger: "desc" },
    ],
    select: {
        aString: true,
        // @ts-expect-error
        children1Or2: {},
        child3: true,
    },
};

// Then for pagination
//  - Sort returned data (derived)
//  - select based on cursor, take, skip

// (Filter {gt / lt} where clauses)

const createTrackerShape = <ST extends ShapeType<any>>(
    sourceShapeType: ST,
    config: FilterConfig<ST>
) => {
    // 1. Create an empty shape type.
    const trackerShapeType: ShapeType<any> = {
        schema: {
            [sourceShapeType.shape]: {
                iri: sourceShapeType.shape,
                predicates: [],
            },
        },
        // TODO: We could do better than this (something like hash of config)
        shape: "did:ng:z:trackerShape:" + sourceShapeType.shape,
    };

    // 2. Copy type predicate (or if not available all predicates from old schema that have) literal data types -> we can use to pre-filter
    const typePred = sourceShapeType.schema[
        sourceShapeType.shape
    ].predicates.find((p) => p.iri === RDF_TYPE_IRI);
    if (typePred) {
        trackerShapeType.schema[sourceShapeType.shape].predicates.push(
            typePred
        );
    } else {
        // Find any predicate with literal restrictions
        const aLiteralPred = sourceShapeType.schema[
            sourceShapeType.shape
        ].predicates.find((p) => p.dataTypes.some((dt) => dt.literals));
        if (aLiteralPred) {
            trackerShapeType.schema[sourceShapeType.shape].predicates.push(
                deepClone(aLiteralPred)
            );
        } else {
            // Nothing found on root level, we don't pre-filter then.
        }
    }

    // 3. Add where properties to schema;
    if (config.where) {
        addWherePropsToSchema(
            sourceShapeType.schema,
            trackerShapeType.schema,
            sourceShapeType.shape,
            trackerShapeType.shape,
            config.where
        );
    }

    // 4. Add orderBy properties to schema (only properties with cardinality 1).
    if (config.orderBy) {
        for (const orderByObject of [config.orderBy].flat())
            addOrderByPropsToSchema(
                sourceShapeType.schema,
                trackerShapeType.schema,
                sourceShapeType.shape,
                trackerShapeType.shape,
                orderByObject as OrderByConfigObject<any>
            );
    }

    // 5. Create select shapeType, if `select` is given.
    // - Is selectShapeType subset of trackerShapeType?
    //    - yes -> use the same shape types for both
    let selectShapeType: ShapeType<any>;
    if (config.select) {
        // Select config, only add predicates given.

        const selectShapeIri = "did:ng:z:selectShape:" + sourceShapeType.shape;
        selectShapeType = {
            shape: selectShapeIri,
            schema: {
                [selectShapeIri]: { predicates: [], iri: selectShapeIri },
            },
        };
        // Add predicates from select config to select shape type.
        addSelectShapePred(
            sourceShapeType.schema,
            selectShapeType.schema,
            sourceShapeType.shape,
            selectShapeType.shape,
            config.select
        );

        // If the select shape turns out to be a subset of the tracker shape, we can reuse use the tracker shape for both.
        if (
            isShapeSubsetOf(
                selectShapeType!.schema,
                trackerShapeType.schema,
                selectShapeType.shape,
                sourceShapeType.shape
            )
        ) {
            selectShapeType = trackerShapeType;
        }
    } else {
        // No select config, use whole source shape type.
        selectShapeType = sourceShapeType;
    }
};

const isShapeSubsetOf = (
    subsetSchema: Schema,
    supersetSchema: Schema,
    subsetShapeIri: string,
    supersetShapeIri: string
): boolean => {
    for (const subsetPred of subsetSchema[subsetShapeIri].predicates) {
        const supersetPred = supersetSchema[supersetShapeIri].predicates.find(
            (supP) => supP.readablePredicate === subsetPred.readablePredicate
        );

        if (!supersetPred) return false;

        for (const childSubsetShapeIri of subsetPred.dataTypes.flatMap(
            (dt) => dt.shape ?? []
        )) {
            // Find superset shape IRI by the shape IRI which is included in
            // the subset shape IRI (by which it ends).
            const childSupersetShape = supersetPred.dataTypes.find(
                (supDT) =>
                    supDT.shape &&
                    childSubsetShapeIri.endsWith(
                        supDT.shape + "__" + childSubsetShapeIri
                    )
            )!;

            if (
                !isShapeSubsetOf(
                    subsetSchema,
                    supersetSchema,
                    childSubsetShapeIri,
                    childSupersetShape.shape!
                )
            ) {
                return false;
            }
        }
    }

    return true;
};

const addSelectShapePred = (
    sourceSchema: Schema,
    targetSchema: Schema,
    sourceShapeIri: string,
    targetShapeIri: string,
    select: SelectConfig<any>
) => {
    for (const readablePred of Object.keys(select)) {
        const sourcePred = sourceSchema[sourceShapeIri].predicates.find(
            (p) => p.readablePredicate === readablePred
        )!;
        if (!sourcePred) continue;

        if (
            !targetSchema[targetShapeIri].predicates.some(
                (p) => p.readablePredicate === readablePred
            )
        ) {
            targetSchema[targetShapeIri].predicates.push(deepClone(sourcePred));

            // Check if we need recursion
            for (const nestedSourceShapeIri of sourcePred.dataTypes.flatMap(
                (dt) => dt.shape ?? []
            )) {
                const nestedTargetShapeIri =
                    "did:ng:z:selectShape:" + nestedSourceShapeIri;

                // Add child shape if not added yet.
                if (!targetSchema[nestedSourceShapeIri]) {
                    targetSchema[nestedSourceShapeIri] = {
                        iri: nestedSourceShapeIri,
                        predicates: [],
                    };
                }

                addSelectShapePred(
                    sourceSchema,
                    targetSchema,
                    nestedSourceShapeIri,
                    nestedTargetShapeIri,
                    select[readablePred] as SelectConfig<any>
                );
            }
        }
    }
};

const addOrderByPropsToSchema = (
    sourceSchema: Schema,
    targetSchema: Schema,
    sourceShapeIri: string,
    targetShapeIri: string,
    orderBy: OrderByConfigObject<any>
) => {
    for (const readablePred of Object.keys(orderBy)) {
        const sourcePred = sourceSchema[sourceShapeIri].predicates.find(
            (p) => p.readablePredicate === readablePred
        )!;

        // Nested or non-nested config?
        if (
            orderBy[readablePred] === "desc" ||
            orderBy[readablePred] === "asc"
        ) {
            // Prop already added to target shape?
            const propAlreadyAdded = targetSchema[
                targetShapeIri
            ].predicates.some((p) => p.readablePredicate === readablePred);
            if (propAlreadyAdded) continue;

            targetSchema[targetShapeIri].predicates.push(deepClone(sourcePred));
        } else {
            // Nested where

            let targetPred = targetSchema[targetShapeIri].predicates.find(
                (p) => p.readablePredicate === readablePred
            );
            if (!targetPred) {
                targetPred = deepClone(sourcePred);
                const childShapeIri = targetShapeIri + "__" + sourcePred.iri;
                targetPred.dataTypes[0].shape = childShapeIri;
                targetSchema[targetShapeIri].predicates.push(targetPred);

                targetSchema[childShapeIri] = {
                    iri: childShapeIri,
                    predicates: [],
                };
            }

            addOrderByPropsToSchema(
                sourceSchema,
                targetSchema,
                sourcePred.dataTypes[0].shape!,
                targetPred.dataTypes[0].shape!,
                orderBy[readablePred]
            );
        }
    }
};

const addWherePropsToSchema = (
    sourceSchema: Schema,
    targetSchema: Schema,
    sourceShapeIri: string,
    targetShapeIri: string,
    where: WhereConfig<any>
) => {
    for (const readablePred of Object.keys(where)) {
        const sourcePredSchema = sourceSchema[sourceShapeIri].predicates.find(
            (p) => p.readablePredicate === readablePred
        )!;
        const predAllowsString = sourcePredSchema.dataTypes.some(
            (dt) => dt.valType === "string"
        );
        const predAllowsIri = sourcePredSchema.dataTypes.some(
            (dt) => dt.valType === "iri"
        );

        if (!targetSchema[targetShapeIri])
            targetSchema[targetShapeIri] = {
                iri: targetShapeIri,
                predicates: [],
            };

        // Find predicate schema for target or add new one.
        let targetPredSchema = targetSchema[targetShapeIri].predicates.find(
            (p) => p.readablePredicate === readablePred
        );
        if (!targetPredSchema) {
            targetPredSchema = deepClone(sourcePredSchema);
        }
        // Remove existing allowed data types.
        targetPredSchema.dataTypes = [];

        let wherePreds = [where[readablePred]].flat();
        // Add each `where`-config restriction, to the predicate's `dataTypes`.
        for (const allowed in wherePreds) {
            if (typeof allowed === "number") {
                targetPredSchema.dataTypes.push({
                    literals: [allowed],
                    valType: "number",
                });
            } else if (typeof allowed === "boolean") {
                targetPredSchema.dataTypes.push({
                    literals: [allowed],
                    valType: "boolean",
                });
            } else if (typeof allowed === "string") {
                if (predAllowsIri && !predAllowsString) {
                    targetPredSchema.dataTypes.push({
                        literals: [allowed],
                        valType: "iri",
                    });
                } else if (predAllowsString && !predAllowsIri) {
                    targetPredSchema.dataTypes.push({
                        literals: [allowed],
                        valType: "string",
                    });
                } else {
                    // The predicate schema has support for strings and IRIs.
                    // We need to guess the type of `allowed`.
                    if (guessIsIri(allowed)) {
                        targetPredSchema.dataTypes.push({
                            literals: [allowed],
                            valType: "iri",
                        });
                    } else {
                        targetPredSchema.dataTypes.push({
                            literals: [allowed],
                            valType: "string",
                        });
                    }
                }
            } else if (typeof allowed === "object") {
                // Child shape: Add new and with new IRI.
                const childShapeIri =
                    targetShapeIri + "__" + targetPredSchema.iri;
                targetSchema[childShapeIri] = {
                    iri: childShapeIri,
                    predicates: [],
                };
                // Add to target predicate schema.
                targetPredSchema.dataTypes.push({
                    valType: "shape",
                    shape: childShapeIri,
                });

                // Recurse to child where props.
                addWherePropsToSchema(
                    sourceSchema,
                    targetSchema,
                    sourcePredSchema.dataTypes[0].shape!, // The source shape IRI.
                    childShapeIri,
                    where[readablePred]!
                );
            }
        }
    }
};

const copyPredFromOldSchema = (
    shapeType: ShapeType<any>,
    targetShape: Shape,
    predicateShape: Predicate
) => {
    if (!targetShape.predicates.some((p) => p.iri === predicateShape.iri)) {
        // Has literals?
        targetShape.predicates.push(predicateShape);

        // What about nested shapes?
    }
};

// Keep orm subscription for both shapes.
// Create derived sorted array
// Keep pagination state
// Return what's requested.

const createTrackerShape2 = <ST extends ShapeType<any>>(
    shape: ST,
    config: FilterConfig<ST>
) => {
    const filters = config.where;
    const shapeCopy = deepClone(shape);
    const newShape: ShapeType<any> = { shape: shapeCopy.shape, schema: {} };

    for (const filter of filters) {
        // Take the shape IRI of this filter or the default one.
        const shapeIri = filter.shapeIri ?? shapeCopy.shape;

        const shapeEntry = shapeCopy.schema[shapeIri];

        const predicateSchema = shapeEntry.predicates.find(
            (p) => p.readablePredicate === filter.predicateName
        );
        if (!predicateSchema)
            throw Error(
                `Predicate with name "${filter.predicateName}" not found.`
            );

        // Ensure the shape entry exists in the new schema.
        if (!newShape.schema[shapeIri]) {
            newShape.schema[shapeIri] = {
                iri: shapeEntry.iri,
                predicates: [],
            };
        }

        // Add the filtered predicate (merge dataTypes if same predicate is filtered multiple times).
        const existingPred = newShape.schema[shapeIri].predicates.find(
            (p) => p.iri === predicateSchema.iri
        );
        if (existingPred) {
            existingPred.dataTypes.push(...filter.values);
        } else {
            const filteredPredicate: Predicate = {
                ...predicateSchema,
                dataTypes: filter.values,
            };
            newShape.schema[shapeIri].predicates.push(filteredPredicate);
        }

        // If filtering on a nested shape, ensure the parent-to-child connection exists.
        if (shapeIri !== shapeCopy.shape) {
            addParentConnection(shapeCopy, newShape, shapeIri as string);
        }
    }

    return newShape;
};

// TODO: Review

/**
 * Recursively finds and adds the predicate that connects a parent shape.
 */
const addParentConnection = (
    original: ShapeType<any>,
    target: ShapeType<any>,
    childShapeIri: string
) => {
    for (const [parentIri, parentShape] of Object.entries(original.schema)) {
        for (const predicate of parentShape.predicates) {
            const pointsToChild = predicate.dataTypes.some(
                (dt) => dt.valType === "shape" && dt.shape === childShapeIri
            );
            if (!pointsToChild) continue;

            // Ensure parent shape entry exists.
            if (!target.schema[parentIri]) {
                target.schema[parentIri] = {
                    iri: parentShape.iri,
                    predicates: [],
                };
            }

            // Add the connecting predicate if not already present.
            const alreadyAdded = target.schema[parentIri].predicates.some(
                (p) => p.iri === predicate.iri
            );
            if (!alreadyAdded) {
                target.schema[parentIri].predicates.push(deepClone(predicate));
            }

            // If the parent is itself nested, recurse upward.
            if (parentIri !== original.shape) {
                addParentConnection(original, target, parentIri);
            }
        }
    }
};
