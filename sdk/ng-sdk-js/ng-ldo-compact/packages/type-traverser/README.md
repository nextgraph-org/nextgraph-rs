# Type Traverser

An organized way to traverse objects using typescript.

## Installation
```
npm i @ldo/type-traverser
```

## Why use this library?
Have you ever needed to traverse large, complex objects? Chances are you built traversers to recognize when something is an array or a certain kind of record.

Building traversers is an arduous process that involves a lot of repeated concepts and repeated code. Type-Traverser minimizes the repetition.

## Tutorial

This tutorial walks you through how to set up a traverser. You can see the full runnable example at [`example/example.ts`](./example/example.ts), or you can run the example by running `npm run start`.

### Defining the type

The first step is defining what your type looks like. Let's say, for example, the following typescript typings represent what you need to traverse. These types represent characters from Avatar: The Last Airbender where there are special people called "Benders" who can manipulate the elements.

```typescript
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
```

Some sample data that follows this type looks like this:

```typescript
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
```

### Defining Traverser Types

Next, we need to define a traverser. A traverser has data that defines what your object looks like.

To define a traverser, you first need to set up a `TraverserTypes` type. You can validate the `TraverserTypes` type by using the `ValidateTraverserTypes` type and passing in your `TraverserTypes` as a generic.

```typescript
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
```

Let's break down what's happening here. We're telling typescript the kinds of "Sub-Traversers" each type uses.

Each sub-traverser has a name called a "TypeName". In this example we have four TypeNames: `Element`, `Bender`, `NonBender`, and `Person`. TypeNames can be any name you want, but it's best practice to match your TypeNames to the name of it's corresponding type. For example, the type `Element` is associated with the TypeName `Element`. Some sub-traversers will also require you to provide TypeNames as strings.

`ValidateTraverserTypes` is  convenient way to check if you have made a valid `TraverserTypes`. If you make a mistake - for example, you provide an invalid TypeName as seen below - the resulting type will be `never`;

![ValidateTraverserTypesExample](/tutorialImages/ValidateTraverserTypesExample.png)

At the moment, there are three sub-traverser types:

#### Union
You should use a union sub-traverser for typescript union types - types that usually follow the form `a | b | c` where any element from the list is valid.

In the example, `Person` is a "Union" sub-traverser because a `Person` is a union of `Bender` and `NonBender` (`Bender | NonBender`).

```typescript
Person: {
  kind: "union";
  type: Person;
  typeNames: "Bender" | "NonBender";
};
```

There are three fields for the union sub-traverser:
 - `kind`: Must be `"union"` to denote that this defines a union sub-traverser.
 - `type`: The typescript type corresponding to this union.
 - `typeNames`: Defines a list of TypeNames that correspond to the actual type.

#### Interface
You should use a interface sub-traverser for interface or object types - any type that maps discrete keys to values. 

In the example, `Bender` is an "Interface" sub-traverser because a `Bender` type is a map of discrete keys (like `element` and `friends`) to type values (like `Element` and `Person[]`).

```typescript
Bender: {
  kind: "interface";
  type: Bender;
  properties: {
    element: "Element";
    friends: "Person";
  };
};
```

There are three fields for the interface sub-traverser:
 - `kind`: Must be `"interface"` to denote that this defines a interface sub-traverser.
 - `type`: The typescript type corresponding to this inteface or object type.
 - `properties`: Defines the properties that should be traversed by mapping the property name to its corresponding TypeName. Not all interface properties need to be listed here, only the ones that should be traversed. If no properties from this interface need to be traversed, you either provide `properties: Record<string, never>` or use a "Primitive" sub-traverser.

#### Primitive
You should use a primitive sub-traverser for "leaf-types" - types that do not have any children. 

In the example, `Element` is a "Primitive" sub-traverser because an `Element` type is just a collection of strings (`"Water" | "Earth" | "Fire" | "Air"`).

```typescript
Element: {
  kind: "primitive";
  type: Element;
};
```

Note: while it is common to use a primitive sub traverser for primitive types like `string`, `boolean`, `number`, etc. you may also use it for more complex types like interfaces and arrays if you do not care about traversing the children of those types. 

There are two fields for the primitive sub-traverser:
 - `kind`: Must be `"primitive"` to denote that this defines a primitive sub-traverser.
 - `type`: The typescript type corresponding to this primitive.

### Creating a traverser definition
Typescript typings aren't available at runtime, so the next step is to translate the `TraverserTypes` that we made into a standard JSON object called a "TraverserDefinitions". But, don't worry! This will be easy. If you define a variable as a `TraverserDefinitions<TraverserType>`, your IDE's IntelliSense will be able to direct you through exactly what to fill out, as seen below. 

