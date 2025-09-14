import type { WaitingProcess } from "../src/util/RequestBatcher.js";
import { RequestBatcher } from "../src/util/RequestBatcher.js";
import { describe, it, expect, vi } from "vitest";

describe("RequestBatcher", () => {
  type ReadWaitingProcess = WaitingProcess<[string], string>;

  it("Batches a request", async () => {
    const requestBatcher = new RequestBatcher({ batchMillis: 500 });
    const perform = async (input: string): Promise<string> => {
      await wait(100);
      return `Hello ${input}`;
    };
    const perform1 = vi.fn(perform);
    const perform2 = vi.fn(perform);
    const perform3 = vi.fn((input: string): Promise<string> => {
      expect(requestBatcher.isLoading("read")).toBe(true);
      return perform(input);
    });
    const perform4 = vi.fn(perform);

    const modifyQueue = (queue, currentlyProcessing, input: [string]) => {
      const last = queue[queue.length - 1];
      if (last?.name === "read") {
        (last as ReadWaitingProcess).args[0] += input;
        return last;
      }
      return undefined;
    };

    let return1: string = "";
    let return2: string = "";
    let return3: string = "";
    let return4: string = "";

    expect(requestBatcher.isLoading("read")).toBe(false);

    await Promise.all([
      requestBatcher
        .queueProcess<[string], string>({
          name: "read",
          args: ["a"],
          perform: perform1,
          modifyQueue,
        })
        .then((val) => (return1 = val)),
      requestBatcher
        .queueProcess<[string], string>({
          name: "read",
          args: ["b"],
          perform: perform2,
          modifyQueue,
        })
        .then((val) => (return2 = val)),
      ,
      requestBatcher
        .queueProcess<[string], string>({
          name: "read",
          args: ["c"],
          perform: perform3,
          modifyQueue,
        })
        .then((val) => (return3 = val)),
      ,
      requestBatcher
        .queueProcess<[string], string>({
          name: "read",
          args: ["d"],
          perform: perform4,
          modifyQueue,
        })
        .then((val) => (return4 = val)),
      ,
    ]);

    expect(return1).toBe("Hello a");
    expect(return2).toBe("Hello bcd");
    expect(return3).toBe("Hello bcd");
    expect(return4).toBe("Hello bcd");

    expect(perform1).toHaveBeenCalledTimes(1);
    expect(perform1).toHaveBeenCalledWith("a");
    expect(perform2).toHaveBeenCalledTimes(1);
    expect(perform2).toHaveBeenCalledWith("bcd");
    expect(perform3).toHaveBeenCalledTimes(0);
    expect(perform4).toHaveBeenCalledTimes(0);
  });

  it("sets a default batch millis", () => {
    const requestBatcher = new RequestBatcher();
    expect(requestBatcher.batchMillis).toBe(1000);
  });

  it("handles an error being thrown in the process", () => {
    const requestBatcher = new RequestBatcher({ batchMillis: 500 });
    const perform = async (_input: string): Promise<string> => {
      throw new Error("Test Error");
    };
    const perform1 = vi.fn(perform);
    expect(() =>
      requestBatcher.queueProcess<[string], string>({
        name: "read",
        args: ["a"],
        perform: perform1,
        modifyQueue: () => undefined,
      }),
    ).rejects.toThrowError("Test Error");
  });
});

function wait(millis: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
