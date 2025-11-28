export type PerfCounters = {
    react: number;
    svelte: number;
    vue: number;
};

export interface TestState {
    type: string;
    stringValue: string;
    numValue: number;
    boolValue: boolean;
    nullValue: null;
    hiddenValue: number;
    arrayValue: number[];
    objectValue: {
        nestedString: string;
        nestedNum: number;
        nestedArray: number[];
    };
    setValue: Set<string>;
    objectSet: Set<TaggedObject>;
    count: number;
    perfCounters: PerfCounters;
}

export interface TaggedObject {
    "@id": string;
    label: string;
    count: number;
}

const buildDefaultObjectSetEntries = (): TaggedObject[] => {
    const baseEntries: TaggedObject[] = [
        {
            "@id": "urn:object:alpha",
            label: "Alpha",
            count: 1,
        },
        {
            "@id": "urn:object:beta",
            label: "Beta",
            count: 3,
        },
    ];
    const extraEntries = Array.from({ length: 298 }, (_, index) => {
        const idNumber = (index + 1).toString().padStart(3, "0");
        return {
            "@id": `urn:object:item-${idNumber}`,
            label: `Item ${idNumber}`,
            count: 5 + index,
        } satisfies TaggedObject;
    });
    return [...baseEntries, ...extraEntries];
};

const defaultObjectSetEntries = buildDefaultObjectSetEntries();

export const mockTestObject = Object.freeze({
    type: "TestObject",
    stringValue: "string",
    numValue: 42,
    boolValue: true,
    nullValue: null,
    hiddenValue: 0,
    arrayValue: [1, 2, 3],
    objectValue: {
        nestedString: "nested",
        nestedNum: 7,
        nestedArray: [10, 12],
    },
    setValue: new Set(["v1", "v2", "v3"]),
    objectSet: new Set<TaggedObject>(
        defaultObjectSetEntries.map((entry) => ({ ...entry }))
    ),
    count: 0,
    perfCounters: {
        react: 0,
        svelte: 0,
        vue: 0,
    },
} satisfies Omit<TestState, "setValue" | "objectSet"> & {
    setValue: Set<string>;
    objectSet: Set<TaggedObject>;
});

export function cloneDefaultObjectSet(): TaggedObject[] {
    return defaultObjectSetEntries.map((entry) => ({ ...entry }));
}

export function buildInitialState(): TestState {
    return {
        type: mockTestObject.type,
        stringValue: mockTestObject.stringValue,
        numValue: mockTestObject.numValue,
        boolValue: mockTestObject.boolValue,
        nullValue: mockTestObject.nullValue,
        hiddenValue: mockTestObject.hiddenValue,
        arrayValue: [...mockTestObject.arrayValue],
        objectValue: {
            nestedString: mockTestObject.objectValue.nestedString,
            nestedNum: mockTestObject.objectValue.nestedNum,
            nestedArray: [...mockTestObject.objectValue.nestedArray],
        },
        setValue: new Set(Array.from(mockTestObject.setValue)),
        objectSet: new Set(
            Array.from(mockTestObject.objectSet).map((entry) => ({ ...entry }))
        ),
        count: mockTestObject.count,
        perfCounters: {
            react: 0,
            svelte: 0,
            vue: 0,
        },
    };
}
