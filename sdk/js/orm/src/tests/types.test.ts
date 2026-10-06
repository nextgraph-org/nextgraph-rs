function testUtilTypes() {
    type IRI = string;
    interface TestType {
        readonly "@graph": string;
        readonly "@id": string;
        stringProp: string;
        numProp: number;
        boolProp: boolean;
        setProp: Set<string>;
        set2Prop?: Set<IRI>;
        objProp: { "@id": string; "@graph": string; foo: string };
        obj2Prop: Set<{
            "@id": string;
            "@graph": string;
            bar: string | number;
        }>;
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
        set child(value: Child | Unpersisted<Child>);
    }
    interface Child {
        readonly "@graph": string;
        readonly "@id": string;

        get multi(): OrmSet<ChildChild>;
        set multi(value: Set<ChildChild | Unpersisted<ChildChild>>);

        get single(): ChildChild;
        set single(value: ChildChild | Unpersisted<ChildChild>);
    }
    interface ChildChild {
        readonly "@id": string;
        readonly "@graph": string;
        foo: string;
    }

    let unpersistedRoot: Unpersisted<Root> = {
        someProp: "",
        multiProp: new Set(["one"]),
        child: new Set([
            {
                multi: new Set(),
                single: { foo: "", "@graph": "" },
            },
        ]),
    };

    unpersistedRoot.child = new Set([
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

    let ormSet: OrmSet<ChildChild>;
    // @ts-expect-error
    ormSet = new Set();
    ormSet.has({
        "@graph": "",
        // @ts-expect-error
        "@id": undefined,
        foo: "",
    });

    let ormSetUnpersisted: Unpersisted<OrmSet<ChildChild>>;
    ormSetUnpersisted = new Set();
    ormSetUnpersisted.has({
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

    // Test Unpersisted type standalone.

    // @ts-expect-error
    const upo: Unpersisted<{
        "@id": string;
        "@graph": string;
        set: OrmSet<{ k: number; "@id": string; "@graph": string }>;
    }> = null;
    upo.set = new Set();

    // @ts-expect-error
    const po: { set: OrmSet<{ k: number }> };
    // @ts-expect-error
    po.set = new Set();
}
