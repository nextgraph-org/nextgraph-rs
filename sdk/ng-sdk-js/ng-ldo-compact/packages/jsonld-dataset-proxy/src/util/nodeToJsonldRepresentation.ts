import type { Literal, Quad_Object } from "@rdfjs/types";
import type { ProxyContext } from "../ProxyContext.js";
import type { SubjectProxy } from "../subjectProxy/SubjectProxy.js";
import type { LiteralLike } from "../types.js";

export type ObjectJsonRepresentation = LiteralLike | SubjectProxy;

export function literalToJsonldRepresentation(literal: Literal) {
  switch (literal.datatype.value) {
    case "http://www.w3.org/2001/XMLSchema#string":
    case "http://www.w3.org/2001/XMLSchema#ENTITIES":
    case "http://www.w3.org/2001/XMLSchema#ENTITY":
    case "http://www.w3.org/2001/XMLSchema#ID":
    case "http://www.w3.org/2001/XMLSchema#IDREF":
    case "http://www.w3.org/2001/XMLSchema#IDREFS":
    case "http://www.w3.org/2001/XMLSchema#language":
    case "http://www.w3.org/2001/XMLSchema#Name":
    case "http://www.w3.org/2001/XMLSchema#NCName":
    case "http://www.w3.org/2001/XMLSchema#NMTOKEN":
    case "http://www.w3.org/2001/XMLSchema#NMTOKENS":
    case "http://www.w3.org/2001/XMLSchema#normalizedString":
    case "http://www.w3.org/2001/XMLSchema#QName":
    case "http://www.w3.org/2001/XMLSchema#token":
      return literal.value;
    case "http://www.w3.org/2001/XMLSchema#date":
    case "http://www.w3.org/2001/XMLSchema#dateTime":
    case "http://www.w3.org/2001/XMLSchema#duration":
    case "http://www.w3.org/2001/XMLSchema#gDay":
    case "http://www.w3.org/2001/XMLSchema#gMonth":
    case "http://www.w3.org/2001/XMLSchema#gMonthDay":
    case "http://www.w3.org/2001/XMLSchema#gYear":
    case "http://www.w3.org/2001/XMLSchema#gYearMonth":
    case "http://www.w3.org/2001/XMLSchema#time":
      return literal.value;
    case "http://www.w3.org/2001/XMLSchema#integer":
    case "http://www.w3.org/2001/XMLSchema#byte":
    case "http://www.w3.org/2001/XMLSchema#decimal":
    case "http://www.w3.org/2001/XMLSchema#double":
    case "http://www.w3.org/2001/XMLSchema#int":
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
      return parseFloat(literal.value);
    case "http://www.w3.org/2001/XMLSchema#boolean":
      return literal.value === "true";
    case "http://www.w3.org/2001/XMLSchema#hexBinary":
      return literal.value;
    case "http://www.w3.org/2001/XMLSchema#anyURI":
      return literal.value;
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML":
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#PlainLiteral":
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral":
    case "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON":
      return literal.value;
    default:
      return literal.value;
  }
}

export function nodeToJsonldRepresentation(
  node: Quad_Object,
  proxyContext: ProxyContext,
): ObjectJsonRepresentation {
  if (node.termType === "Literal") {
    return literalToJsonldRepresentation(node);
  } else if (node.termType === "NamedNode" || node.termType === "BlankNode") {
    return proxyContext.createSubjectProxy(node);
  } else {
    throw new Error("Can only convert NamedNodes or Literals or BlankNodes");
  }
}
