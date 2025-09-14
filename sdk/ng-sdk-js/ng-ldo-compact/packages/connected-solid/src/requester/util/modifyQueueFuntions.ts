/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WaitingProcess } from "../../util/RequestBatcher.js";

/**
 * @internal
 *
 * A helper function for a common way to modify the batch queue. This merges
 * the incoming request with the currently executing request or the last request
 * in the queue if its keys are the same.
 *
 * @param key - the key of the incoming request
 * @returns a modifyQueue function
 */
export function modifyQueueByMergingEventsWithTheSameKeys(key: string) {
  return (
    queue: WaitingProcess<any[], any>[],
    currentlyLoading: WaitingProcess<any[], any> | undefined,
  ) => {
    if (queue.length === 0 && currentlyLoading?.name === key) {
      return currentlyLoading;
    } else if (queue[queue.length - 1]?.name === key) {
      return queue[queue.length - 1];
    }
    return undefined;
  };
}
