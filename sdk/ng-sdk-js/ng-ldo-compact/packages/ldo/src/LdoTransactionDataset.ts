import { TransactionDataset } from "@ldo/subscribable-dataset";
import type { Quad } from "@rdfjs/types";
import type { ILdoDataset } from "./types.js";
import { LdoBuilder } from "./LdoBuilder.js";
import type { ShapeType, AnyShapeType } from "./ShapeType.js";
import type { LdoBase } from "./util.js";
import jsonldDatasetProxy from "@ldo/jsonld-dataset-proxy";

export class LdoTransactionDataset
  extends TransactionDataset<Quad>
  implements ILdoDataset
{
  usingType<Type extends LdoBase>(
    shapeType: AnyShapeType<Type>,
  ): LdoBuilder<Type> {
    const context = (shapeType as ShapeType<Type>).context || {};
    const proxyBuilder = jsonldDatasetProxy(this, context);
    return new LdoBuilder(proxyBuilder, shapeType);
  }
}
