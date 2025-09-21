import type {
    ShapeType,
    Shape,
    Predicate,
    Schema,
} from "@nextgraph-monorepo/ng-shex-orm";

interface Triple {
    s: string;
    p: string;
    o: string;
}
interface TrackedSubject {
    shape: Shape;
    parentObject?: TrackedSubject;
    valid?: boolean;
    trackedPredicates: Record<string, TrackedPredicate>;
    /** For Sub-objects only */
    untracked?: boolean;
}

interface TrackedPredicate {
    shape: Predicate;
    currentCardinality: number;
    childSubjects?: TrackedSubject[];
}

export function buildObjects(shapeType: ShapeType<any>) {
    //
}

export function onTriplesRemoved(
    trackedSubjects: Record<string, TrackedSubject[]>,
    triplesRemoved: string[][],
    shapeType: ShapeType<any>
) {
    //
}

/**
 * Adds new triples to tracked subjects and creates and returns
 * new tracked (possibly nested) subjects.
 */
export function onTriplesAdded(
    trackedSubjects: Record<string, TrackedSubject[]>,
    triplesAdded: Triple[],
    schema: Schema,
    rootShape?: Shape
): { newTrackedSubjects: Record<string, TrackedSubject[]> } {
    // Track for secondary iterations.
    const newTrackedSubjectsCreated: Record<string, TrackedSubject[]> = {};

    for (const triple of triplesAdded) {
        if (!trackedSubjects[triple.s]) {
            // If rootShape is not set, we are applying the triples new nested objects
            // and we don't create new tracked subjects.
            if (!rootShape) continue;

            // Check if predicate is in root shape type.
            const matchedPredicate = rootShape.predicates.find((p) => triple.p);
            if (!matchedPredicate) {
                // Nothing to track.
                continue;
            }
            // The triple should be tracked. Create new tracked subject.
            const newTrackedSubject: TrackedSubject = {
                shape: rootShape,
                trackedPredicates: {
                    [triple.p]: {
                        shape: matchedPredicate,
                        currentCardinality: 1,
                    },
                },
            };
            trackedSubjects[triple.s] = [newTrackedSubject];
        } else {
            // Add triple to tracked subject(s).
            // In the case of nested shapes, the same subject can be tracked
            // in multiple shapes.
            const trackedSubjectsMatching = trackedSubjects[triple.s];
            for (const trackedSubject of trackedSubjectsMatching) {
                // Is predicate tracked in this subject's shape?
                const matchedPredShape = trackedSubject.shape.predicates.find(
                    (predShape) => predShape.iri === triple.p
                );
                if (!matchedPredShape) continue;
                // Get or create tracked predicate for tracked shape.
                let trackedPredicate =
                    trackedSubject.trackedPredicates[matchedPredShape?.iri];
                if (!trackedSubjects) {
                    trackedPredicate = {
                        currentCardinality: 0,
                        shape: matchedPredShape,
                    };
                }
                // Increase cardinality.
                trackedPredicate.currentCardinality += 1;

                // If predicate shape has nested object, track that too.
                if (trackedPredicate.shape.nestedShape) {
                    const newTrackedObject: TrackedSubject = {
                        shape: schema[matchedPredShape.nestedShape as string],
                        trackedPredicates: {},
                        parentObject: trackedSubject,
                    };
                    // Remember for adding to registry and for re-running on nested shapes.
                    const newTracked = newTrackedSubjectsCreated[triple.o];
                    if (!newTracked)
                        newTrackedSubjectsCreated[triple.o] = [
                            newTrackedObject,
                        ];
                    newTracked.push(newTrackedObject);

                    // Link to parent
                    const childSubjects = trackedPredicate.childSubjects;
                    if (childSubjects) childSubjects.push(newTrackedObject);
                    else trackedPredicate.childSubjects = [newTrackedObject];
                }

                // TODO: Inform tracked subjects about change
            }
        }
    }

    // Rerun triples on new tracked subjects created.
    // Then merge with parent tracked subjects
    const newNestedSubjectsCreated = onTriplesAdded(
        newTrackedSubjectsCreated,
        triplesAdded,
        schema
    );

    // TODO: Is it correct to do this?
    const ret: Record<string, TrackedSubject[]> = {};
    for (const subjectIri of Object.keys(newTrackedSubjectsCreated)) {
        ret[subjectIri] = [
            ...newTrackedSubjectsCreated[subjectIri],
            ...newNestedSubjectsCreated.newTrackedSubjects[subjectIri],
        ];
    }

    // Update Valid invalid

    return { newTrackedSubjects: ret };
}

// Do we have infinite-loop issues?
