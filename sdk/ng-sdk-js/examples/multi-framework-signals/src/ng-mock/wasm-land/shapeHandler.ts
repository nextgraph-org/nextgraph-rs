import * as shapeManager from "./shapeManager";
import type { WasmConnection, Diff, Scope } from "./types";
import type { ShapeType, OrmBase } from "@nextgraph-monorepo/ng-shex-orm";
import type { Person } from "../../shapes/ldo/personShape.typings";
import type { Cat } from "../../shapes/ldo/catShape.typings";
import type { TestObject } from "../../shapes/ldo/testShape.typings";
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
    shapeType?: ShapeType<any>;
    initialData?: OrmBase;
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

function getInitialObjectByShapeId<T extends OrmBase>(shapeId?: string): T {
    if (shapeId?.includes("TestObject")) return mockTestObject as unknown as T;
    if (shapeId?.includes("Person")) return mockShapeObject1 as unknown as T;
    if (shapeId?.includes("Cat")) return mockShapeObject2 as unknown as T;
    console.warn(
        "BACKEND: requestShape for unknown shape, returning empty object.",
        shapeId
    );
    return {} as T;
}

// Register handler for messages coming from js-land
communicationChannel.addEventListener(
    "message",
    (event: MessageEvent<WasmMessage>) => {
        console.log("BACKEND: Received message", event.data);
        const { type, connectionId, shapeType } = event.data;

        if (type === "Request") {
            const shapeId = shapeType?.shape;
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

        console.warn(
            "BACKEND: Unknown message type or missing diff",
            event.data
        );
    }
);
