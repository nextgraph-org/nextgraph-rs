/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  TraverserTypes,
  UnionType,
} from "../../traverser/TraverserTypes.js";
import type { InstanceNodeFor } from "./createInstanceNodeFor.js";
import { InstanceNode } from "./InstanceNode.js";

export class UnionInstanceNode<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends UnionType<keyof Types> & Types[TypeName],
> extends InstanceNode<Types, TypeName, Type> {
  private childNode: InstanceNodeFor<Types, Type["typeNames"]> | undefined;

  public _setChild(child: InstanceNodeFor<Types, Type["typeNames"]>): void {
    this.childNode = child;
  }

  public child(): InstanceNodeFor<Types, Type["typeNames"]> {
    if (!this.childNode) throw new Error("Child node not yet set");
    return this.childNode;
  }

  public allChildren(): InstanceNodeFor<Types, Type["typeNames"]>[] {
    return this.childNode ? [this.childNode] : [];
  }
  public _recursivelyBuildChildren(): void {
    const childType = this.traverserDefinition.selector(this.instance);
    const childNode = this.graph.getNodeFor(this.instance, childType);
    this._setChild(childNode);
    // Fancy typescript only works once the type is provided
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    childNode._setParent([this.typeName], this);
  }
}
