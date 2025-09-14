import type {
  BuildContext,
  PredicateConstraint,
  ShapeConstraint,
  SparqlBuildOptions,
} from "./common";
import {
  predicateToSparql,
  prefixesToText,
  toIriOrCurie,
  uniqueVar,
  valuesBlock,
  varToken,
} from "./common";

/**
 * Build a SPARQL SELECT query from a ShapeConstraint definition.
 * The query matches the shape subject and constraints; optional predicates (min=0) are wrapped in OPTIONAL.
 */
export function buildSelectQuery(
  shape: ShapeConstraint,
  options?: SparqlBuildOptions,
): string {
  const ctx: BuildContext = { usedVars: new Set<string>() };
  const prefixes = prefixesToText(options?.prefixes);
  const subject = toIriOrCurie(shape.subject);

  const selectVars: string[] = [];
  const whereLines: string[] = [];
  const postFilters: string[] = [];
  const valuesBlocks: string[] = [];

  // ensure a consistent root variable when subject is a variable
  const rootVar =
    subject.startsWith("?") || subject.startsWith("$")
      ? subject
      : uniqueVar(ctx, "s");
  if (!subject.startsWith("?") && !subject.startsWith("$")) {
    // bind fixed subject via VALUES for portability
    valuesBlocks.push(valuesBlock(rootVar, [subject] as any));
  }

  const predicates = Array.isArray(shape.predicates)
    ? shape.predicates
    : [...shape.predicates];

  for (const pred of predicates) {
    addPredicatePattern(
      ctx,
      pred,
      rootVar,
      whereLines,
      selectVars,
      postFilters,
      valuesBlocks,
      options,
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

  const select = selectVars.length ? selectVars.join(" ") : "*";

  return [prefixes, `SELECT ${select} WHERE {`, where, `}`].join("\n");
}

function addPredicatePattern(
  ctx: BuildContext,
  pred: PredicateConstraint,
  subjectVar: string,
  where: string[],
  selectVars: string[],
  postFilters: string[],
  valuesBlocks: string[],
  options?: SparqlBuildOptions,
) {
  const p = predicateToSparql(pred.uri);
  const objVar = uniqueVar(ctx, pred.displayName || "o");
  const objTerm =
    pred.type === "nested" &&
    pred.nested?.subject &&
    !pred.nested.subject.match(/^\?|^\$/)
      ? toIriOrCurie(pred.nested.subject)
      : objVar;

  const triple = `${subjectVar} ${p} ${objTerm} .`;

  const isOptional =
    (pred.min ?? 0) === 0 && (options?.includeOptionalForMinZero ?? true);

  if (pred.type === "nested" && pred.nested) {
    // For nested, we select the nested object var and then recurse
    if (objTerm === objVar) selectVars.push(objVar);
    const nestedBody: string[] = [triple];
    const nestedPreds = Array.isArray(pred.nested.predicates)
      ? pred.nested.predicates
      : [...pred.nested.predicates];
    for (const n of nestedPreds) {
      addPredicatePattern(
        ctx,
        n,
        objTerm,
        nestedBody,
        selectVars,
        postFilters,
        valuesBlocks,
        options,
      );
    }
    const block = nestedBody.join("\n");
    where.push(isOptional ? `OPTIONAL {\n${block}\n}` : block);
    return;
  }

  // Non-nested: literals or IRIs
  selectVars.push(objVar);
  const blockLines: string[] = [triple];

  if (pred.type === "literal" && pred.literalValue !== undefined) {
    if (Array.isArray(pred.literalValue)) {
      // VALUES block for IN-like matching
      valuesBlocks.push(valuesBlock(objVar, pred.literalValue as any[]));
    } else {
      // simple equality filter
      const lit =
        typeof pred.literalValue === "string" ||
        typeof pred.literalValue === "number" ||
        typeof pred.literalValue === "boolean"
          ? pred.literalValue
          : String(pred.literalValue);
      postFilters.push(
        `FILTER(${objVar} = ${typeof lit === "string" ? `"${String(lit).replace(/"/g, '\\"')}"` : lit})`,
      );
    }
  }

  const block = blockLines.join("\n");
  where.push(isOptional ? `OPTIONAL {\n${block}\n}` : block);
}

export default buildSelectQuery;
