import type { DatasetFactory, BaseQuad, Dataset } from "@rdfjs/types";
import type { ITransactionDatasetFactory } from "./types.js";
import { SubscribableDataset } from "./SubscribableDataset.js";

/**
 * A DatasetFactory that returns a SubscribableDataset given a generic DatasetFactory.
 */
export class SubscribableDatasetFactory<
  InAndOutQuad extends BaseQuad = BaseQuad,
> implements DatasetFactory<InAndOutQuad, InAndOutQuad>
{
  protected datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>;
  protected transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>;
  constructor(
    datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>,
    transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>,
  ) {
    this.datasetFactory = datasetFactory;
    this.transactionDatasetFactory = transactionDatasetFactory;
  }

  dataset(
    quads?: Dataset<InAndOutQuad, InAndOutQuad> | InAndOutQuad[],
  ): SubscribableDataset<InAndOutQuad> {
    return new SubscribableDataset(
      this.datasetFactory,
      this.transactionDatasetFactory,
      quads ? this.datasetFactory.dataset(quads) : undefined,
    );
  }
}
