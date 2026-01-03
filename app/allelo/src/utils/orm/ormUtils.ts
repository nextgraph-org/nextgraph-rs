type SetKeys<T> = {
  [P in keyof T]-?: NonNullable<T[P]> extends Set<any> ? P : never
}[keyof T];

function mergeSetProperty<T, K extends SetKeys<T>>(
  propertyKey: K,
  obj: T,
  updateData: Partial<T>,
) {
  obj[propertyKey] ??= new Set<K>() as T[K];
  const target = obj[propertyKey] ?? new Set();
  const src = updateData[propertyKey];
  if (!(target instanceof Set) || !(src instanceof Set)) return;
  for (const el of src) target.add(el);
}

export function persistProperty<T, K extends keyof T>(
  propertyKey: K,
  obj: T,
  updateData: Partial<T>,
  isSetProperty?: boolean
) {

  if (isSetProperty) {
    mergeSetProperty(
      propertyKey as unknown as SetKeys<T>,
      obj,
      updateData
    );
  } else {
    const importValue = updateData[propertyKey];

    if (importValue == undefined) return;
    obj[propertyKey] = importValue;
  }
}

export function getShortId(graph: string) {
  return graph.substring(0, 53);
}