import type { LdoJsonldContext } from "@ldo/jsonld-dataset-proxy";
import { activityPub } from "./activityPub.js";
import { circular } from "./circular.js";
import { profile } from "./profile.js";
import { reducedProfile } from "./reducedProfile.js";
import { simple } from "./simple.js";
import { extendsSimple } from "./extendsSimple.js";
import { reusedPredicates } from "./reusedPredicates.js";
import { oldExtends } from "./oldExtends.js";
import { orSimple } from "./orSimple.js";
import { andSimple } from "./andSimple.js";
import { eachOfAndSimple } from "./eachOfAndSimple.js";
import { multipleSharedPredicates } from "./multipleSharedPredicates.js";
import { pluralObjects } from "./pluralObjects.js";
import { pluralAnonymous } from "./pluralAnonymous.js";
import { singleAnonymous } from "./singleAnonymous.js";
import { mixedPluralUnionError } from "./mixedPluralUnionError.js";
import { pluralUnionObjects } from "./pluralUnionObjects.js";
import { propertyCollision } from "./propertyCollision.js";

export interface TestData {
  name: string;
  shexc: string;
  sampleTurtle: string;
  baseNode: string;
  successfulContext: LdoJsonldContext;
  successfulTypings: string;
  successfulCompactTypings?: string;
}

export const testData: TestData[] = [
  simple,
  circular,
  profile,
  reducedProfile,
  activityPub,
  extendsSimple,
  oldExtends,
  reusedPredicates,
  orSimple,
  andSimple,
  eachOfAndSimple,
  multipleSharedPredicates,
  pluralObjects,
  pluralAnonymous,
  singleAnonymous,
  mixedPluralUnionError,
  pluralUnionObjects,
  propertyCollision,
];
