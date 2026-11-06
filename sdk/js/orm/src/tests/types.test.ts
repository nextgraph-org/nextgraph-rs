import { Unsynced } from "@ng-org/shex-orm";
import { BaseType, insertObject, RdfOrmSubscription, ShapeType } from "../core";
import { OrderByConfig, OrmSet, Snapshot, WhereConfig } from "../utilTypes";

function testUtilTypes() {
    type IRI = string;
    interface IdGraph {
        readonly "@graph": string;
        readonly "@id": string;
    }
    interface TestType extends IdGraph {
        readonly "@graph": string;
        readonly "@id": string;
        stringProp: string;
        numProp: number;
        boolProp: boolean;
        setProp: Set<string>;
        set2Prop?: Set<IRI>;
        objProp: IdGraph & { foo: string };
        obj2Prop: Set<{
            "@id": string;
            "@graph": string;
            bar: string | number;
        }>;
        obj3Prop: (IdGraph & { foo: string }) | (IdGraph & { bar: string });
        enumProp: "choice1" | "choice2";
    }

    // OrderByConfig type tests

    type TestTypeOrderByConf = OrderByConfig<TestType>;

    const test1ObConf0: TestTypeOrderByConf = {
        stringProp: "asc",
    };
    const test1ObConf1: TestTypeOrderByConf = {
        boolProp: "asc",
    };
    const test1ObConf2: TestTypeOrderByConf = [
        {
            boolProp: "asc",
        },
    ];
    const test1ObConf3: TestTypeOrderByConf = [
        {
            boolProp: "asc",
        },
        { enumProp: "desc" },
    ];
    const test1ObConf4: TestTypeOrderByConf = {
        numProp: "asc",
    };
    const test1ObConf5: TestTypeOrderByConf = {
        // @ts-expect-error
        objProp: "asc",
    };
    const test1ObConf6: TestTypeOrderByConf = {
        // @ts-expect-error
        setProp: "asc",
    };
    // @ts-ignore
    const test1ObConf7: TestTypeOrderByConf = {
        boolProp: "asc",
        // @ts-ignore
        numProp: "desc",
    };
    let test1ObConf8: TestTypeOrderByConf = {
        objProp: [{ foo: "asc" }],
    };
    let test1ObConf9: TestTypeOrderByConf = {
        // @ts-expect-error
        obj2Prop: [],
    };
    let test1ObConf10: TestTypeOrderByConf = {
        // @ts-expect-error
        obj3Prop: {
            foo: "asc",
        },
    };

    // WhereConfig type tests

    function testWhereConf(_conf: WhereConfig<TestType>) {}
    testWhereConf({
        enumProp: ["choice1", "choice2"],
        boolProp: true,
        numProp: [3, 4],
        stringProp: "foo",
        setProp: "mau",
        set2Prop: "maumau",
        objProp: {
            foo: "3",
        },
        obj2Prop: {
            bar: 2,
        },
    });
    testWhereConf({
        // @ts-expect-error
        enumProp: ["choice1", "choice3"],
        // @ts-expect-error
        boolProp: "true",
        // @ts-expect-error
        stringProp: [],
        objProp: {
            // @ts-expect-error
            foo: true,
        },
        obj2Prop: {},
        // @ts-ignore
        "@graph": "some:id",
    });
}

