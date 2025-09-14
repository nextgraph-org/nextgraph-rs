/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  InterfaceTraverserDefinition,
  InterfaceType,
  InterfaceVisitorDefinition,
  InterfaceVisitorInputDefinition,
  KeyTypes,
  PrimitiveType,
  PrimitiveVisitorDefinition,
  PrimitiveVisitorInputDefinition,
  TraverserDefinitions,
  TraverserTypes,
  UnionType,
  UnionVisitorDefinition,
  UnionVisitorInputDefinition,
  Visitors,
  VisitorsInput,
} from "../index.js";
import { InstanceGraph } from "../instanceGraph/InstanceGraph.js";
import { MultiSet } from "../transformer/transformerSubTraversers/util/MultiSet.js";
import { visitorParentSubTraverser } from "./visitorSubTraversers/VisitorParentSubTraverser.js";

// TODO: Lots of "any" in this file. I'm just done with fancy typescript,
// but if I ever feel so inclined, I should fix this in the future.

export class Visitor<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Types extends TraverserTypes<any>,
  Context = undefined,
> {
  private traverserDefinition: TraverserDefinitions<Types>;
  private visitors: Visitors<Types, Context>;

  constructor(
    traverserDefinition: TraverserDefinitions<Types>,
    visitors: VisitorsInput<Types, Context>,
  ) {
    this.traverserDefinition = traverserDefinition;
    this.visitors = this.applyDefaultVisitors(visitors);
  }

  private applyDefaultInterfaceVisitorProperties<
    TypeName extends keyof Types,
    Type extends InterfaceType<keyof Types> & Types[TypeName],
  >(
    typeName: keyof Types,
    typePropertiesInput: InterfaceVisitorInputDefinition<
      Types,
      TypeName,
      Type,
      Context
    >["properties"],
  ): InterfaceVisitorDefinition<Types, TypeName, Type, Context>["properties"] {
    return Object.keys(
      (this.traverserDefinition[typeName] as InterfaceTraverserDefinition<Type>)
        .properties,
    ).reduce<Record<KeyTypes, any>>((agg, key: keyof Type["properties"]) => {
      if (typePropertiesInput && typePropertiesInput[key]) {
        agg[key] = typePropertiesInput[key];
      } else {
        agg[key] = () => {
          return;
        };
      }
      return agg;
    }, {}) as InterfaceVisitorDefinition<
      Types,
      TypeName,
      Type,
      Context
    >["properties"];
  }

  private applyDefaultInterfaceVisitor<
    TypeName extends keyof Types,
    Type extends InterfaceType<keyof Types> & Types[TypeName],
  >(
    typeName: keyof Types,
    typeInput?: InterfaceVisitorInputDefinition<Types, TypeName, Type, Context>,
  ): InterfaceVisitorDefinition<Types, TypeName, Type, Context> {
    if (!typeInput) {
      return {
        visitor: async () => {
          return;
        },
        properties: this.applyDefaultInterfaceVisitorProperties(typeName, {}),
      };
    }
    return {
      visitor: typeInput.visitor,
      properties: this.applyDefaultInterfaceVisitorProperties(
        typeName,
        typeInput.properties,
      ),
    };
  }

  private applyDefaultUnionVisitor<
    TypeName extends keyof Types,
    Type extends UnionType<keyof Types> & Types[TypeName],
  >(
    typeInput?: UnionVisitorInputDefinition<Types, TypeName, Type, Context>,
  ): UnionVisitorDefinition<Types, TypeName, Type, Context> {
    if (!typeInput) {
      return async () => {
        return;
      };
    }
    return typeInput;
  }

  private applyDefaultPrimitiveVisitor<
    TypeName extends keyof Types,
    Type extends PrimitiveType & Types[TypeName],
  >(
    typeInput?: PrimitiveVisitorInputDefinition<Types, TypeName, Type, Context>,
  ): PrimitiveVisitorDefinition<Types, TypeName, Type, Context> {
    if (!typeInput) {
      return async () => {
        return;
      };
    }
    return typeInput;
  }

  private applyDefaultVisitors(
    inputVisitors: VisitorsInput<Types, Context>,
  ): Visitors<Types, Context> {
    const finalVisitors: Partial<Visitors<Types, Context>> = {};
    Object.keys(this.traverserDefinition).forEach((typeName: keyof Types) => {
      if (this.traverserDefinition[typeName].kind === "interface") {
        finalVisitors[typeName] = this.applyDefaultInterfaceVisitor(
          typeName,
          inputVisitors[typeName] as any,
        ) as any;
      } else if (this.traverserDefinition[typeName].kind === "union") {
        finalVisitors[typeName] = this.applyDefaultUnionVisitor(
          inputVisitors[typeName] as any,
        ) as any;
      } else if (this.traverserDefinition[typeName].kind === "primitive") {
        finalVisitors[typeName] = this.applyDefaultPrimitiveVisitor(
          inputVisitors[typeName] as any,
        ) as any;
      }
    });
    return finalVisitors as Visitors<Types, Context>;
  }

  public async visit<TypeName extends keyof Types>(
    item: Types[TypeName]["type"],
    itemTypeName: TypeName,
    context: Context,
  ): Promise<void> {
    const instanceGraph = new InstanceGraph(this.traverserDefinition);
    instanceGraph.getNodeFor(item, itemTypeName);
    const toReturn = await visitorParentSubTraverser(item, itemTypeName, {
      traverserDefinition: this.traverserDefinition,
      visitors: this.visitors,
      visitedObjects: new MultiSet(),
      instanceGraph,
      context,
    });
    return toReturn;
  }
}
