declare global {
    interface Window {
        renderCounts?: Record<string, number>;
        renderEventCounts?: Record<string, number>;
        objectRenderCounts?: Record<string, Record<string, number>>;
    }
}

const incrementRenderEvents = (framework: string) => {
    if (typeof window === "undefined") return;
    const events = (window.renderEventCounts ??= {});
    events[framework] = (events[framework] ?? 0) + 1;
};

export function recordRender(framework: string, count: number) {
    if (typeof window === "undefined") return;
    const store = (window.renderCounts ??= {});
    store[framework] = count;
    incrementRenderEvents(framework);
}

export function getRenderCount(framework: string): number {
    if (typeof window === "undefined") return 0;
    return window.renderCounts?.[framework] ?? 0;
}

export function snapshotRenderCounts(): Record<string, number> {
    if (typeof window === "undefined") return {} as Record<string, number>;
    const source = window.renderEventCounts ?? {};
    return Object.fromEntries(Object.entries(source));
}

export function recordObjectRender(
    framework: string,
    objectId: string,
    count: number
) {
    if (typeof window === "undefined") return;
    const host = (window.objectRenderCounts ??= {});
    const entries = (host[framework] ??= {});
    entries[objectId] = count;
    incrementRenderEvents(framework);
}

export function snapshotObjectRenderCounts(): Record<
    string,
    Record<string, number>
> {
    if (typeof window === "undefined")
        return {} as Record<string, Record<string, number>>;
    const source = window.objectRenderCounts ?? {};
    return JSON.parse(JSON.stringify(source));
}
