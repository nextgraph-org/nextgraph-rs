export interface NextGraphSession {
  ng?: {
    sparql_query: (sessionId: string, sparql: string , base?: string | null, nuri?: string | null) => Promise<SparqlQueryResult>,
    update_header: (sessionId: string, nuri: string, title?: string | null, about?: string | null) => Promise<unknown>,
    sparql_update: (sessionId: string, sparql: string, storeId: string) => Promise<string[] | { isError: boolean; message: string }>
  };
  privateStoreId?: string;
  protectedStoreId?: string
  [key: string]: unknown;
  sessionId: string;
}

type SparqlQueryResult = {
  head?: {
    vars?: string[];
  };
  results?: {
    bindings?: Record<string, {
      type: string;
      value: string;
    }>[];
  };
}

export interface NextGraphAuth {
  session?: NextGraphSession;
  login?: () => void;
  logout?: () => void;
  [key: string]: unknown;
}

export type CreateDataFunction = <Type extends import("@ldo/ldo").LdoBase>(
  shapeType: import("@ldo/ldo").ShapeType<Type>,
  subject: string | import("@ldo/rdf-utils").SubjectNode,
  resource: import("@ldo/connected-nextgraph").NextGraphResource
) => Type;

export type ChangeDataFunction = <Type extends import("@ldo/ldo").LdoBase>(
  input: Type,
  resource: import("@ldo/connected-nextgraph").NextGraphResource,
  ...additionalResources: import("@ldo/connected-nextgraph").NextGraphResource[]
) => Type;

export type CommitDataFunction = (input: import("@ldo/ldo").LdoBase) => ReturnType<import("@ldo/connected").ConnectedLdoTransactionDataset<import("@ldo/connected-nextgraph").NextGraphConnectedPlugin[]>["commitToRemote"]>;
