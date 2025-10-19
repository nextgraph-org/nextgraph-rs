import { describe, expect, it } from "vitest";
import { deepSignal } from "../deepSignal";
import { watch } from "../watch";
import { watchEffect } from "../watchEffect";

describe("watch", () => {
    it("watch immediate", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true }
        );
        expect(val).toEqual("tom");
    });
    it("watch deep", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true }
        );
        let value2!: string;
        watch(
            store,
            ({ newValue }) => {
                value2 = newValue.userinfo.name;
            },
            { immediate: true }
        );
        expect(val).toEqual("tom");
        store.userinfo.name = "jon";
        // patch delivery async (microtask)
        return Promise.resolve().then(() => {
            expect(val).toEqual("jon");
            // With refactored watch using native effect, shallow watcher now also updates root reference
            expect(value2).toEqual("jon");
        });
    });

    it("watch once", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let val!: string;
        watch(
            store,
            ({ newValue }) => {
                val = newValue.userinfo.name;
            },
            { immediate: true, once: true }
        );

        expect(val).toEqual("tom");
        store.userinfo.name = "jon";
        // once watcher shouldn't update after first run
        expect(val).toEqual("tom");
    });

    it("watch effect", () => {
        const store = deepSignal({
            userinfo: {
                name: "tom",
            },
        });
        let x = undefined;
        watchEffect(() => {
            x = store.userinfo.name;
        });

        expect(x).toEqual("tom");
        store.userinfo.name = "jon";
        expect(x).toEqual("jon");
    });
});
