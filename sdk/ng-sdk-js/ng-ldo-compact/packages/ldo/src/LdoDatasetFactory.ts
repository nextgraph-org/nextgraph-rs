import type { Dataset, Quad } from "@rdfjs/types";
import type { ISubscribableDatasetFactory } from "@ldo/subscribable-dataset";
import { SubscribableDatasetFactory } from "@ldo/subscribable-dataset";
import { LdoDataset } from "./LdoDataset.js";

/**
 * @category Getting an LdoDataset
 * `LdoDatasetFactory` is a helper class that includes methods for creating LdoDatasets.
 *
 * This class exists for parity with RDF/JS. Most developers will not use it. Instead, it's better to use {@link createLdoDataset}.
 *
 * @example
 * ```typescript
 * import { createLdoDatasetFactory } from "@ldo/ldo";
 * import { createExtendedDatasetFactory } from "@ldo/dataset";
 * import { createTransactionDatasetFactory } from "@ldo/subscribable-dataset";
 *
 * const datasetFactory = createExtendedDatasetFactory();
 * const transactionDatasetFactory = createTransactionDatasetFactroy();
 * const ldoDatasetFactory = new LdoDatasetFactory(
 *   datasetFactory,
 *   transactionDatasetFactory
 * );
 * const ldoDataset = ldoDatasetFactory.dataset(initialDataset);
 * ```
 */
export class LdoDatasetFactory
  extends SubscribableDatasetFactory<Quad>
  implements ISubscribableDatasetFactory<Quad>
{
  dataset(quads?: Dataset<Quad, Quad> | Quad[] | undefined): LdoDataset {
    return new LdoDataset(
      this.datasetFactory,
      this.transactionDatasetFactory,
      this.datasetFactory.dataset(quads),
    );
  }
}