/** Type tests, not to be executed */
function typeTests() {
    interface Root {
        readonly "@graph": string;
        readonly "@id": string;
        someProp: string;

        get multiProp(): OrmSet<string | ({} & "some:foo")>;
        set multiProp(val: Set<string | ({} & "some:foo")>);

        get child(): OrmSet<Child>;
        set child(value: Child | Unsynced<Child>);
    }
    interface Child {
        readonly "@graph": string;
        readonly "@id": string;

        get multi(): OrmSet<ChildChild>;
        set multi(value: Set<ChildChild | Unsynced<ChildChild>>);

        get single(): ChildChild;
        set single(value: ChildChild | Unsynced<ChildChild>);
    }
    interface ChildChild {
        readonly "@id": string;
        readonly "@graph": string;
        foo: string;
    }

    let unsyncedRoot: Unsynced<Root> = {
        someProp: "",
        multiProp: new Set(["one"]),
        child: new Set([
            {
                multi: new Set(),
                single: { foo: "", "@graph": "" },
            },
        ]),
    };

    unsyncedRoot.child = new Set([
        {
            multi: new Set([]),
            single: { foo: "" },
        },
    ]);

    const fullRoot: Root = {
        "@graph": "",
        "@id": "",
        // @ts-expect-error
        multiProp: new Set(),
        // @ts-expect-error
        child: new Set([]),
        someProp: "",
    };

    // @ts-expect-error
    fullRoot.multiProp.getById("");

    fullRoot.child.add({
        multi: new Set(),
        single: {
            foo: "",
            "@graph": "",
            "@id": undefined,
        },
    });

    // .first() returns child type.
    let firstRootChild = fullRoot.child.first();
    firstRootChild!.multi = new Set([]);

    let ormSet: OrmSet<ChildChild>;
    // @ts-expect-error
    ormSet = new Set();
    ormSet.has({
        "@graph": "",
        // @ts-expect-error
        "@id": undefined,
        foo: "",
    });

    let ormSetUnsynced: Unsynced<OrmSet<ChildChild>>;
    ormSetUnsynced = new Set();
    ormSetUnsynced.has({
        "@graph": "",
        "@id": undefined,
        foo: "",
    });

    type FooType = BaseType & { foo: string };
    const fooShapeType: ShapeType<FooType> = {
        schema: {
            "some:schema": {
                iri: "some:schema",
                predicates: [
                    {
                        maxCardinality: 1,
                        minCardinality: 1,
                        dataTypes: [{ valType: "string" }],
                        iri: "some:foo",
                        readablePredicate: "foo",
                    },
                ],
            },
        },
        shape: "some:schema",
    };

    // Test insertObject without @id
    insertObject(fooShapeType, {
        // Must include graph
        "@graph": "",
        // missing "@id" is fine.
        foo: "bar",
        // @ts-expect-error
        shouldError: 2,
    });

    const sub = RdfOrmSubscription.getOrCreate(fooShapeType, {
        graphs: "",
    });
    sub.signalObject.add({
        "@id": "",
        foo: "",
    });

    // Test Unsynced type standalone.

    // @ts-expect-error
    const upo: Unsynced<{
        "@id": string;
        "@graph": string;
        set: OrmSet<{ k: number; "@id": string; "@graph": string }>;
    }> = null;
    upo.set = new Set();

    // @ts-expect-error
    const po: { set: OrmSet<{ k: number }> };
    // @ts-expect-error
    po.set = new Set();

    upo.set = new Set();

    const snapshotTest1: Snapshot<{
        readonly "@id": string;
        readonly "@graph": string;
        set: OrmSet<{ k: number; "@id": string; "@graph": string }>;
        set2: OrmSet<{ k: number; "@id": string; "@graph": string }>;
    }> = {
        // @ts-expect-error
        "@graph": undefined,
        "@id": "",
        // @ts-expect-error
        set: new Set([
            {
                "@graph": undefined,
                "@id": "",
                k: 2,
            },
        ]),
        // // @ts-expect-error
        // set2: new Set([
        //     {
        //         "@graph": "",
        //         "@id": "",
        //         k: "",
        //     },
        // ]),
    };
    // @ts-expect-error
    snapshotTest1.set2 = undefined;

    // @ts-expect-error
    const snapshotTest2: Snapshot<{
        readonly "@id": string;
        readonly "@graph": string;
        set: OrmSet<{ k: number; "@id": string; "@graph": string }>;
        set2: OrmSet<{ k: number; "@id": string; "@graph": string }>;
    }> = {
        "@graph": "",
        "@id": "",
        set: new Set([
            {
                "@graph": "",
                "@id": "",
                k: 2,
            },
        ]),
        // set2: new Set(),
    };
}

