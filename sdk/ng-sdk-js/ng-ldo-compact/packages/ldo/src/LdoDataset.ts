import type { Quad } from "@rdfjs/types";
import jsonldDatasetProxy from "@ldo/jsonld-dataset-proxy";
import { SubscribableDataset } from "@ldo/subscribable-dataset";
import { LdoBuilder } from "./LdoBuilder.js";
import type { AnyShapeType, ShapeType, CompactShapeType } from "./ShapeType.js";
import type { LdoBase } from "./index.js";
import { LdoTransactionDataset } from "./LdoTransactionDataset.js";
import type { ILdoDataset } from "./types.js";

/**
 * @category Getting an LdoDataset
 *
 * An LdoDataset is a utility for building a linked data object.
 *
 * It is not recommended to instantiate an LdoDataset. Instead use the {@link createLdoDataset} function.
 *
 * @example
 * ```typescript
 * import { LdoDataset, createLdoDatasetFactory } from "@ldo/ldo";
 * import { FoafProfileShapeType } from "./.ldo/foafProfile.shapeTypes.js";
 *
 * const ldoDatasetFactory = createLdoDatasetFactory();
 * const ldoDataset = new LdoDataset();
 * const ldoBuilder = ldoDataset.usingType(FoafProfileShapeType);
 * ```
 */
export class LdoDataset
  extends SubscribableDataset<Quad>
  implements ILdoDataset
{
  /**
   * Creates an LdoBuilder for a given shapeType
   *
   * @param shapeType - A ShapeType
   * @returns A builder for the given type
   */
  public usingType<Type extends LdoBase>(
    shapeType: AnyShapeType<Type>,
  ): LdoBuilder<Type> {
    const context = (shapeType as ShapeType<Type>).context || {};
    const proxyBuilder = jsonldDatasetProxy(this, context);
    return new LdoBuilder(
      proxyBuilder,
      shapeType as ShapeType<Type> | CompactShapeType<Type>,
    );
  }

  public startTransaction(): LdoTransactionDataset {
    return new LdoTransactionDataset(
      this,
      this.datasetFactory,
      this.transactionDatasetFactory,
    );
  }
}
