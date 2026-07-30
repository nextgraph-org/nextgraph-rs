export const readOnlySet = new Proxy(new Set(), {
    get(target, key, _receiver) {
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

class RawArray extends Array {}
class RawObject {}
class RawSet extends Set {}

export const setRawPrototype = (obj: any) => {
    if (Array.isArray(obj)) {
        return Object.setPrototypeOf(obj, RawArray.prototype);
    } else if (obj instanceof Set) {
        return Object.setPrototypeOf(obj, RawSet.prototype);
    } else if (obj && typeof obj === "object") {
        return Object.setPrototypeOf(obj, RawObject.prototype);
    }
    return obj;
};