![Traverse Definition IntelliSense](/tutorialImages/TraveserDefinitionIntellisense.png)

In our example, the TraverserDefinitions looks like:

```typescript
const avatarTraverserDefinitions: TraverserDefinitions<AvatarTraverserTypes> = {
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
```

#### Defining a Union Selector
The only part of the TraverserDefinitions that isn't just blindly following IntelliSense is the `selector` on a Union sub-traverser. A `selector` is given the item and should return the TypeName corresponding to the item.

In the above example, `"Bender"` is returned if the given item has a `"element"` property because a `"NonBender"` does not include an `"element"` property.

### Instantiating a Traverser
Now that we've defined the traverser types, we're ready to instantiate the traverser itself. A `Traverser` is a class that lets you traverse the object you defined.

In our example, this is how we instantiate the traverser

```typescript
const avatarTraverser = new Traverser<AvatarTraverserTypes>(
  avatarTraverserDefinitions
);
```

### Using a Traverser
At this point I'd like to welcome everyone who was linked to this section from another library. If this is you, someone else has already defined a traverser for you. You don't need to know how to create a traverser, but if you want to know, you can read the proceeding sections in this document.

From now on, we will detail how to use an already defined traverser using sample data about the fictional universe of "Avatar: The Last Airbender." If you came here from another library, your traverser will be different, but the concepts are the same. So far we have the following:

```typescript
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
```

Some sample data that follows this type looks like this:

```typescript
/**
 * The Type Definitions 
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
 * Some Raw Sample Data that follows our Types
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
 * A Traverser to Traverse these type definitions
 */
avatarTraverser
```

### Using a Visitor
The simplest way to traverse your object is using a `Visitor`. A visitor will trigger a given function when it finds an object that matches the corresponding TypeName.

In our Avatar example, our visitor could look like:

```typescript
const avatarVisitor = avatarTraverser.createVisitor<undefined>({
  Element: async (item) => {
    console.log(`Element: ${item}`);
  },
  Bender: {
    visitor: async (item) => {
      console.log(`Bender: ${item.name}`);
    },
    properties: {
      element: async (item) => {
        console.log(`Bender.element: ${item}`);
      },
    },
  },
  NonBender: {
    visitor: async (item) => {
      console.log(`NonBender: ${item.name}`);
    },
  },
  Person: async (item) => {
    console.log(`Person: ${item.name}`);
  },
});

await avatarVisitor.visit(aang, "Bender", undefined);
```

Running this code will result in this log:
```bash
Bender: Aang
Bender.element: Air
Element: Air
Person: Sokka
NonBender: Sokka
Person: Aang
Person: Katara
Bender: Katara
Bender.element: Water
Element: Water
```

Let's break down what's happening here.

"Primitive" and "Union" sub-traverser types (Like `Element` and `Person` respectively) require only a function. That function is crafted for the specific item. For example:

 - Element's visitor function: `(item: Element, context: undefined) => Promise<void>`;
 - Person's visitor function: `(item: Person, context: undefined) => Promise<void>`;

"Interface" sub-traversers allow you to define a visitor function for the whole object AND each of its properties. Each of these, including the visitor function for the whole object is optional. For example, an interface visitor for "Bender" follows the following typing:

```typescript
{
  visitor?: (item: Bender, context: undefined) => Promise<void>;
  properties?: {
    element?: (item: Element, context: undefined) => Promise<void>;
    friends?: (item: Person[], context: undefined) => Promise<void>;
  }
}
```

When we want to run the visitor we use the `visit` method.

```typescript
await avatarVisitor.visit(aang, "Bender", undefined);
```

The `visit` method takes in three arguments:
 - The data that should be traversed. In this example the "aang" object.
 - The TypeName of the data. In this example `"Bender"` because the "aang" object is a `Bender`. `"Person"` would have also been acceptable.
 - The context (described in the next section)

Note: You DO NOT need to define a visitor function for every TypeName, only the ones you care about.

Note: Notice that we see the same person's name appear in two logs. For example we see both "Person: Sokka" and "NonBender: Sokka". That's because we visit the same object as a `Person` type and as a `NonBender` type.

### Using Context
Sometimes you want to pass a shared object that's accessible from all traversers. That's where "context" comes in. Here's an example that uses context with our AvatarTraverser:

