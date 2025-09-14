import type { TraverserDefinitions } from "../../../src/index.js";
import type { AvatarTraverserTypes, Bender } from "./AvatarTraverserTypes.js";

export const avatarTraverserDefinition: TraverserDefinitions<AvatarTraverserTypes> =
  {
    Element: {
      kind: "primitive",
    },
    Bender: {
      kind: "interface",
      properties: {
        element: "Element",
        friends: "Person",
      },
    },
    NonBender: {
      kind: "interface",
      properties: {
        friends: "Person",
      },
    },
    Person: {
      kind: "union",
      selector: (item) => {
        return (item as Bender).element ? "Bender" : "NonBender";
      },
    },
  };
