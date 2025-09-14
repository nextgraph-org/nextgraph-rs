import type {
  TraverserDefinitions,
  ValidateTraverserTypes,
} from "../../src/index.js";
import { InstanceGraph } from "../../src/instanceGraph/InstanceGraph.js";

describe("InstanceGraph", () => {
  /**
   * Types
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

  describe("Build Instance Graph", () => {
    it("returns child nodes when child methods are called.", () => {
      const graph = new InstanceGraph(avatarTraverserDefinition);
      const aangBender = graph.getNodeFor(aang, "Bender");
      expect(aangBender.typeName).toBe("Bender");
      expect(aangBender.instance.name).toBe("Aang");
      // child
      const aangElement = aangBender.child("element");
      expect(aangElement.instance).toBe("Air");
      expect(aangElement.typeName).toBe("Element");
      const aangFriends = aangBender.child("friends");
      expect(aangFriends.length).toBe(2);
      const sokkaPerson = aangFriends[0];
      const kataraPerson = aangFriends[1];
      expect(sokkaPerson.instance.name).toBe("Sokka");
      expect(kataraPerson.instance.name).toBe("Katara");
      expect(sokkaPerson.typeName).toBe("Person");
      expect(kataraPerson.typeName).toBe("Person");
      const sokkaNonBender = sokkaPerson.child();
      expect(sokkaNonBender.instance.name).toBe("Sokka");
      expect(sokkaNonBender.typeName).toBe("NonBender");
      if (sokkaNonBender.typeName === "NonBender") {
        const aangPerson = sokkaNonBender.child("friends")[0];
        const aangBender2 = aangPerson.child();
        expect(aangBender2).toBe(aangBender);
      }
      // allChildren
      const [childElemement, childSokka, childKatara] =
        aangBender.allChildren();
      expect(childElemement.instance).toBe("Air");
      expect((childSokka.instance as NonBender).name).toBe("Sokka");
      expect((childKatara.instance as Bender).name).toBe("Katara");
      const childOfSokkaPerson = sokkaPerson.allChildren();
      expect(childOfSokkaPerson.length).toBe(1);
      expect(childOfSokkaPerson[0].instance.name).toBe("Sokka");
    });

    it("returns parent nodes when parent methods are called.", () => {
      const graph = new InstanceGraph(avatarTraverserDefinition);
      const aangBender = graph.getNodeFor(aang, "Bender");
      // parent
      const [aangPerson] = aangBender.parent("Person");
      expect(aangPerson.instance.name).toBe("Aang");
      expect(aangPerson.typeName).toBe("Person");
      const [sokkaNonBender] = aangPerson.parent("NonBender", "friends");
      const [kataraBender] = aangPerson.parent("Bender", "friends");
      expect(sokkaNonBender.typeName).toBe("NonBender");
      expect(sokkaNonBender.instance.name).toBe("Sokka");
      expect(kataraBender.typeName).toBe("Bender");
      expect(kataraBender.instance.name).toBe("Katara");
    });
  });

  describe("Transformer", () => {
    it("transforms", () => {});
  });
});
