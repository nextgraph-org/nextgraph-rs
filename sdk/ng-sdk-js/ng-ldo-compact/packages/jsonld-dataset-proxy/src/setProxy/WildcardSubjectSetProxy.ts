import type {
  SubjectNode,
  PredicateNode,
  ObjectNode,
  GraphNode,
} from "@ldo/rdf-utils";
import type { Dataset, Quad } from "@rdfjs/types";
import type { RawObject } from "../util/RawObject.js";
import { SetProxy } from "./SetProxy.js";
import type { ProxyContext } from "../ProxyContext.js";
import { getNodeFromRawObject } from "../util/getNodeFromRaw.js";
import { _isSubjectOriented } from "../types.js";

export type WildcardSubjectSetProxyQuadMatch = [
  undefined | null,
  PredicateNode | undefined | null,
  ObjectNode | undefined | null,
  GraphNode | undefined | null,
];

/**
 * A WildcardObjectProxy represents a set of nodes in a dataset that are all the
 * object of a given subject and predicate. Because this is a wildcard, the
 * subject and predicate don't necissarily need to be defined.
 */
export class WildcardSubjectSetProxy<T extends RawObject> extends SetProxy<T> {
  protected quadMatch: WildcardSubjectSetProxyQuadMatch;

  constructor(
    context: ProxyContext,
    quadMatch: WildcardSubjectSetProxyQuadMatch,
  ) {
    super(context, quadMatch);
    this.quadMatch = quadMatch;
  }

  protected getQuads(value?: T | undefined): Dataset<Quad, Quad> {
    const { dataset } = this.context;
    // Get the RDF Node that represents the value, skip is no value
    const predicate = this.quadMatch[1];
    const object = this.quadMatch[2];
    const graph = this.quadMatch[3];
    if (value) {
      const valueNode = getNodeFromRawObject(value, this.context.contextUtil);
      return dataset.match(valueNode, predicate, object, graph);
    }
    // SPO for no value
    return dataset.match(undefined, predicate, object, graph);
  }

  protected getNodeOfFocus(quad: Quad): SubjectNode {
    return quad.subject as SubjectNode;
  }

  get [_isSubjectOriented](): true {
    return true;
  }
}
