import { createDataset } from "../src/index.js";
import testDataset from "./dataset.testHelper.js";

describe("ExtendedDataset", () => {
  testDataset({
    dataset: createDataset,
  });
});
