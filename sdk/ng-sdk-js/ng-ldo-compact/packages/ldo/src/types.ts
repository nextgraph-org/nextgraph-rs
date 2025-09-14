import type { ISubscribableDataset } from "@ldo/subscribable-dataset";
import type { LdoBuilder } from "./LdoBuilder.js";
import type { ShapeType } from "./ShapeType.js";
import type { LdoBase } from "./util.js";
import type { Quad } from "@rdfjs/types";

export interface ILdoDataset extends ISubscribableDataset<Quad> {
  usingType<Type extends LdoBase>(shapeType: ShapeType<Type>): LdoBuilder<Type>;
}
