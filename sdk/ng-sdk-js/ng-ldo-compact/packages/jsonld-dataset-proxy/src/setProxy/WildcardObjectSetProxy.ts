import type {
  SubjectNode,
  PredicateNode,
  ObjectNode,
  GraphNode,
} from "@ldo/rdf-utils";
import type { Dataset, Quad } from "@rdfjs/types";
import type { RawValue } from "../util/RawObject.js";
import { SetProxy } from "./SetProxy.js";
import type { ProxyContext } from "../ProxyContext.js";
import { getNodeFromRawValue } from "../util/getNodeFromRaw.js";
import { _isSubjectOriented } from "../types.js";
import { filterQuadsByLanguageOrdering } from "../language/languageUtils.js";

export type WildcardObjectSetProxyQuadMatch = [
  SubjectNode | undefined | null,
  PredicateNode | undefined | null,
  undefined | null,
  GraphNode | undefined | null,
];

/**
 * A WildcardObjectProxy represents a set of nodes in a dataset that are all the
 * object of a given subject and predicate. Because this is a wildcard, the
 * subject and predicate don't necissarily need to be defined.
 */
export class WildcardObjectSetProxy<
  T extends NonNullable<RawValue>,
> extends SetProxy<T> {
  protected quadMatch: WildcardObjectSetProxyQuadMatch;
  protected isLangStringSet: boolean;

  constructor(
    context: ProxyContext,
    quadMatch: WildcardObjectSetProxyQuadMatch,
    isLangStringSet?: boolean,
  ) {
    super(context, quadMatch);
    this.quadMatch = quadMatch;
    this.isLangStringSet = isLangStringSet ?? false;
  }

  protected getQuads(value?: T | undefined): Dataset<Quad, Quad> {
    const { dataset } = this.context;
    let quads: Dataset<Quad, Quad>;
    // Get the RDF Node that represents the value, skip if no value
    const subject = this.quadMatch[0] ?? undefined;
    const predicate = this.quadMatch[1] ?? undefined;
    const graph = this.quadMatch[3] ?? undefined;
    if (value) {
      // Get datatype if applicable
      let datatype: string | undefined = undefined;
      if (this.quadMatch[0] && predicate) {
        const rdfType = this.context.getRdfType(this.quadMatch[0]);
        const key = this.context.contextUtil.iriToKey(predicate.value, rdfType);
        datatype = this.context.contextUtil.getDataType(key, rdfType);
      }
      const valueNode = getNodeFromRawValue(value, this.context, datatype);
      quads = dataset.match(subject, predicate, valueNode, graph);
      // If there is no valueNode, we must filter by value manually as we
      // weren't able to deduce the datatype.
      if (!valueNode) {
        quads = quads.filter(
          (quad) =>
            quad.object.termType === "Literal" && quad.object.value === value,
        );
      }
    } else {
      // SPO for no value
      quads = dataset.match(subject, predicate, undefined, graph);
    }
    // If this is a langStringSet, filter by language preferences
    if (this.isLangStringSet) {
      return filterQuadsByLanguageOrdering(
        quads,
        this.context.languageOrdering,
      );
    }
    return quads;
  }

  protected getNodeOfFocus(quad: Quad): ObjectNode {
    return quad.object as ObjectNode;
  }

  get [_isSubjectOriented](): false {
    return false;
  }
}