```typescript
interface AvatarCountingVisitorContext {
  numberOfBenders: number;
}
const avatarCountingVisitor =
  avatarTraverser.createVisitor<AvatarCountingVisitorContext>({
    Bender: {
      visitor: async (item, context) => {
        context.numberOfBenders++;
      },
    },
  });
const countContext: AvatarCountingVisitorContext = { numberOfBenders: 0 };
await avatarCountingVisitor.visit(aang, "Bender", countContext);
console.log(countContext.numberOfBenders); // Logs 2
```

In this example, we want to count the number of "Benders" we encounter while traversing our object.

`traverser.createVisitor` accepts one generic defining the type of the context.

### Using a Transformer
Sometimes you don't want to just visit an object, you want to transform it into something else. A Transformer is the best way to do that.

In the following example, we want to transform our data into a graph of `ActionablePerson` as defined by this interface:

```typescript
interface ActionablePerson {
  doAction(): void;
  friends: ActionablePerson[];
}
```

We still want to maintain the friendship connections, but the transformed object is completely different.

Let's first look at the full code, then we'll break it down into sections:

```typescript
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
    _context
  ) => {
    const personToReturn: ActionablePerson = {} as ActionablePerson;
    setReturnPointer(personToReturn);
    const transformedChildren = await getTransformedChildren();
    personToReturn.doAction = transformedChildren.doAction;
    personToReturn.friends = transformedChildren.friends;
    return personToReturn;
  },
});

const result = await avatarTransformer.transform(aang, "Bender", undefined);
result.doAction();
result.friends[0].doAction();
result.friends[1].doAction();
// Logs:
// I can bend the element of AIR
// I can't bend.
// I can bend the element of WATER
```

#### Defining Transformer Return Types
The first step to working with transformers is defining the return types for each transformer. This is done by providing a generic to the `createTransformer` function:

```typescript
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
  // ...
});
```

For each TypeName you wish to transform, you can provide return type. In this example, the `Element` transformer must return a `string`, and the `NonBender` transformer must return an `Actionable Person`.

Interface types may also provide the return types for their individual properties, as seen in the `Bender` type. Though, this is not required.

Note: You don't need to define the return type for every TypeName and property. This library's typings will recursively search for the correct return type based on the input you have given and display that in the tooltip. In the example below, the "Bender" translator knows that the `friends` property is an `ActionablePerson[]` not because the `friends` property was defined in the return types, but because it has deduced that the `friends` field is linked the the `Person` type which itself is made up of the `Bender` and `NonBender` types, and both those types have a return type of `ActionablePerson`.

![Return Type Tooltip](/tutorialImages/ReturnTypeTooltip.png)

Note: the `undefined` at the end defines the context and is not associated with the return types. To learn how to use context see the "Using Context" section.

#### Primitive Transformer
A primitive transformer is the simplest of the transformers. In this example `Element` is a primitive:

```typescript
const avatarTransformer = avatarTraverser.createTransformer<
  // ...
>({
  Element: async (item: Element, context: undefined): Promise<string> => {
    return item.toUpperCase();
  },
  // ...
});
```

A primitive transformer receives an "item" corresponding to its type and a context and must return its defined return type.

#### Interface Transformer
An interface transformer allows you to transform not only the base interface object, but the properties of that object as well. In this example, `Bender` is an interface:

```typescript
const avatarTransformer = avatarTraverser.createTransformer<
  // ...
>({
  // ...
  Bender: {
    transformer: async (
      item: Bender,
      getTransformedChildren: GetTransformedChildrenFunction,
      setReturnPointer: SetReturnPointerFunction,
      context: undefined
    ): Promise<ActionablePerson> => {
      const transformedChildren: {
          element: string;
          friends: ActionablePerson[];
      } = await getTransformedChildren();
      return {
        doAction: () => {
          console.log(`I can bend ${transformedChildren.element}`);
        },
        friends: transformedChildren.friends,
      };
    },
    properties: {
      element: async (item, getTransformedChildren, setReturnProperty, context) => {
        const transformedChildren: string = await getTransformedChildren();
        return `the element of ${transformedChildren}`;
      },
    },
  },
  // ...
});
```

The base transformer (located at the `transformer` field) and the property transformers are functions with four arguments:

 - item: The original item. In this example, the base transformer would receive a `Bender` and the "element" transformer would receive an `Element`.
 - getTransformedChildren: runs the transformers corresponding to the children of this object and returns their result. In this example, the base transformer's `getTransformedChildren` function returns `{ element: string; friends: ActionablePerson[] }` because the element property transformer returns a `string` and the transformers that eventually feed into the friend field (`Person`, `Bender`, and `NonBender`) return ActionablePerson. In the elements transformer, the `getTransformedChildren` function returns string because the `Elements` transformer returns string.
 - setReturnProperty: A function used to prevent infinite recursion for circular data. See the "Preventing Circular Recursion" section for more.
 - context: The context variable. See the "Using Context" section for more.

 A transformer must return its defined return type. For example, the base transformer must return `ActionablePerson` because it was defined that way when creating the return types.

