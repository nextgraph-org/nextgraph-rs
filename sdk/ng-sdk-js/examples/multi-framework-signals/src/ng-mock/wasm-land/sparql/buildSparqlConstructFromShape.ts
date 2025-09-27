import type { Predicate, Shape, Schema } from "@nextgraph-monorepo/ng-shex-orm";

export const buildConstructQuery = ({
    schema,
    shapeId,
}: {
    schema: Schema;
    shapeId: keyof Schema;
}): string => {
    const rootShape = schema[shapeId];

    const constructStatements: {
        s: string;
        p: string;
        o: string;
        optional: boolean;
        literals: Predicate["literalValue"];
    }[] = [];

    const idToVarName: Record<string, string> = {};
    const getVarNameFor = (id: string) => {
        const currentName = idToVarName[id];
        if (currentName) return currentName;

        const newVar = `o${Object.entries(idToVarName).length + 1}`;
        idToVarName[id] = newVar;
        return newVar;
    };

    // Create s,p,o records where subject and object var names are mapped to shape or predicate ids.
    const addTriples = (shape: Shape) => {
        const predicates = shape.predicates;
        const shapeId = shape.iri;

        for (const pred of predicates) {
            const subjectVarName = getVarNameFor(shapeId);

            if (pred.dataTypes === "nested") {
                if (typeof pred.nestedShape !== "string")
                    throw new Error("Nested shapes must be by reference");

                // If a name for this shape was assigned already, it's triples have been added
                // and we don't have to recurse.
                const shapeAlreadyRegistered = !!idToVarName[pred.nestedShape];

                const shapeVarName = getVarNameFor(pred.nestedShape);

                constructStatements.push({
                    s: `?${subjectVarName}`,
                    p: `<${pred.iri}>`,
                    o: `?${shapeVarName}`,
                    optional: pred.minCardinality < 1,
                    literals: pred.literalValue,
                    // TODO: eitherOf ?
                });

                if (!shapeAlreadyRegistered)
                    addTriples(schema[pred.nestedShape]);
            } else {
                const objVarName = getVarNameFor(
                    shapeId + "__separator__" + pred.iri
                );

                constructStatements.push({
                    s: `?${subjectVarName}`,
                    p: `<${pred.iri}>`,
                    o: `?${objVarName}`,
                    optional: pred.minCardinality < 1,
                    literals: pred.literalValue,
                    // TODO: eitherOf ?
                });
            }
        }
    };

    addTriples(rootShape);

    const construct = `CONSTRUCT {
${constructStatements.map(({ s, p, o }) => `  ${s} ${p} ${o} .\n`).join("")} }`;

    const statementToWhere = ({
        s,
        p,
        o,
        optional,
    }: {
        s: string;
        p: string;
        o: string;
        optional: boolean;
    }) => {
        if (optional) return `  OPTIONAL { ${s} ${p} ${o} . }\n`;
        else return `  ${s} ${p} ${o} .\n`;
    };

    const literalToSparqlFormat = (
        literal: string | number | boolean
    ): string => {
        if (typeof literal === "number") return String(literal);
        if (typeof literal === "boolean") return literal ? "true" : "false";
        if (typeof literal === "string") {
            return isIri(literal)
                ? `<${literal}>`
                : `"${escapeString(literal)}"`;
        }
        return `"${String(literal)}"`;
    };

    // Filters for optional values.
    const filters = constructStatements
        .filter((statement) => statement.literals !== undefined)
        .map((statement) => {
            const vals = arrayOf(statement.literals!);
            if (vals.length === 0) return "";
            if (vals.length === 1) {
                return `  FILTER(${statement.o} = ${literalToSparqlFormat(vals[0]!)})\n`;
            }
            const list = vals.map(literalToSparqlFormat).join(", ");
            return `  FILTER(${statement.o} IN (${list}))\n`;
        })
        .join("");

    const where = `WHERE {
      ${constructStatements.map(statementToWhere).join("")}
      ${filters}
    }`;

    return `${construct}\n${where}`;
};

const arrayOf = <T extends any>(arrayOrLiteral: T | T[]) => {
    if (typeof arrayOrLiteral === "undefined" || arrayOrLiteral === null)
        return [];
    if (Array.isArray(arrayOrLiteral)) return arrayOrLiteral;
    return [arrayOrLiteral];
};

const isIri = (str: string) => /^[a-zA-Z][a-zA-Z0-9+.-]{1,7}:/.test(str);

const escapeString = (str: string) => str.replace(/["\\]/g, "\\$&");
