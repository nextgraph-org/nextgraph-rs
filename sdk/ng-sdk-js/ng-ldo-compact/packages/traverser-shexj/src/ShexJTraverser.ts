import { ShexJTraverserDefinition } from "./ShexJTraverserDefinition.js";
import type { ShexJTraverserTypes } from "./ShexJTraverserTypes.js";
import { Traverser } from "@ldo/type-traverser";

export const ShexJTraverser = new Traverser<ShexJTraverserTypes>(
  ShexJTraverserDefinition,
);
