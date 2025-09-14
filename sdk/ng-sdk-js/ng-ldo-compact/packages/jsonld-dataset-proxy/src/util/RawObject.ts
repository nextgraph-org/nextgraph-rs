import type { BlankNode, NamedNode } from "@rdfjs/types";
import { _getUnderlyingNode } from "../types.js";
import type { LdSet } from "../setProxy/ldSet/LdSet.js";
import type { SubjectProxy } from "../subjectProxy/SubjectProxy.js";

export type RawObject =
  | ({
      "@id"?: string | NamedNode | BlankNode;
    } & {
      [key: string | symbol | number]: RawValue | LdSet<RawValue>;
    })
  | SubjectProxy;

export type RawValue =
  | string
  | boolean
  | number
  | RawObject
  | NamedNode
  | BlankNode
  | undefined;
