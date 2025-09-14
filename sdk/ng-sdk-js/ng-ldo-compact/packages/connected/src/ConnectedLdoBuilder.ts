import type { LdoBase, ShapeType } from "@ldo/ldo";
import { LdoBuilder } from "@ldo/ldo";
import type { IConnectedLdoBuilder } from "./types/IConnectedLdoBuilder.js";
import type { JsonldDatasetProxyBuilder } from "@ldo/jsonld-dataset-proxy";
import type { SubjectNode } from "@ldo/rdf-utils";
import type { LQInput } from "./types/ILinkQuery.js";
import { ResourceLinkQuery } from "./linkTraversal/ResourceLinkQuery.js";
import type { ConnectedPlugin } from "./types/ConnectedPlugin.js";
import type { IConnectedLdoDataset } from "./types/IConnectedLdoDataset.js";

export class ConnectedLdoBuilder<
    Type extends LdoBase,
    Plugins extends ConnectedPlugin[],
  >
  extends LdoBuilder<Type>
  implements IConnectedLdoBuilder<Type, Plugins>
{
  protected parentDataset: IConnectedLdoDataset<Plugins>;

  constructor(
    parentDataset: IConnectedLdoDataset<Plugins>,
    jsonldDatasetProxyBuilder: JsonldDatasetProxyBuilder,
    shapeType: ShapeType<Type>,
  ) {
    super(jsonldDatasetProxyBuilder, shapeType);
    this.parentDataset = parentDataset;
  }

  startLinkQuery<Input extends LQInput<Type>>(
    startingResource: Plugins[number]["types"]["resource"],
    startingSubject: SubjectNode | string,
    linkQueryInput: Input,
  ): ResourceLinkQuery<Type, Input, Plugins> {
    return new ResourceLinkQuery(
      this.parentDataset,
      this.shapeType,
      this,
      startingResource,
      startingSubject,
      linkQueryInput,
    );
  }
}
