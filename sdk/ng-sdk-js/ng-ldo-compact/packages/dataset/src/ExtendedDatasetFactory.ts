import type {
  DatasetFactory,
  BaseQuad,
  Dataset,
  DatasetCoreFactory,
} from "@rdfjs/types";
import ExtendedDataset from "./ExtendedDataset.js";

/**
 * A DatasetFactory that creates an ExtendedDataset given a DatasetCoreFactory.
 */
export default class ExtendedDatasetFactory<
  InAndOutQuad extends BaseQuad = BaseQuad,
> implements DatasetFactory<InAndOutQuad, InAndOutQuad>
{
  private datasetCoreFactory: DatasetCoreFactory<InAndOutQuad, InAndOutQuad>;
  constructor(
    datasetCoreFactory: DatasetCoreFactory<InAndOutQuad, InAndOutQuad>,
  ) {
    this.datasetCoreFactory = datasetCoreFactory;
  }

  dataset(
    quads?: Dataset<InAndOutQuad, InAndOutQuad> | InAndOutQuad[],
  ): ExtendedDataset<InAndOutQuad> {
    return new ExtendedDataset(
      // The typings are incorrect on the dataset core factory
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.datasetCoreFactory.dataset(quads),
      this.datasetCoreFactory,
    );
  }
}
