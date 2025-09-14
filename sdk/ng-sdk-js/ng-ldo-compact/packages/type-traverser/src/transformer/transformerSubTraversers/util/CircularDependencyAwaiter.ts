import type { KeyTypes } from "../../../index.js";
import { MultiMap } from "./MultiMap.js";
import { MultiSet } from "./MultiSet.js";
import type { TransformerSubTraverserExecutingPromises } from "./transformerSubTraverserTypes.js";

export class CircularDepenedencyAwaiter {
  private graphNodes: MultiMap<object, KeyTypes, MultiSet<object, KeyTypes>> =
    new MultiMap();

  add(
    subjectItem: object,
    subjectItemName: KeyTypes,
    awaitedItem: object,
    awaitedItemName: KeyTypes,
    executingPromises: TransformerSubTraverserExecutingPromises,
  ): () => void {
    // If the promise has already resolved, do not add
    if (executingPromises.get(awaitedItem, awaitedItemName)?.isResolved) {
      return () => {
        /* Do Nothing */
      };
    }
    // If it hasn't then add to the graph
    if (!this.graphNodes.has(subjectItem, subjectItemName)) {
      this.graphNodes.set(subjectItem, subjectItemName, new MultiSet());
    }
    this.graphNodes
      .get(subjectItem, subjectItemName)
      ?.add(awaitedItem, awaitedItemName);
    this.checkForCircuit(
      awaitedItem,
      awaitedItemName,
      subjectItem,
      subjectItemName,
    );
    return () => {
      const awaitedSet = this.graphNodes.get(subjectItem, subjectItemName);
      awaitedSet?.delete(awaitedItem, awaitedItemName);
      if (awaitedSet?.size === 0) {
        this.graphNodes.delete(subjectItem, subjectItemName);
      }
    };
  }

  private checkForCircuit(
    curItem: object,
    curItemName: KeyTypes,
    subjectItem: object,
    subjectItemName: KeyTypes,
  ): void {
    const nextNodes = this.graphNodes.get(curItem, curItemName);
    if (!nextNodes) {
      return;
    }
    nextNodes.forEach((nextItem, nextItemName) => {
      if (subjectItem === nextItem && subjectItemName === nextItemName) {
        throw new Error(
          `Circular dependency found. Use the 'setReturnPointer' function. The loop includes the '${
            subjectItemName as string
          }' type`,
        );
      }
      this.checkForCircuit(
        nextItem,
        nextItemName,
        subjectItem,
        subjectItemName,
      );
    });
  }
}
