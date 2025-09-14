import {
  type GraphNode,
  type ObjectNode,
  type PredicateNode,
} from "@ldo/rdf-utils";
import type { RawObject } from "../util/RawObject.js";
import { addObjectToDataset } from "../util/addObjectToDataset.js";
import type { ProxyContext } from "../ProxyContext.js";
import { WildcardSubjectSetProxy } from "./WildcardSubjectSetProxy.js";
import { _getUnderlyingNode } from "../types.js";
import { quad, defaultGraph } from "@ldo/rdf-utils";
import {
  createTransactionDatasetFactory,
  TransactionDataset,
} from "@ldo/subscribable-dataset";
import { createDatasetFactory } from "@ldo/dataset";
import { getNodeFromRawObject } from "../util/getNodeFromRaw.js";
import { nodeToString } from "../util/NodeSet.js";

export type SubjectSetProxyQuadMatch = [
  undefined | null,
  PredicateNode,
  ObjectNode,
  GraphNode | undefined | null,
];

export class SubjectSetProxy<
  T extends RawObject,
> extends WildcardSubjectSetProxy<T> {
  protected quadMatch: SubjectSetProxyQuadMatch;

  constructor(context: ProxyContext, quadMatch: SubjectSetProxyQuadMatch) {
    super(context, quadMatch);
    this.quadMatch = quadMatch;
  }

  /**
   * Appends a new element with a specified value to the end of the Set.
   */
  add(value: T): this {
    if (typeof value !== "object") {
      throw new Error(
        `Cannot add a literal "${value}"(${typeof value}) to a subject-oriented collection.`,
      );
    }
    // Create a test dataset to see if the inputted data is valid
    const testDataset = new TransactionDataset(
      this.context.dataset,
      createDatasetFactory(),
      createTransactionDatasetFactory(),
    );
    addObjectToDataset(
      value,
      false,
      this.context.duplicate({
        writeGraphs: [defaultGraph()],
      }),
    );
    const isValidAddition =
      testDataset.match(
        getNodeFromRawObject(value, this.context.contextUtil),
        this.quadMatch[1],
        this.quadMatch[2],
      ).size !== 0;
    if (!isValidAddition) {
      throw new Error(
        `Cannot add value to collection. This must contain a quad that matches (${nodeToString(
          this.quadMatch[0],
        )}, ${nodeToString(this.quadMatch[1])}, ${nodeToString(
          this.quadMatch[2],
        )}, ${nodeToString(this.quadMatch[3])})`,
      );
    }

    // Add the object if everything's okay
    const added = addObjectToDataset(value as RawObject, false, this.context);
    const addedNode = added[_getUnderlyingNode];
    this.context.writeGraphs.forEach((graph) => {
      this.context.dataset.add(
        quad(addedNode, this.quadMatch[1], this.quadMatch[2], graph),
      );
    });
    return this;
  }
}
