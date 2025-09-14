/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  TransformerInputReturnTypes,
  TraverserDefinitions,
  TraverserTypes,
  VisitorsInput,
} from "../index.js";
import { Transformer, Visitor } from "../index.js";
import type { TransformersInput } from "../transformer/Transformers.js";

export class Traverser<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Types extends TraverserTypes<any>,
> {
  private traverserDefinition: TraverserDefinitions<Types>;

  constructor(traverserDefinition: TraverserDefinitions<Types>) {
    this.traverserDefinition = traverserDefinition;
  }

  public createTransformer<
    ReturnTypes extends TransformerInputReturnTypes<Types>,
    Context = undefined,
  >(transformers: TransformersInput<Types, ReturnTypes, Context>) {
    return new Transformer<Types, ReturnTypes, Context>(
      this.traverserDefinition,
      transformers,
    );
  }

  public createVisitor<Context = undefined>(
    visitors: VisitorsInput<Types, Context>,
  ) {
    return new Visitor<Types, Context>(this.traverserDefinition, visitors);
  }
}
