export interface NextGraphSession {
  ng?: {
    sparql_query: (sessionId: string, sparql: string , base?: string | null, nuri?: string | null) => Promise<SparqlQueryResult>,
    update_header: (sessionId: string, nuri: string, title?: string | null, about?: string | null) => Promise<unknown>,
    sparql_update: (sessionId: string, sparql: string, storeId?: string) => Promise<string[] | { isError: boolean; message: string }>
    doc_create: (session_id: string, crdt: string, class_name: string, destination: string, store_repo?: any) => Promise<string>,
  } | undefined;
  privateStoreId?: string;
  protectedStoreId?: string
  sessionId?: string;
  publicStoreId?: string;
  [key: string]: unknown;
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