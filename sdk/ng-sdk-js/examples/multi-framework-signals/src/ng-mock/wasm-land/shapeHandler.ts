import * as shapeManager from "./shapeManager";
import type { WasmConnection, Diff, Scope } from "./types";
import type { CompactShapeType, LdoCompactBase } from "@ldo/ldo";
import type { Person } from "src/shapes/ldo/personShape.typings";
import type { Cat } from "src/shapes/ldo/catShape.typings";
import type { TestObject } from "src/shapes/ldo/testShape.typings";
import updateShape from "./updateShape";

// Messages exchanged over the BroadcastChannel("shape-manager")
interface WasmMessage {
  type:
    | "Request"
    | "InitialResponse"
    | "FrontendUpdate"
    | "BackendUpdate"
    | "Stop";
  connectionId: string;
  diff?: Diff;
  schema?: CompactShapeType<any>["schema"];
  initialData?: LdoCompactBase;
}

export const mockTestObject = {
  id: "ex:mock-id-1",
  type: "TestObject",
  stringValue: "string",
  numValue: 42,
  boolValue: true,
  arrayValue: [1, 2, 3],
  objectValue: {
    id: "urn:obj-1",
    nestedString: "nested",
    nestedNum: 7,
    nestedArray: [10, 12],
  },
  anotherObject: {
    "id:1": {
      id: "id:1",
      prop1: "prop1 value",
      prop2: 100,
    },
    "id:2": {
      id: "id:1",
      prop1: "prop2 value",
      prop2: 200,
    },
  },
} satisfies TestObject;

const mockShapeObject1 = {
  id: "ex:person-1",
  type: "Person",
  name: "Bob",
  address: {
    id: "urn:person-home-1",
    street: "First street",
    houseNumber: "15",
  },
  hasChildren: true,
  numberOfHouses: 0,
} satisfies Person;

const mockShapeObject2 = {
  id: "ex:cat-1",
  type: "Cat",
  name: "Niko's cat",
  age: 12,
  numberOfHomes: 3,
  address: {
    id: "Nikos-cat-home",
    street: "Niko's street",
    houseNumber: "15",
    floor: 0,
  },
} satisfies Cat;

// Single BroadcastChannel for wasm-land side
const communicationChannel = new BroadcastChannel("shape-manager");

function getInitialObjectByShapeId<T extends LdoCompactBase>(
  shapeId?: string,
): T {
  if (shapeId?.includes("TestObject")) return mockTestObject as unknown as T;
  if (shapeId?.includes("Person")) return mockShapeObject1 as unknown as T;
  if (shapeId?.includes("Cat")) return mockShapeObject2 as unknown as T;
  console.warn(
    "BACKEND: requestShape for unknown shape, returning empty object.",
    shapeId,
  );
  return {} as T;
}

// Register handler for messages coming from js-land
communicationChannel.addEventListener(
  "message",
  (event: MessageEvent<WasmMessage>) => {
    console.log("BACKEND: Received message", event.data);
    const { type, connectionId, schema } = event.data;

    if (type === "Request") {
      const shapeId = schema?.shapes?.[0]?.id;
      const initialData = getInitialObjectByShapeId(shapeId);

      // Store connection. We store the shapeId string to allow equality across connections.
      shapeManager.connections.set(connectionId, {
        id: connectionId,
        // Cast to any to satisfy WasmConnection type, comparison in updateShape uses ==
        shape: (shapeId ?? "__unknown__") as any,
        state: initialData,
        callback: (diff: Diff, conId: WasmConnection["id"]) => {
          // Notify js-land about backend updates
          const msg: WasmMessage = {
            type: "BackendUpdate",
            connectionId: conId,
            diff,
          };
          communicationChannel.postMessage(msg);
        },
      });

      const msg: WasmMessage = {
        type: "InitialResponse",
        connectionId,
        initialData,
      };
      communicationChannel.postMessage(msg);
      return;
    }

    if (type === "Stop") {
      shapeManager.connections.delete(connectionId);
      return;
    }

    if (type === "FrontendUpdate" && event.data.diff) {
      updateShape(connectionId, event.data.diff);
      return;
    }

    console.warn("BACKEND: Unknown message type or missing diff", event.data);
  },
);

// Keep the original function for compatibility with any direct callers.
let connectionIdCounter = 1;
export default async function requestShape<T extends LdoCompactBase>(
  shape: CompactShapeType<T>,
  _scope: Scope | undefined,
  callback: (diff: Diff, connectionId: WasmConnection["id"]) => void,
): Promise<{ connectionId: string; shapeObject: T }> {
  const connectionId = `connection-${connectionIdCounter++}-${shape.schema.shapes?.[0]?.id}`;
  const shapeId = shape.schema.shapes?.[0]?.id;
  const shapeObject = getInitialObjectByShapeId<T>(shapeId);

  shapeManager.connections.set(connectionId, {
    id: connectionId,
    shape: (shapeId ?? "__unknown__") as any,
    state: shapeObject,
    callback,
  });

  return { connectionId, shapeObject };
}

const getObjectsForShapeType = <T extends LdoCompactBase>(
  shape: CompactShapeType<T>,
  scope: string = "",
): T[] => {
  // Procedure
  // - Get all triples for the scope
  // - Parse the schema (all shapes and anonymous shapes required for the shape type).

  // - Group triples by subject
  // - For the shapeType in the schema, match all required predicates
  // - For predicates pointing to nested objects
  //  - recurse

  // Repeat procedure for all matched subjects with optional predicates

  const quads: [
    string,
    string,
    number | string | boolean,
    string | undefined,
  ][] = [];

  // The URI of the shape to find matches for.
  const schemaId = shape.shape;
  // ShexJ shape object
  const rootShapeDecl = shape.schema.shapes?.find(
    (shape) => shape.id === schemaId,
  );
  if (!rootShapeDecl)
    throw new Error(`Could not find shape id ${schemaId} in shape schema`);

  if (rootShapeDecl.shapeExpr.type !== "Shape")
    throw new Error("Expected shapeExpr.type to be Shape");

  const shapeExpression = rootShapeDecl.shapeExpr.expression;
  // If shape is a reference...
  if (typeof shapeExpression === "string") {
    // TODO: Recurse
    return [];
  }

  const requiredPredicates = [];
  const optionalPredicates = [];

  if (shapeExpression?.type === "EachOf") {
    const predicates = shapeExpression.expressions.map((constraint) => {
      if (typeof constraint === "string") {
        // Cannot parse constraint refs
        return;
      } else if (constraint.type === "TripleConstraint") {
        requiredPredicates.push({
          predicate: constraint.predicate,
        });
      } else {
        // EachOf or OneOf possible?
      }
    });
  } else if (shapeExpression?.type === "OneOf") {
    // Does not occur AFAIK.
  } else if (shapeExpression?.type === "TripleConstraint") {
    // Does not occur AFAIK.
  }

  return [];
};

interface ShapeConstraintTracked {
  subject: string;
  childOf?: ShapeConstraintTracked;
  predicates: [
    {
      displayName: string;
      uri: string;
      type: "number" | "string" | "boolean" | "nested" | "literal";
      literalValue?: number | string | boolean | number[] | string[];
      nested?: ShapeConstraintTracked;
      min: number;
      max: number;
      currentCount: number;
    },
  ];
}

// Group by subject, check predicates of root level
// For all subjects of root level,
//   - recurse

// Construct matching subjects
// for each optional and non-optional predicate
//  - fill objects and record
//  - build tracked object (keeping reference counts to check if the object is still valid)