#### Union Transformer
A union transformer lets you transform a Union type. In this example "Person" is a union type.

```typescript
const avatarTransformer = avatarTraverser.createTransformer<
  // ...
>({
  // ...
  Person: async (
    item: Person,
    getTransformedChildren: GetTransformedChildrenFunction,
    setReturnPointer: SetReturnPointerFunction,
    context: undefined
  ) => {
    const personToReturn: ActionablePerson = {} as ActionablePerson;
    const transformedChildren: ActionablePerson = await getTransformedChildren();
    personToReturn.doAction = transformedChildren.doAction;
    personToReturn.friends = transformedChildren.friends;
    return personToReturn;
  },
});
```

The transformer function has four arguments:

 - item: The original item. In this example, the transformer would receive a `Person`.
 - getTransformedChildren: runs the transformers corresponding to the indivual elements that make up the union and returns their result. In this example, the transformer's `getTransformedChildren` function returns `ActionablePerson` because this union is made up of `Bender` and `NonBender` and both are set to return an `ActionablePerson`.
 - setReturnProperty: A function used to prevent infinite recursion for circular data. See the "Preventing Circular Recursion" section for more.
 - context: The context variable. See the "Using Context" section for more.

A transformer must return its defined return type. For example, the transformer must return `ActionablePerson` because it was defined that way when creating the return types.

Note: The above example transformer is actually not needed as it simply returns a duplicate of the value provided by `getTransformedChildren`. If a transformer is not provided, by default, this library will pass on the values from `getTransformedChildren`.

#### Preventing Circular Recursion
Our example data is circular - it loops back on itself. If I were to call `aang.friends[0].friends[0]`, I would once again be at the aang object. This is very useful when visiting the objects, but it poses a problem when we want to transform them. The aang transformer needs to wait for the sokka and katara objects to be transformed in order for it to transform itself. But the sokka object needs to wait for the aang and katara object to be transformed. The same is true for the katara object. So, if this is the case where do you begin?

Recall the way we defined this data in the first place:

```typescript
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
```

Note that we first defined an incomplete object, then once all of our objects were defined, we modified it to link them all together.

You can do the same thing using the `setRetunPointer` function:

```typescript
const avatarTransformer = avatarTraverser.createTransformer<
  // ...
>({
  // ...
  Person: async (
    item: Person,
    getTransformedChildren: GetTransformedChildrenFunction,
    setReturnProinter: SetReturnPointerFunction,
    context: undefined
  ) => {
    const personToReturn: ActionablePerson = {} as ActionablePerson;
    setReturnPointer(personToReturn); // <------ HERE
    const transformedChildren: ActionablePerson = await getTransformedChildren();
    personToReturn.doAction = transformedChildren.doAction;
    personToReturn.friends = transformedChildren.friends;
    return personToReturn;
  },
});
```

In this example we call `setReturnPointer` and pass in an incomplete object. After that, we can safely call `getTransformedChildren` without worrying about hitting an infinite loop. Once we have the transformedChildren, we can attach them to the original object we passed to `setReturnPointer`;

`setReturnPointer` should be called by at least one of the transformers involved in a potential loop.

#### Running the Transform Function
Once you have defined all of your transformers, you can run the transform function:

```typescript
const result = await avatarTransformer.transform(aang, "Bender", undefined);
result.doAction();
result.friends[0].doAction();
result.friends[1].doAction();
// Logs:
// I can bend the element of AIR
// I can't bend.
// I can bend the element of WATER
```

The `transform` function takes in three arguments:
 - The data that should be traversed. In this example the aang object.
 - The TypeName of the data. In this example `"Bender"` because the aang object is a `Bender`. `"Person"` would have also been acceptable.
 - The context (see the "Using Context" section for more)

The transform method returns the return type corresponding to the TypeName. In this case, it returns `ActionablePerson` because that is the return type for `Bender`.

## Sponsorship
This project was made possible by a grant from NGI Zero Entrust via nlnet. Learn more on the [NLnet project page](https://nlnet.nl/project/SolidUsableApps/).

[<img src="https://nlnet.nl/logo/banner.png" alt="nlnet foundation logo" width="300" />](https://nlnet.nl/)
[<img src="https://nlnet.nl/image/logos/NGI0Entrust_tag.svg" alt="NGI Zero Entrust Logo" width="300" />](https://nlnet.nl/)

## Liscense
MIT