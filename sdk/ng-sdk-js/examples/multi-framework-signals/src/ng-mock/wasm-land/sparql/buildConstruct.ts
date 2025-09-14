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
 * Build a SPARQL CONSTRUCT query from a ShapeConstraint definition.
 * The WHERE mirrors the graph template. Optional predicates (min=0) are wrapped in OPTIONAL in WHERE
 * but still appear in the CONSTRUCT template so that matched triples are constructed.
 */
export function buildConstructQuery(
  shape: ShapeConstraint,
  options?: SparqlBuildOptions,
): string {
  const ctx: BuildContext = { usedVars: new Set<string>() };
  const prefixes = prefixesToText(options?.prefixes);
  const subject = toIriOrCurie(shape.subject);

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

  const template = templateLines.join("\n");

  return [prefixes, `CONSTRUCT {`, template, `} WHERE {`, where, `}`].join(
    "\n",
  );
}

function addConstructPattern(
  ctx: BuildContext,
  pred: PredicateConstraint,
  subjectVar: string,
  template: string[],
  where: string[],
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
    template.push(triple);
    const nestedBody: string[] = [triple];
    const nestedPreds = Array.isArray(pred.nested.predicates)
      ? pred.nested.predicates
      : [...pred.nested.predicates];
    for (const n of nestedPreds) {
      addConstructPattern(
        ctx,
        n,
        objTerm,
        template,
        nestedBody,
        postFilters,
        valuesBlocks,
        options,
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
        `FILTER(${objVar} = ${typeof lit === "string" ? `"${String(lit).replace(/"/g, '\\"')}"` : lit})`,
      );
    }
  }

  const block = blockLines.join("\n");
  where.push(isOptional ? `OPTIONAL {\n${block}\n}` : block);
}

export default buildConstructQuery;
