import type { Predicate, Shape, Schema } from "@nextgraph-monorepo/ng-shex-orm";

/**
 * Build a SPARQL CONSTRUCT query from a ShapeConstraint definition.
 * The WHERE mirrors the graph template. Optional predicates (min=0) are wrapped in OPTIONAL in WHERE
 * but still appear in the CONSTRUCT template so that matched triples are constructed.
 */
export function buildConstructQuery(
    shape: Shape,
    schema: Schema,
    options?: SparqlBuildOptions
): string {
    const ctx: BuildContext = { usedVars: new Set<string>() };
    const prefixes = prefixesToText(options?.prefixes);
    const subject = shape.iri;

    const templateLines: string[] = [];
    const whereLines: string[] = [];
    const postFilters: string[] = [];
    const valuesBlocks: string[] = [];

    const rootVar =
        subject.startsWith("?") || subject.startsWith("$")
            ? subject
            : uniqueVar(ctx, "s");
    if (!subject.startsWith("?") && !subject.startsWith("$")) {
        valuesBlocks.push(valuesBlock(rootVar, [subject] as any));
    }

    const predicates = Array.isArray(shape.predicates)
        ? shape.predicates
        : [...shape.predicates];
    for (const pred of predicates) {
        addConstructPattern(
            ctx,
            pred,
            rootVar,
            templateLines,
            whereLines,
            postFilters,
            valuesBlocks,
            options
        );
    }

    const graphWrap = (body: string) =>
        options?.graph
            ? `GRAPH ${toIriOrCurie(options.graph)} {\n${body}\n}`
            : body;

    const where = [
        ...valuesBlocks,
        graphWrap(whereLines.join("\n")),
        ...postFilters,
    ]
        .filter(Boolean)
        .join("\n");

    const template = templateLines.join("\n");

    return [prefixes, `CONSTRUCT {`, template, `} WHERE {`, where, `}`].join(
        "\n"
    );
}

function addConstructPattern(
    ctx: BuildContext,
    pred: Predicate,
    subjectVar: string,
    template: string[],
    where: string[],
    postFilters: string[],
    valuesBlocks: string[],
    options?: SparqlBuildOptions
) {
    const p = `<${pred.predicateUri}>`;
    const objVar = uniqueVar(ctx, pred.readablePredicate);

    const triple = `${subjectVar} ${p} ${objTerm} .`;

    const isOptional =
        (pred.minCardinality ?? 0) === 0 &&
        (options?.includeOptionalForMinZero ?? true);

    if (pred.type === "nested" && pred.nestedShape) {
        template.push(triple);
        const nestedBody: string[] = [triple];
        const nestedPreds = pred.nestedShape.predicates;

        for (const n of nestedPreds) {
            addConstructPattern(
                ctx,
                n,
                objTerm,
                template,
                nestedBody,
                postFilters,
                valuesBlocks,
                options
            );
        }
        const block = nestedBody.join("\n");
        where.push(isOptional ? `OPTIONAL {\n${block}\n}` : block);
        return;
    }

    // Non-nested
    template.push(triple);
    const blockLines: string[] = [triple];

    if (pred.type === "literal" && pred.literalValue !== undefined) {
        if (Array.isArray(pred.literalValue)) {
            valuesBlocks.push(valuesBlock(objVar, pred.literalValue as any[]));
        } else {
            const lit =
                typeof pred.literalValue === "string" ||
                typeof pred.literalValue === "number" ||
                typeof pred.literalValue === "boolean"
                    ? pred.literalValue
                    : String(pred.literalValue);
            postFilters.push(
                `FILTER(${objVar} = ${typeof lit === "string" ? `"${String(lit).replace(/"/g, '\\"')}"` : lit})`
            );
        }
    }

    const block = blockLines.join("\n");
    where.push(isOptional ? `OPTIONAL {\n${block}\n}` : block);
}

export type LiteralKind =
    | "number"
    | "string"
    | "boolean"
    | "nested"
    | "literal";

export interface SparqlBuildOptions {
    prefixes?: Record<string, string>;
    graph?: string; // IRI of the named graph to query, if any
    includeOptionalForMinZero?: boolean; // default true
}

export const defaultPrefixes: Record<string, string> = {
    xsd: "http://www.w3.org/2001/XMLSchema#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
};

export function prefixesToText(prefixes?: Record<string, string>): string {
    const all = { ...defaultPrefixes, ...(prefixes ?? {}) };
    return Object.entries(all)
        .map(([p, iri]) => `PREFIX ${p}: <${iri}>`)
        .join("\n");
}

export function safeVarName(name: string): string {
    const base = name
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/^([0-9])/, "_$1")
        .slice(0, 60);
    return base || "v";
}

export function varToken(name: string): string {
    const n =
        name.startsWith("?") || name.startsWith("$") ? name.slice(1) : name;
    return `?${safeVarName(n)}`;
}

export function formatLiteral(value: string | number | boolean): string {
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
    // default string literal
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
}

export function formatTermForValues(value: string | number | boolean): string {
    if (typeof value === "number" || typeof value === "boolean")
        return formatLiteral(value);
    // strings: detect IRI or CURIE and keep raw; otherwise quote
    const v = value.trim();
    const looksLikeIri = v.startsWith("<") && v.endsWith(">");
    const looksLikeHttp = v.includes("://");
    const looksLikeCurie =
        /^[A-Za-z_][A-Za-z0-9_-]*:.+$/u.test(v) && !looksLikeHttp;
    if (looksLikeIri || looksLikeHttp || looksLikeCurie) {
        return looksLikeHttp ? `<${v}>` : v;
    }
    return formatLiteral(v);
}

export function valuesBlock(
    varName: string,
    values: Array<string | number | boolean>
): string {
    const rendered = values.map(formatTermForValues).join(" ");
    return `VALUES ${varName} { ${rendered} }`;
}

export interface BuildContext {
    // Tracks used variable names to avoid collisions
    usedVars: Set<string>;
}

export function uniqueVar(ctx: BuildContext, base: string): string {
    let candidate = varToken(base);
    if (!ctx.usedVars.has(candidate)) {
        ctx.usedVars.add(candidate);
        return candidate;
    }
    let i = 2;
    while (ctx.usedVars.has(`${candidate}_${i}`)) i++;
    const unique = `${candidate}_${i}`;
    ctx.usedVars.add(unique);
    return unique;
}

export default buildConstructQuery;
