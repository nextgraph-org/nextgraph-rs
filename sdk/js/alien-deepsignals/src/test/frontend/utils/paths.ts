export type PathSegment = string | number;

const toSegment = (segment: string): PathSegment =>
  segment.match(/^\d+$/) ? Number(segment) : segment;

export function getByPath<T = any>(source: any, path: string): T | undefined {
  const segments = path.split(".").filter(Boolean).map(toSegment);
  return segments.reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    return acc[key as keyof typeof acc];
  }, source);
}

export function setByPath(source: any, path: string, value: any): boolean {
  const segments = path.split(".").filter(Boolean).map(toSegment);
  if (!segments.length) return false;
  const lastKey = segments.pop()!;
  const parent = segments.reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    return acc[key as keyof typeof acc];
  }, source);
  if (parent == null) return false;
  parent[lastKey as keyof typeof parent] = value;
  return true;
}
