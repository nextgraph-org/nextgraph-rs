import type { ISubscribableDataset } from "../src/index.js";
import { TransactionDataset, createSubscribableDataset } from "../src/index.js";
import { createDataset } from "@ldo/dataset";
import {
  namedNode,
  literal,
  quad,
  defaultGraph,
  blankNode,
} from "@ldo/rdf-utils";
import type { Quad, BlankNode } from "@rdfjs/types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import testDataset from "@ldo/dataset/test/dataset.testHelper";

describe("SubscribableDataset", () => {
  // Regular dataset tests
  testDataset({
    dataset: createSubscribableDataset,
  });

  // Subscribable Dataset tests
  let subscribableDatastet: ISubscribableDataset<Quad>;
  const tomTypeQuad = quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  );
  const tomNameQuad = quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://example.org/cartoons#name"),
    literal("Tom"),
  );
  const tomColorQuad = quad(
    namedNode("http://example.org/cartoons#Tom"),
    namedNode("http://example.org/cartoons#color"),
    namedNode("http://example.org/colors#grey"),
  );
  const lickyNameQuad = quad(
    namedNode("http://example.org/cartoons#Licky"),
    namedNode("http://example.org/cartoons#name"),
    literal("Licky"),
  );
  const lickyTypeQuad = quad(
    namedNode("http://example.org/cartoons#Licky"),
    namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
    namedNode("http://example.org/cartoons#Cat"),
  );

  beforeEach(() => {
    subscribableDatastet = createSubscribableDataset([
      tomTypeQuad,
      tomNameQuad,
    ]);
  });

  it("Alerts when a node is added", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.addListener(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.add(tomColorQuad);
    expect(callbackFunc).toBeCalledTimes(1);
    expect(callbackFunc.mock.calls[0][0].added.size).toBe(1);
    expect(callbackFunc.mock.calls[0][0].added.has(tomColorQuad)).toBe(true);
    expect(callbackFunc.mock.calls[0][2]).toEqual([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
  });

  it("Alerts when a node is removed", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.delete(tomTypeQuad);
    expect(callbackFunc).toBeCalledTimes(1);
    expect(callbackFunc.mock.calls[0][0].removed.size).toBe(1);
    expect(callbackFunc.mock.calls[0][0].removed.has(tomTypeQuad)).toBe(true);
    expect(callbackFunc.mock.calls[0][2]).toEqual([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
  });

  it("Alerts when multiple quads are added", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.addAll([lickyNameQuad, lickyTypeQuad]);
    expect(callbackFunc).toBeCalledTimes(1);
    expect(callbackFunc.mock.calls[0][0].added.size).toBe(2);
    expect(callbackFunc.mock.calls[0][0].added.has(lickyNameQuad)).toBe(true);
    expect(callbackFunc.mock.calls[0][0].added.has(lickyTypeQuad)).toBe(true);
    expect(callbackFunc.mock.calls[0][2]).toEqual([
      namedNode("http://example.org/cartoons#Licky"),
      null,
      null,
      null,
    ]);
  });

  it("Alerts when bulk updated by only adding", () => {
    const callbackFuncLicky = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      callbackFuncLicky,
    );
    subscribableDatastet.bulk({
      added: createDataset([lickyTypeQuad]),
    });
    expect(callbackFuncLicky).toBeCalledTimes(1);
    expect(
      callbackFuncLicky.mock.calls[0][0].added.equals(
        createDataset([lickyTypeQuad]),
      ),
    ).toBe(true);
    expect(callbackFuncLicky.mock.calls[0][0].removed).toBe(undefined);
    expect(callbackFuncLicky.mock.calls[0][2]).toEqual([
      namedNode("http://example.org/cartoons#Licky"),
      null,
      null,
      null,
    ]);
  });

  it("Alerts when bulk updated by only removing", () => {
    const callbackFuncTom = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFuncTom,
    );
    subscribableDatastet.bulk({
      removed: createDataset([tomTypeQuad]),
    });
    expect(callbackFuncTom).toBeCalledTimes(1);
    expect(
      callbackFuncTom.mock.calls[0][0].removed.equals(
        createDataset([tomTypeQuad]),
      ),
    ).toBe(true);
    expect(callbackFuncTom.mock.calls[0][0].added).toBe(undefined);
    expect(callbackFuncTom.mock.calls[0][2]).toEqual([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
  });

  it("Alerts when emit is called", () => {
    const callbackFuncTom = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFuncTom,
    );
    subscribableDatastet.emit(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      {},
    );
    expect(callbackFuncTom.mock.calls[0][0]).toEqual({});
  });

  it("Alerts when bulk updated", () => {
    const callbackFuncLicky = jest.fn();
    const callbackFuncTom = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFuncTom,
    );
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      callbackFuncLicky,
    );
    subscribableDatastet.bulk({
      added: createDataset([lickyTypeQuad]),
      removed: createDataset([tomTypeQuad]),
    });
    expect(callbackFuncLicky).toBeCalledTimes(1);
    expect(callbackFuncTom).toBeCalledTimes(1);
    expect(
      callbackFuncLicky.mock.calls[0][0].added.equals(
        createDataset([lickyTypeQuad]),
      ),
    ).toBe(true);
    expect(callbackFuncLicky.mock.calls[0][0].removed).toBe(undefined);
    expect(
      callbackFuncTom.mock.calls[0][0].removed.equals(
        createDataset([tomTypeQuad]),
      ),
    ).toBe(true);
    expect(callbackFuncTom.mock.calls[0][0].added).toBe(undefined);
  });

  it("Alerts when the default graph is updated but not when another graph is", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on([null, null, null, defaultGraph()], callbackFunc);
    subscribableDatastet.add(lickyNameQuad);
    subscribableDatastet.add(
      quad(
        namedNode("https://example.com/books#Dumbledoor"),
        namedNode("http://example.org/books#name"),
        literal("Dubmledoor"),
        namedNode("https://coolgraphs.com"),
      ),
    );
    expect(callbackFunc).toHaveBeenCalledTimes(1);
    expect(
      callbackFunc.mock.calls[0][0].added.equals(
        createDataset([lickyNameQuad]),
      ),
    ).toBe(true);
  });

  it("Alerts when a named graph is updated", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [null, null, null, namedNode("https://coolgraphs.com")],
      callbackFunc,
    );
    const quadWithGraph = quad(
      namedNode("https://example.com/books#Dumbledoor"),
      namedNode("http://example.org/books#name"),
      literal("Dubmledoor"),
      namedNode("https://coolgraphs.com"),
    );
    subscribableDatastet.add(quadWithGraph);
    expect(callbackFunc).toHaveBeenCalledTimes(1);
    expect(
      callbackFunc.mock.calls[0][0].added.equals(
        createDataset([quadWithGraph]),
      ),
    ).toBe(true);
  });

  it("Alerts when one blank node is updated, but not the other", () => {
    const blankNodeQuadA = quad(
      namedNode("http://example.org/cartoons#Tom"),
      namedNode("http://example.org/cartoons#Address"),
      blankNode(),
    );
    const blankNodeQuadB = quad(
      namedNode("http://example.org/cartoons#Licky"),
      namedNode("http://example.org/cartoons#Address"),
      blankNode(),
    );
    subscribableDatastet.addAll([blankNodeQuadA, blankNodeQuadB]);
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [blankNodeQuadA.object as BlankNode, null, null, null],
      callbackFunc,
    );
    const blankNodeAdditionA = quad(
      blankNodeQuadA.object as BlankNode,
      namedNode("http://example.org/cartoons#StreetNumber"),
      literal("1234"),
    );
    subscribableDatastet.add(blankNodeAdditionA);
    const blankNodeAdditionB = quad(
      blankNodeQuadB.object as BlankNode,
      namedNode("http://example.org/cartoons#StreetNumber"),
      literal("65"),
    );
    subscribableDatastet.add(blankNodeAdditionB);
    expect(callbackFunc).toBeCalledTimes(1);
    expect(
      callbackFunc.mock.calls[0][0].added.equals(
        createDataset([blankNodeAdditionA]),
      ),
    ).toBe(true);
  });

  it("Provides event names", () => {
    const sampleBlankNode = blankNode();
    subscribableDatastet.on(
      [namedNode("https://example.com"), null, null, null],
      () => {
        /* Do nothing */
      },
    );
    subscribableDatastet.on([null, null, sampleBlankNode, null], () => {
      /* Do nothing */
    });
    subscribableDatastet.on([null, null, null, defaultGraph()], () => {
      /* Do nothing */
    });
    const subscribableTerms = subscribableDatastet.eventNames();
    expect(subscribableTerms.length).toBe(3);
    expect(
      subscribableTerms.some(
        (curQuadMatch) =>
          curQuadMatch[0]?.equals(namedNode("https://example.com")),
      ),
    ).toBe(true);
    expect(
      subscribableTerms.some(
        (curQuadMatch) => curQuadMatch[2]?.equals(sampleBlankNode),
      ),
    ).toBe(true);
    expect(
      subscribableTerms.some((curQuadMatch) => {
        return curQuadMatch[3]?.equals(defaultGraph());
      }),
    ).toBe(true);
  });

  it("Throws an error if somehow a bad key is registered to an event emitter", () => {
    // Disable trypscript to set up a private variable you shouldn't be able to access
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    subscribableDatastet.eventEmitter.on("Blah Blah Blah", () => {
      /* Do Nothing */
    });
    expect(() => subscribableDatastet.eventNames()).toThrowError(
      "Invalid Quad Match String",
    );
  });

  it("Gets the max listeners", () => {
    expect(subscribableDatastet.getMaxListeners()).toBe(10);
  });

  it("Gets the current Listeners for a specific name", () => {
    const dummyListener1 = () => {
      /* Do Nothing */
    };
    const dummyListener2 = () => {
      /* Do Nothing */
    };
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      dummyListener1,
    );
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      dummyListener2,
    );
    const listeners = subscribableDatastet.listeners([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
    expect(listeners.length).toBe(1);
    expect(listeners[0]).toBe(dummyListener1);
  });

  it("Unsubscribes from a listener", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.off(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.add(tomColorQuad);
    expect(callbackFunc).toHaveBeenCalledTimes(0);
  });

  it("Unsubscribes from all events for a particular listener", () => {
    const callbackFunc = jest.fn();
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      callbackFunc,
    );
    subscribableDatastet.removeListenerFromAllEvents(callbackFunc);
    subscribableDatastet.add(tomColorQuad);
    subscribableDatastet.add(lickyNameQuad);
    expect(callbackFunc).toHaveBeenCalledTimes(0);
  });

  it("Runs 'once' without erroring", () => {
    expect(
      subscribableDatastet.once(
        [namedNode("http://example.org/cartoons#Tom"), null, null, null],
        () => {
          /* Do Nothing */
        },
      ),
    ).toBe(subscribableDatastet);
  });

  it("Runs 'prependListener' without erroring", () => {
    expect(
      subscribableDatastet.prependListener(
        [namedNode("http://example.org/cartoons#Tom"), null, null, null],
        () => {
          /* Do Nothing */
        },
      ),
    ).toBe(subscribableDatastet);
  });

  it("Runs the 'prependOnceListener' without erroring", () => {
    expect(
      subscribableDatastet.prependOnceListener(
        [namedNode("http://example.org/cartoons#Tom"), null, null, null],
        () => {
          /* Do Nothing */
        },
      ),
    ).toBe(subscribableDatastet);
  });

  it("Removes all listeners", () => {
    const dummyListener1 = () => {
      /* Do Nothing */
    };
    const dummyListener2 = () => {
      /* Do Nothing */
    };
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      dummyListener1,
    );
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Licky"), null, null, null],
      dummyListener2,
    );
    subscribableDatastet.removeAllListeners([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
    expect(
      subscribableDatastet.listenerCount([
        namedNode("http://example.org/cartoons#Tom"),
        null,
        null,
        null,
      ]),
    ).toBe(0);
    expect(
      subscribableDatastet.listenerCount([
        namedNode("http://example.org/cartoons#Licky"),
        null,
        null,
        null,
      ]),
    ).toBe(1);
  });

  it("Sets max listeners", () => {
    subscribableDatastet.setMaxListeners(20);
    expect(subscribableDatastet.getMaxListeners()).toBe(20);
  });

  it("Returns raw listeners", () => {
    const dummyListener1 = () => {
      /* Do Nothing */
    };
    subscribableDatastet.on(
      [namedNode("http://example.org/cartoons#Tom"), null, null, null],
      dummyListener1,
    );
    const rawListeners = subscribableDatastet.rawListeners([
      namedNode("http://example.org/cartoons#Tom"),
      null,
      null,
      null,
    ]);
    expect(rawListeners.length).toBe(1);
    expect(rawListeners[0]).toBe(dummyListener1);
  });

  it("Returns a transaction", () => {
    expect(
      subscribableDatastet.startTransaction() instanceof TransactionDataset,
    ).toBe(true);
  });
});
