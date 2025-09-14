import type { ContextDefinition } from "jsonld";

export interface DocumentShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: {
    "@id": "Document";
  };
  vocabulary?: VocabularyShape[];
  law: LawShape;
}

export interface LawShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: {
    "@id": "Law";
  };
  name?: string[];
  path: {
    "@id": string;
  };
}

export interface VocabularyShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  type: {
    "@id": "Vocabulary";
  };
  name: string;
  path?: {
    "@id": string;
  }[];
}
