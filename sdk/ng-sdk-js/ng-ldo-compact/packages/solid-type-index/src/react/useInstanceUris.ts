import { useTypeIndexProfile } from "./useTypeIndexProfile.js";
import { useEffect, useMemo, useState } from "react";
import { useSubscribeToUris } from "./util/useSubscribeToUris.js";
import { useLdo, useMatchSubject } from "@ldo/solid-react";
import { TypeRegistrationShapeType } from "../.ldo/typeIndex.shapeTypes.js";
import { RDF_TYPE, TYPE_REGISTRATION } from "../constants.js";
import {
  getInstanceUris,
  getTypeIndexesUrisFromProfile,
} from "../getTypeIndex.js";
import type { SolidLeafUri } from "@ldo/connected-solid";

/**
 * Provides the LeafUris of everything in a type node for a specific class uri
 *
 * @param classUri - the class uri
 * @returns - URIs of all resources registered with this node
 */
export function useInstanceUris(classUri: string): SolidLeafUri[] {
  const { dataset } = useLdo();
  const profile = useTypeIndexProfile();

  const typeIndexUris: string[] = useMemo(
    () => (profile ? getTypeIndexesUrisFromProfile(profile) : []),
    [profile],
  );

  useSubscribeToUris(typeIndexUris);

  const [leafUris, setLeafUris] = useState<SolidLeafUri[]>([]);

  const typeRegistrations = useMatchSubject(
    TypeRegistrationShapeType,
    RDF_TYPE,
    TYPE_REGISTRATION,
  );

  useEffect(() => {
    getInstanceUris(classUri, typeRegistrations.toArray(), {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: come back and see if we can fix this
      solidLdoDataset: dataset,
    }).then(setLeafUris);
  }, [typeRegistrations]);

  return leafUris;
}
