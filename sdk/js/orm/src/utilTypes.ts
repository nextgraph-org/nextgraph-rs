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
    BaseType,
    DataType,
    Predicate,
    Shape,
    ShapeType,
} from "@ng-org/shex-orm";
import { deepClone } from "./connector/utils.ts";
import { videoSchema } from "./tests/shapes/orm/video.schema.ts";
import { MiruVideoDocumentShapeType } from "./tests/shapes/orm/video.shapeTypes.ts";

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
type OrmDataTypeToType<DT extends DataType> = "string" extends DT["valType"]
    ? string
    : "number" extends DT["valType"]
      ? number
      : "boolean" extends DT["valType"]
        ? boolean
        : "iri" extends DT["valType"]
          ? string
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

type FilterParams<
    ST extends ShapeType<any>,
    ShapeIri extends keyof ST["schema"] = ST["shape"],
    PredName extends PredicateNamesOf<ST, ShapeIri> = PredicateNamesOf<
        ST,
        ShapeIri
    >, // Need extends?
> = {
    /** The shape IRI to filter for, if not the root shape. */
    shapeIri?: ShapeIri;
    predicateName: PredName;
    /** Allowed values. If more than one literal is expressed in a single FilterValType, this means that both are mandatory. */
    values: FilterValType[]; // TODO: We could infer the allowed types more narrowly (as subset of allowed types or literals)
};

type FilterConfig<
    ST extends ShapeType<any>,
    PredName extends PredicateNamesOf<ST, ST["shape"]> = PredicateNamesOf<
        ST,
        ST["shape"]
    >,
> = {
    where: {
        [P in PredName]: PredicateOf<ST, P, ST["shape"]>;
    };
};
type A = typeof MiruVideoDocumentShapeType;
type FCV = FilterConfig<A>;

const createFilterShape = <ST extends ShapeType<any>>(
    shape: ST,
    config: FilterConfig<ST>
) => {
    const filters: FilterParams<ST>[] = config.where;
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
