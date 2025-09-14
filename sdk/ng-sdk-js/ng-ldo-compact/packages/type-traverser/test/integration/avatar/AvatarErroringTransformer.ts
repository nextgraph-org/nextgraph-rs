import { Traverser } from "../../../src/index.js";
import { avatarTraverserDefinition } from "./AvatarTraverserDefinition.js";
import type { AvatarTraverserTypes } from "./AvatarTraverserTypes.js";

const avatarTraverser = new Traverser<AvatarTraverserTypes>(
  avatarTraverserDefinition,
);

interface ActionablePerson {
  doAction(): void;
  friends: ActionablePerson[];
}

export const AvatarErroringTransformer = avatarTraverser.createTransformer<
  {
    Element: {
      return: string;
    };
    Bender: {
      return: ActionablePerson;
      properties: {
        element: string;
      };
    };
    NonBender: {
      return: ActionablePerson;
    };
  },
  undefined
>({
  Element: async (item) => {
    return item.toUpperCase();
  },
  Bender: {
    transformer: async (item, getTransformedChildren) => {
      const transformedChildren = await getTransformedChildren();
      return {
        doAction: () => {
          console.log(`I can bend ${transformedChildren.element}`);
        },
        friends: transformedChildren.friends,
      };
    },
    properties: {
      element: async (item, getTransformedChildren) => {
        const transformedChildren = await getTransformedChildren();
        return `the element of ${transformedChildren}`;
      },
    },
  },
  NonBender: {
    transformer: async (_item, _getTransformedChildren) => {
      throw new Error("No Non Benders Allowed");
    },
  },
  Person: async (item, getTransformedChildren, setReturnPointer, _context) => {
    const personToReturn: ActionablePerson = {} as ActionablePerson;
    setReturnPointer(personToReturn);
    const transformedChildren = await getTransformedChildren();
    personToReturn.doAction = transformedChildren.doAction;
    personToReturn.friends = transformedChildren.friends;
    return personToReturn;
  },
});
