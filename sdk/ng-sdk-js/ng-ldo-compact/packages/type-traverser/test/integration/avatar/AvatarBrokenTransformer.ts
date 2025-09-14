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

export const BrokenAvatarTransformer = avatarTraverser.createTransformer<
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
    transformer: async (item, getTransformedChildren) => {
      const transformedChildren = await getTransformedChildren();
      return {
        doAction: () => {
          console.log(`I can't bend.`);
        },
        friends: transformedChildren.friends,
      };
    },
  },
  Person: async (item, getTransformedChildren, _setReturnPointer, _context) => {
    const personToReturn: ActionablePerson = {} as ActionablePerson;
    const transformedChildren = await getTransformedChildren();
    personToReturn.doAction = transformedChildren.doAction;
    personToReturn.friends = transformedChildren.friends;
    return personToReturn;
  },
});
