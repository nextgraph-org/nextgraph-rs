import {
  createDataset,
  createDatasetFactory,
  createDatasetFromSerializedInput,
  serializedToDataset,
  ExtendedDataset,
  ExtendedDatasetFactory,
} from "../src/index.js";

describe("Exports", () => {
  it("Has all exports", () => {
    expect(createDataset);
    expect(ExtendedDataset);
    expect(ExtendedDatasetFactory);
    expect(serializedToDataset);
    expect(createDatasetFactory);
    expect(createDatasetFromSerializedInput);
  });
});
