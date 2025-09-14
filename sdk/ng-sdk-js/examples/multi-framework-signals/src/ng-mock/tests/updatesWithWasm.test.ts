import { describe, expect, test } from "vitest";
import { createSignalObjectForShape } from "ng-signals/connector/createSignalObjectForShape.ts";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Signal modification and propagation to backend with or without signal pooling", () => {
  for (const withPooling of [true, false]) {
    test(`shape object notification comes back to others ${
      withPooling ? "with" : "without"
    } signal pooling`, async () => {
      const object1 = createSignalObjectForShape(
        "TestShape",
        undefined,
        withPooling
      );
      const object2 = createSignalObjectForShape(
        "TestShape",
        undefined,
        withPooling
      );

      const object3 = createSignalObjectForShape(
        "Shape2",
        undefined,
        withPooling
      );
      const object4 = createSignalObjectForShape(
        "Shape2",
        undefined,
        withPooling
      );

      await wait(10);

      // Update object 1 and expect object 2 to update as well.
      // @ts-expect-error
      object1.name = "Updated name from object1";

      await wait(10);
      // @ts-expect-error
      expect(object2.name).toBe("Updated name from object1");

      // Expect object of different shape not to have changed.
      // @ts-expect-error
      expect(object3.name).toBe("Niko's cat");

      // Update object 4 and expect object 3 with same shape to have updated.
      // @ts-expect-error
      object4.name = "Updated name from object4";

      await wait(10);
      // @ts-expect-error
      expect(object3!.name).toBe("Updated name from object4");
    });
  }
});
