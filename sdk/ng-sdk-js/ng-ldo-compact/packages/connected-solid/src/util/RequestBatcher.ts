/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @internal
 * A data structure that represents a possible process and how to handle it.
 */
export interface WaitingProcess<Args extends any[], Return> {
  name: string;
  args: Args;
  perform: (...args: Args) => Promise<Return>;
  awaitingResolutions: ((returnValue: Return) => void)[];
  awaitingRejections: ((err: any) => void)[];
  after?: (result: Return) => void;
}

export const ANY_KEY = "any";

/**
 * Options for processes that are waiting to execute
 */
export interface WaitingProcessOptions<Args extends any[], Return> {
  /**
   * The name of the process like "read" or "delete"
   */
  name: string;
  /**
   * The arguements supplied to the process
   */
  args: Args;
  /**
   * A function that will be triggered when it's time to execute this process
   * @param args - arguments supplied to the process
   * @returns a return type
   */
  perform: (...args: Args) => Promise<Return>;
  /**
   * A custom function to modify the queue based on the current state of the
   * queue
   * @param processQueue - The current process queue
   * @param currentlyProcessing - The Process that is currently executing
   * @param args - provided args
   * @returns A WaitingProcess that this request should listen to, or undefined
   * if it should create its own
   */
  modifyQueue: (
    processQueue: WaitingProcess<any[], any>[],
    currentlyProcessing: WaitingProcess<any[], any> | undefined,
    args: Args,
  ) => WaitingProcess<any[], any> | undefined;
  after?: (result: Return) => void;
}

/**
 * @internal
 * A utility for batching a request
 */
export class RequestBatcher {
  /**
   * A mapping between a process key and the last time in UTC a process of that
   * key was executed.
   */
  private lastRequestTimestampMap: Record<string, number> = {};

  /**
   * A pointer to the current process the batcher is working on
   */
  private currentlyProcessing: WaitingProcess<any[], any> | undefined =
    undefined;

  /**
   * A queue of upcoming processes
   */
  private processQueue: WaitingProcess<any[], any>[] = [];

  /**
   * The amount of time (in milliseconds) between requests of the same key
   */
  public batchMillis: number;

  /**
   * @param options - options, including the value for batchMillis
   */
  constructor(
    options?: Partial<{
      batchMillis: number;
    }>,
  ) {
    this.batchMillis = options?.batchMillis || 1000;
  }

  /**
   * Check if the request batcher is currently working on a process
   * @param key - the key of the process to check
   * @returns true if the batcher is currently working on the provided process
   */
  public isLoading(key: string): boolean {
    if (key === ANY_KEY) return !!this.currentlyProcessing;
    return this.currentlyProcessing?.name === key;
  }

  /**
   * Triggers the next process in the queue or triggers a timeout to wait to
   * execute the next process in the queue if not enough time has passed since
   * the last process was triggered.
   */
  private triggerOrWaitProcess() {
    if (!this.processQueue[0] || this.currentlyProcessing) {
      return;
    }
    this.currentlyProcessing = this.processQueue.shift();
    const processName = this.currentlyProcessing!.name;

    // Set last request timestamp if not available
    if (!this.lastRequestTimestampMap[processName]) {
      this.lastRequestTimestampMap[processName] = Date.UTC(0, 0, 0, 0, 0, 0, 0);
    }

    const lastRequestTimestamp = this.lastRequestTimestampMap[processName];
    const timeSinceLastTrigger = Date.now() - lastRequestTimestamp;

    const triggerProcess = async () => {
      this.lastRequestTimestampMap[processName] = Date.now();
      this.lastRequestTimestampMap[ANY_KEY] = Date.now();
      // Remove the process from the queue
      const processToTrigger = this.currentlyProcessing;
      if (processToTrigger) {
        this.currentlyProcessing = processToTrigger;
        try {
          const returnValue = await processToTrigger.perform(
            ...processToTrigger.args,
          );
          if (processToTrigger.after) {
            processToTrigger.after(returnValue);
          }
          processToTrigger.awaitingResolutions.forEach((callback) => {
            callback(returnValue);
          });
        } catch (err) {
          processToTrigger.awaitingRejections.forEach((callback) => {
            callback(err);
          });
        }
        this.currentlyProcessing = undefined;

        this.triggerOrWaitProcess();
      }
    };

    if (timeSinceLastTrigger < this.batchMillis) {
      setTimeout(triggerProcess, this.batchMillis - timeSinceLastTrigger);
    } else {
      triggerProcess();
    }
  }

  /**
   * Adds a process to the queue and waits for the process to be complete
   * @param options - WaitingProcessOptions
   * @returns A promise that resolves when the process resolves
   */
  public async queueProcess<Args extends any[], ReturnType>(
    options: WaitingProcessOptions<Args, ReturnType>,
  ): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      const shouldAwait = options.modifyQueue(
        this.processQueue,
        this.currentlyProcessing,
        options.args,
      );

      if (shouldAwait) {
        shouldAwait.awaitingResolutions.push(resolve);
        shouldAwait.awaitingRejections.push(reject);
        return;
      }

      const waitingProcess: WaitingProcess<Args, ReturnType> = {
        name: options.name,
        args: options.args,
        perform: options.perform,
        awaitingResolutions: [resolve],
        awaitingRejections: [reject],
        after: options.after,
      };
      // HACK: Ugly cast
      this.processQueue.push(
        waitingProcess as unknown as WaitingProcess<any[], any>,
      );
      this.triggerOrWaitProcess();
    });
  }
}
