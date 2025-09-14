/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApplyArrayAndUndefined } from "../../transformer/TransformerReturnTypesDefaults.js";
import type {
  InterfaceType,
  TraverserTypes,
} from "../../traverser/TraverserTypes.js";
import type { InstanceGraph } from "../InstanceGraph.js";
import type { InstanceNodeFor } from "./createInstanceNodeFor.js";
import { InstanceNode } from "./InstanceNode.js";

/**
 * Helper Function
 */
export type InterfacePropertyNode<
  Types extends TraverserTypes<any>,
  Type extends InterfaceType<keyof Types>,
  PropertyName extends keyof Type["properties"],
> = ApplyArrayAndUndefined<
  Type["type"][PropertyName],
  InstanceNodeFor<Types, Type["properties"][PropertyName]>
>;

/**
 * Class
 */
export class InterfaceInstanceNode<
  Types extends TraverserTypes<any>,
  TypeName extends keyof Types,
  Type extends InterfaceType<keyof Types> & Types[TypeName],
> extends InstanceNode<Types, TypeName, Type> {
  private children: {
    [PropertyName in keyof Type["properties"]]: InterfacePropertyNode<
      Types,
      Type,
      PropertyName
    >;
  };

  constructor(
    graph: InstanceGraph<Types>,
    instance: Type["type"],
    typeName: TypeName,
  ) {
    super(graph, instance, typeName);
    // This will eventually be filled out by the recursivelyBuildChildren method
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.children = {};
  }

  public _setChild<PropertyName extends keyof Type["properties"]>(
    propertyName: PropertyName,
    child: InterfacePropertyNode<Types, Type, PropertyName>,
  ): void {
    this.children[propertyName] = child;
  }

  public child<PropertyName extends keyof Type["properties"]>(
    propertyName: PropertyName,
  ): InterfacePropertyNode<Types, Type, PropertyName> {
    return this.children[propertyName];
  }

  public allChildren(): InstanceNodeFor<
    Types,
    Type["properties"][keyof Type["properties"]]
  >[] {
    return Object.values(this.children).flat();
  }

  public _recursivelyBuildChildren() {
    Object.entries(this.instance).forEach(
      ([propertyName, value]: [keyof Type["properties"], unknown]) => {
        const propertyTypeName =
          // Fancy typescript doesn't work until you actually give it a type
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.traverserDefinition.properties[propertyName];
        if (!propertyTypeName) return;

        const initChildNode = (val: unknown) => {
          const node = this.graph.getNodeFor(val, propertyTypeName);
          // Fancy typescript doesn't work until you actually give it a type
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          node._setParent([this.typeName, propertyName], this);
          return node;
        };
        const childNode = (Array.isArray(value)
          ? value.map((val) => initChildNode(val))
          : initChildNode(value)) as unknown as InterfacePropertyNode<
          Types,
          Type,
          keyof Type["properties"]
        >;
        this._setChild(propertyName, childNode);
      },
    );
  }
}
