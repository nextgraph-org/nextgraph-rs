/**
 * Shared helpers and types to build SPARQL queries from ShapeConstraint
 */

export type LiteralKind =
  | "number"
  | "string"
  | "boolean"
  | "nested"
  | "literal";

export interface PredicateConstraint {
  displayName: string;
  uri: string;
  type: LiteralKind;
  literalValue?: number | string | boolean | number[] | string[];
  nested?: ShapeConstraint;
  min: number;
  max: number;
  currentCount: number;
}

export interface ShapeConstraint {
  subject: string;
  // In upstream code this is typed as a 1-length tuple; we normalize to an array here
  predicates: PredicateConstraint[] | [PredicateConstraint];
}

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

export function toIriOrCurie(term: string): string {
  // variable
  if (term.startsWith("?") || term.startsWith("$")) return term;
  // blank node
  if (term.startsWith("_:")) return term;
  // full IRI
  if (term.includes("://")) return `<${term}>`;
  // fallback: assume CURIE or already-angled
  if (term.startsWith("<") && term.endsWith(">")) return term;
  return term; // CURIE, caller must ensure prefix provided
}

export function predicateToSparql(uri: string): string {
  // Allow CURIEs or IRIs
  return toIriOrCurie(uri);
}

export function safeVarName(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^([0-9])/, "_$1")
    .slice(0, 60);
  return base || "v";
}

export function varToken(name: string): string {
  const n = name.startsWith("?") || name.startsWith("$") ? name.slice(1) : name;
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
  values: Array<string | number | boolean>,
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
