import type { ValidateTraverserTypes } from "../../../src/index.js";

/**
 * Original Type Definition
 */
export type Element = "Water" | "Earth" | "Fire" | "Air";
export interface Bender {
  name: string;
  element: Element;
  friends: Person[];
}
export interface NonBender {
  name: string;
  friends: Person[];
}
export type Person = Bender | NonBender;

/**
 * Traverser Types
 */
export type AvatarTraverserTypes = ValidateTraverserTypes<{
  Element: {
    kind: "primitive";
    type: Element;
  };
  Bender: {
    kind: "interface";
    type: Bender;
    properties: {
      element: "Element";
      friends: "Person";
    };
  };
  NonBender: {
    kind: "interface";
    type: Bender;
    properties: {
      friends: "Person";
    };
  };
  Person: {
    kind: "union";
    type: Person;
    typeNames: "Bender" | "NonBender";
  };
}>;
