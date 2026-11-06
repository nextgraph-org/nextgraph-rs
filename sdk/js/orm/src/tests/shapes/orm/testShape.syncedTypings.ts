import type { IRI, Nuri, Unsynced, OrmSet } from "@ng-org/orm";
export type { IRI, Nuri, Unsynced, OrmSet } from "@ng-org/orm";

/**
 * =============================================================================
 * Typescript Typings for testShape
 * =============================================================================
 */

/**
 * Root Type
 */
export interface Root {
  /**
   * The graph NURI.
   */
  readonly "@graph": Nuri;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * A root type
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:z:Root";
  /**
   * A string root
   *
   * Original IRI: did:ng:z:aString
   */
  aString: string;
  /**
   * An integer root
   *
   * Original IRI: did:ng:z:anInteger
   */
  anInteger: number;
  /**
   * A date root
   *
   * Original IRI: did:ng:z:aDate
   */
  aDate: string;
  /**
   * A bool root
   *
   * Original IRI: did:ng:z:aBoolean
   */
  aBoolean: boolean;
  /**
   * A string or bool root
   *
   * Original IRI: did:ng:z:aStringOrBoolean
   */
  aStringOrBoolean: boolean | string;
  /**
   * Children of type Child1 or Child1
   *
   * Original IRI: did:ng:z:children1Or2
   */
  get children1Or2(): OrmSet<ChildShape1 | ChildShape2> | undefined;
  /**
   * Children of type Child1 or Child1
   *
   * Original IRI: did:ng:z:children1Or2
   */
  set children1Or2(
    value: Set<ChildShape1 | ChildShape2 | Unsynced<ChildShape1 | ChildShape2>>,
  );
  /**
   * Child3 object
   *
   * Original IRI: did:ng:z:child3
   */
  get child3(): ChildShape3;
  /**
   * Child3 object
   *
   * Original IRI: did:ng:z:child3
   */
  set child3(value: ChildShape3 | Unsynced<ChildShape3>);
}

/**
 * ChildShape1 Type
 */
export interface ChildShape1 {
  /**
   * The graph NURI.
   */
  readonly "@graph": Nuri;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Shape1 type, extra
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  get "@type"(): OrmSet<"did:ng:z:MiruVideoEffectAsset" | (IRI & {})>;
  /**
   * Shape1 type, extra
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  set "@type"(value: Set<"did:ng:z:MiruVideoEffectAsset" | (IRI & {})>);
  /**
   * Child string
   *
   * Original IRI: did:ng:z:childString
   */
  childString: string;
  /**
   * Child string
   *
   * Original IRI: did:ng:z:childBoolean
   */
  childBoolean: boolean;
}

/**
 * ChildShape2 Type
 */
export interface ChildShape2 {
  /**
   * The graph NURI.
   */
  readonly "@graph": Nuri;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  get "@type"(): OrmSet<"did:ng:z:Child" | "did:ng:z:Child2" | (IRI & {})>;
  /**
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  set "@type"(value: Set<"did:ng:z:Child" | "did:ng:z:Child2" | (IRI & {})>);
  /**
   * Child string
   *
   * Original IRI: did:ng:z:childString
   */
  childString: string;
  /**
   * Child number
   *
   * Original IRI: did:ng:z:childNumber:
   */
  childNumber: number;
  /**
   * Child child object
   *
   * Original IRI: did:ng:z:childChild
   */
  get childChild(): ChildChild;
  /**
   * Child child object
   *
   * Original IRI: did:ng:z:childChild
   */
  set childChild(value: ChildChild | Unsynced<ChildChild>);
}

/**
 * ChildShape3 Type
 */
export interface ChildShape3 {
  /**
   * The graph NURI.
   */
  readonly "@graph": Nuri;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Child3 types
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  "@type": "did:ng:z:Child2" | "did:ng:z:Child";
  /**
   * Child boolean
   *
   * Original IRI: did:ng:z:childBoolean:
   */
  childBoolean: boolean;
  /**
   * Child child object
   *
   * Original IRI: did:ng:z:childChild
   */
  get childChild(): ChildChild;
  /**
   * Child child object
   *
   * Original IRI: did:ng:z:childChild
   */
  set childChild(value: ChildChild | Unsynced<ChildChild>);
}

/**
 * ChildChild Type
 */
export interface ChildChild {
  /**
   * The graph NURI.
   */
  readonly "@graph": Nuri;
  /**
   * The subject IRI.
   */
  readonly "@id": IRI;
  /**
   * Child child type
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  get "@type"(): OrmSet<"did:ng:z:ChildChild" | (IRI & {})>;
  /**
   * Child child type
   *
   * Original IRI: http://www.w3.org/1999/02/22-rdf-syntax-ns#type
   */
  set "@type"(value: Set<"did:ng:z:ChildChild" | (IRI & {})>);
  /**
   * Child child decimal
   *
   * Original IRI: did:ng:z:childChildNum
   */
  childChildNum: number;
}