/** Unsynced type tests, not to be executed */
function unsyncedTypeTests() {
    type IRI = string;
    interface Child {
        readonly "@id": string;
        readonly "@graph": string;
        label: string;
        optLit?: string;
    }
    interface Parent {
        readonly "@id": string;
        readonly "@graph": string;
        name: string;
        tags: Set<IRI>;
        optTags?: Set<IRI>;
        optLit?: Set<"a" | "b">;
        opt?: Child;
        req: Child;

        get kid(): Child | undefined;
        set kid(value: Child | Unsynced<Child>);
        get kids(): OrmSet<Child> | undefined;
        set kids(value: Set<Child | Unsynced<Child>>);
    }

    // Mandatory properties with optional ids and optional properties may be omitted.
    const minimal: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
    };
    const full: Unsynced<Parent> = {
        "@id": "",
        "@graph": "",
        name: "",
        tags: new Set(["x"]),
        optTags: new Set(["x"]),
        optLit: new Set(["a"]),
        opt: { label: "" },
        req: { "@id": "", label: "" },
        kid: { label: "" },
        kids: new Set([{ label: "", optLit: "" }]),
    };
    const explicitUndefined: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
        opt: undefined,
        optTags: undefined,
        optLit: undefined,
        kid: undefined,
        kids: undefined,
    };

    // @ts-expect-error name is mandatory
    const noName: Unsynced<Parent> = { tags: new Set(), req: { label: "" } };
    // @ts-expect-error tags is mandatory
    const noTags: Unsynced<Parent> = { name: "", req: { label: "" } };
    // @ts-expect-error req is mandatory
    const noReq: Unsynced<Parent> = { name: "", tags: new Set() };
    const reqUndefined: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        // @ts-expect-error req does not accept undefined
        req: undefined,
    };
    const badOptTags: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
        // @ts-expect-error optional set element type is checked
        optTags: new Set([1]),
    };
    const badLit: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
        // @ts-expect-error literal set member is checked
        optLit: new Set(["c"]),
    };
    const badChild1: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        // @ts-expect-error nested label type is checked
        req: { label: 1 },
    };
    const badChild2: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        // @ts-expect-error nested label type is checked
        req: { label: "", optLit: 2 },
    };
    const badOpt: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
        // @ts-expect-error nested optional object type is checked
        opt: { label: 1 },
    };
    const badId: Unsynced<Parent> = {
        // @ts-expect-error id type is checked even though it is optional
        "@id": 5,
        name: "",
        tags: new Set(),
        req: { label: "" },
    };
    const badOptLitChild: Unsynced<Child> = {
        label: "",
        // @ts-expect-error Type 'number' is not assignable to type 'string'
        optLit: 2,
    };
}

/** Unsynced operation tests, not to be executed */
function unsyncedOperationTests() {
    type IRI = string;
    interface Child {
        readonly "@id": string;
        readonly "@graph": string;
        label: string;
        /** Opt list doc comment */
        optLit?: string;
    }
    interface Parent {
        readonly "@id": string;
        readonly "@graph": string;
        name: string;
        tags: Set<IRI>;
        optTags?: Set<IRI>;
        opt?: Child;
        req: Child;

        get kid(): Child | undefined;
        set kid(value: Child | Unsynced<Child>);
        get kids(): OrmSet<Child> | undefined;
        set kids(value: Set<Child | Unsynced<Child>>);
    }

    // Set mutations on an unsynced value.
    const draft: Unsynced<Parent> = {
        name: "",
        tags: new Set(),
        req: { label: "" },
    };
    draft.tags.add("x");
    draft.tags.delete("x");
    draft.name = "renamed";
    draft.req = { label: "other" };
    draft.opt = { label: "" };
    draft.optTags = new Set(["y"]);
    draft.optTags = undefined;
    draft.kid = { label: "" };
    draft.kids = new Set([
        { label: "" },
        { label: "", "@id": "" },
        { label: "", optLit: "" },
    ]);

    // Optional values are readable and narrowable.
    const opt = draft.opt;
    if (opt !== undefined) {
        const label: string = opt.label;
        void label;
    }
    const maybeTags: Set<IRI> | undefined = draft.optTags;
    void maybeTags;

    // Spreading and passing unsynced values to functions.
    function takesUnsynced(_p: Unsynced<Parent>) {}
    takesUnsynced({ ...draft, name: "copy" });
    takesUnsynced({
        name: "",
        tags: new Set(),
        req: { label: "" },
        opt: undefined,
    });

    // Child objects can be created without an id and then attached.
    const kidOnly: Unsynced<Child> = { label: "" };
    kidOnly.optLit = "";
    draft.kid = kidOnly;
    draft.req = { ...kidOnly, "@id": "" };
}
