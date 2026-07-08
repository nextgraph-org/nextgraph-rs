export function escapePathSegment(segment: string): string {
    return segment
        .replaceAll(/~/g, "~0")
        .replaceAll(/\//g, "~1")
        .replaceAll(/\|/g, "~2");
}

export function decodePathSegment(segment: string): string {
    return segment
        .replaceAll("~2", "|")
        .replaceAll("~1", "/")
        .replaceAll("~0", "~");
}
