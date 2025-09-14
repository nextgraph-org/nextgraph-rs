/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TraverserDefinition } from "../../index.js";
import type { ParentIdentifiers } from "../../instanceGraph/ReverseRelationshipTypes.js";
import type { TraverserTypes } from "../../traverser/TraverserTypes.js";
import type { InstanceGraph } from "../InstanceGraph.js";
import type { InstanceNodeFor } from "./createInstanceNodeFor.js";

export abstract class InstanceNode<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends Types[TypeName],
> {
  readonly graph: InstanceGraph<Types>;
  readonly instance: Type["type"];
  readonly typeName: TypeName;
  protected readonly parents: Record<
    string,
    Set<InstanceNodeFor<Types, ParentIdentifiers<Types, TypeName>[0]>>
  > = {};

  constructor(
    graph: InstanceGraph<Types>,
    instance: Type["type"],
    typeName: TypeName,
  ) {
    this.graph = graph;
    this.instance = instance;
    this.typeName = typeName;
  }

  private getParentKey(
    identifiers: ParentIdentifiers<Types, TypeName>,
  ): string {
    // HACK: any cast. For some reason this doesn't build for ESM
    return (identifiers as any).join("|");
  }

  public _setParent<Identifiers extends ParentIdentifiers<Types, TypeName>>(
    identifiers: Identifiers,
    parentNode: InstanceNodeFor<Types, Identifiers[0]>,
  ) {
    const parentKey = this.getParentKey(identifiers);
    if (!this.parents[parentKey]) this.parents[parentKey] = new Set();
    // HACK: any cast. For some reason this doesn't build for ESM
    this.parents[parentKey].add(parentNode as any);
  }

  public parent<Identifiers extends ParentIdentifiers<Types, TypeName>>(
    ...identifiers: Identifiers
  ): InstanceNodeFor<Types, Identifiers[0]>[] {
    return Array.from(
      this.parents[this.getParentKey(identifiers)] ?? [],
    ) as InstanceNodeFor<Types, Identifiers[0]>[];
  }

  public allParents(): InstanceNodeFor<
    Types,
    ParentIdentifiers<Types, TypeName>[0]
  >[] {
    return Object.values(this.parents)
      .map((parentSet) => Array.from(parentSet))
      .flat();
  }

  public abstract _setChild(...props: any[]): void;

  public abstract child(...props: any[]): any;

  /**
   * Returns all nodes that are children of this node reguardless of their edge
   */
  public abstract allChildren(): InstanceNodeFor<Types, any>[];

  public get traverserDefinition(): TraverserDefinition<Types, TypeName, Type> {
    return this.graph.traverserDefinitions[
      this.typeName
    ] as unknown as TraverserDefinition<Types, TypeName, Type>;
  }

  public abstract _recursivelyBuildChildren(): void;
}
