import type { BaseQuad, DatasetFactory } from "@rdfjs/types";
import type {
  ISubscribableDataset,
  ITransactionDatasetFactory,
} from "./types.js";
import { TransactionDataset } from "./TransactionDataset.js";

export class TransactionDatasetFactory<InAndOutQuad extends BaseQuad>
  implements ITransactionDatasetFactory<InAndOutQuad>
{
  private datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>;
  private transactionDatasetFactory: ITransactionDatasetFactory<InAndOutQuad>;
  constructor(
    datasetFactory: DatasetFactory<InAndOutQuad, InAndOutQuad>,
    transactionDatasetFactory?: ITransactionDatasetFactory<InAndOutQuad>,
  ) {
    this.datasetFactory = datasetFactory;
    this.transactionDatasetFactory = transactionDatasetFactory || this;
  }

  transactionDataset(
    parentDataset: ISubscribableDataset<InAndOutQuad>,
  ): TransactionDataset<InAndOutQuad> {
    return new TransactionDataset<InAndOutQuad>(
      parentDataset,
      this.datasetFactory,
      this.transactionDatasetFactory,
    );
  }
}
