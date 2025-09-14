import {
  type ValidateTraverserTypes,
  type TraverserDefinitions,
  Traverser,
} from "../src/index.js";
import type { ParentIdentifiers } from "../src/index.js";

async function run() {
  /**
   * Original Type Definition
   */
  type Element = "Water" | "Earth" | "Fire" | "Air";
  interface Bender {
    name: string;
    element: Element;
    friends: Person[];
  }
  interface NonBender {
    name: string;
    friends: Person[];
  }
  type Person = Bender | NonBender;

  /**
   * Raw Data to Traverse
   */
  const aang: Bender = {
    name: "Aang",
    element: "Air",
    friends: [],
  };
  const sokka: NonBender = {
    name: "Sokka",
    friends: [],
  };
  const katara: Bender = {
    name: "Katara",
    element: "Water",
    friends: [],
  };
  aang.friends.push(sokka, katara);
  sokka.friends.push(aang, katara);
  katara.friends.push(aang, sokka);

  /**
   * Traverser Types
   */
  type AvatarTraverserTypes = ValidateTraverserTypes<{
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
      type: NonBender;
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

  type PersonParentIdentifiers = ParentIdentifiers<
    AvatarTraverserTypes,
    "Person"
  >;

  const sample: PersonParentIdentifiers = ["Bender", "friends"];
  console.log(sample);

  /**
   * Create the traverser definition
   */
  const avatarTraverserDefinition: TraverserDefinitions<AvatarTraverserTypes> =
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

  /**
   * Instantiate the Traverser
   */
  const avatarTraverser = new Traverser<AvatarTraverserTypes>(
    avatarTraverserDefinition,
  );

  // /**
  //  * Create a visitor
  //  */
  // const avatarVisitor = avatarTraverser.createVisitor<undefined>({
  //   Element: async (item) => {
  //     console.log(`Element: ${item}`);
  //   },
  //   Bender: {
  //     visitor: async (item) => {
  //       console.log(`Bender: ${item.name}`);
  //     },
  //     properties: {
  //       element: async (item) => {
  //         console.log(`Bender.element: ${item}`);
  //       },
  //     },
  //   },
  //   NonBender: {
  //     visitor: async (item) => {
  //       console.log(`NonBender: ${item.name}`);
  //     },
  //   },
  //   Person: async (item) => {
  //     console.log(`Person: ${item.name}`);
  //   },
  // });

  // /**
  //  * Run the visitor on data
  //  */
  // console.log(
  //   "############################## Visitor Logs ##############################",
  // );
  // await avatarVisitor.visit(aang, "Bender", undefined);

  // /**
  //  * Create a visitor that uses context
  //  */
  // interface AvatarCountingVisitorContext {
  //   numberOfBenders: number;
  // }
  // const avatarCountingVisitor =
  //   avatarTraverser.createVisitor<AvatarCountingVisitorContext>({
  //     Bender: {
  //       visitor: async (item, context) => {
  //         context.numberOfBenders++;
  //       },
  //     },
  //   });

  // /**
  //  * Run the counting visitor
  //  */
  // console.log(
  //   "############################## Found Number of Benders Using Visitor ##############################",
  // );
  // const countContext: AvatarCountingVisitorContext = { numberOfBenders: 0 };
  // await avatarCountingVisitor.visit(aang, "Bender", countContext);
  // console.log(countContext.numberOfBenders);

  /**
   * Set up a transformer
   */
  interface ActionablePerson {
    doAction(): void;
    friends: ActionablePerson[];
  }
  const avatarTransformer = avatarTraverser.createTransformer<
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
    Person: async (
      item,
      getTransformedChildren,
      setReturnPointer,
      _context,
    ) => {
      const personToReturn: ActionablePerson = {} as ActionablePerson;
      setReturnPointer(personToReturn);
      const transformedChildren = await getTransformedChildren();
      personToReturn.doAction = transformedChildren.doAction;
      personToReturn.friends = transformedChildren.friends;
      return personToReturn;
    },
  });

  /**
   * Run the Transformer
   */
  console.log(
    "############################## AvatarTraverser DoAction ##############################",
  );
  const result = await avatarTransformer.transform(aang, "Bender", undefined);
  result.doAction();
  result.friends[0].doAction();
  result.friends[1].doAction();
}
run();
