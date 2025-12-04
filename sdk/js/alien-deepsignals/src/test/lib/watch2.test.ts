import { describe, expect, it } from "vitest";
import { deepSignal } from "../../deepSignal";
import { watch } from "../../watch";
import { effect } from "../../effect";

describe("watch2", () => {
    it("delivers immediate snapshot", () => {
        const state = deepSignal({ user: { name: "tom" } });
        let observed = "";
        watch(
            state,
            ({ newValue }) => {
                observed = newValue.user.name;
            },
            { immediate: true }
        );
        expect(observed).toEqual("tom");
    });

    it("emits patches with version", async () => {
        const state = deepSignal({ count: 0 });
        const versions: number[] = [];
        watch(state, ({ version }) => {
            versions.push(version);
        });
        state.count = 1;
        await Promise.resolve();
        expect(versions.length).toBe(1);
        expect(versions[0]).toBeGreaterThan(0);
    });

    it("effect runs and cleans up", () => {
        const calls: string[] = [];
        const dispose = effect((registerCleanup) => {
            calls.push("run");
            registerCleanup?.(() => calls.push("cleanup"));
        });
        dispose();
        expect(calls).toEqual(["run", "cleanup"]);
    });
});
