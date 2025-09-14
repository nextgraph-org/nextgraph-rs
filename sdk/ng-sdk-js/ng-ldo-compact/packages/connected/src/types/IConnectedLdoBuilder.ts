import type { LdoBase, LdoBuilder } from "@ldo/ldo";
import type { ConnectedPlugin } from "./ConnectedPlugin.js";
import type { SubjectNode } from "@ldo/rdf-utils";
import type { ILinkQuery, LQInput } from "./ILinkQuery.js";

export interface IConnectedLdoBuilder<
  Type extends LdoBase,
  Plugins extends ConnectedPlugin[],
> extends LdoBuilder<Type> {
  startLinkQuery<Input extends LQInput<Type>>(
    startingResource: Plugins[number]["types"]["resource"],
    startingSubject: SubjectNode | string,
    linkQueryInput: Input,
  ): ILinkQuery<Type, Input>;
}
