export const readOnlySet = new Proxy(new Set(), {
    get(target, key, receiver) {
        if (key === "add" || key === "delete" || key === "clear") {
            return () => {
                throw new Error("Set is readonly because scope is empty.");
            };
        }
        const value = (target as any)[key];
        if (typeof value === "function") {
            return value.bind(target);
        }
        return value;
    },
});
