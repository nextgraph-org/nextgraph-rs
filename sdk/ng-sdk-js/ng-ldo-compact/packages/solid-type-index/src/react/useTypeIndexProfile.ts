import { useResource, useSolidAuth, useSubject } from "@ldo/solid-react";
import type { TypeIndexProfile } from "../.ldo/profile.typings.js";
import { TypeIndexProfileShapeType } from "../.ldo/profile.shapeTypes.js";

export function useTypeIndexProfile(): TypeIndexProfile | undefined {
  const { session } = useSolidAuth();
  useResource(session.webId, { subscribe: true });
  const profile = useSubject(TypeIndexProfileShapeType, session.webId);
  return profile;
}
