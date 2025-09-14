/* eslint-disable @typescript-eslint/no-explicit-any */
import { MultiMap } from "../transformer/transformerSubTraversers/util/MultiMap.js";
import type { TraverserTypes } from "../traverser/TraverserTypes.js";
import {
  createInstanceNodeFor,
  type InstanceNodeFor,
} from "./nodes/createInstanceNodeFor.js";
import type { TraverserDefinitions } from "../traverser/TraverserDefinition.js";

export class InstanceGraph<Types extends TraverserTypes<any>> {
  protected objectMap: MultiMap<
    object,
    keyof Types,
    InstanceNodeFor<Types, keyof Types>
  > = new MultiMap();
  public readonly traverserDefinitions: TraverserDefinitions<Types>;

  constructor(traverserDefinitions: TraverserDefinitions<Types>) {
    this.traverserDefinitions = traverserDefinitions;
  }

  getNodeFor<TypeName extends keyof Types>(
    instance: unknown,
    typeName: TypeName,
  ): InstanceNodeFor<Types, TypeName> {
    let potentialNode;
    // Skip the cache for Primitive Nodes
    const isCachable =
      this.traverserDefinitions[typeName].kind !== "primitive" &&
      typeof instance === "object" &&
      instance != null;

    if (isCachable) {
      potentialNode = this.objectMap.get(instance, typeName);
    }
    if (potentialNode) return potentialNode as InstanceNodeFor<Types, TypeName>;
    const newNode = createInstanceNodeFor(instance, typeName, this);
    if (isCachable) {
      // TODO: Figure out why this is a ts error
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this.objectMap.set(instance, typeName, newNode);
    }
    newNode._recursivelyBuildChildren();
    return newNode;
  }
}
