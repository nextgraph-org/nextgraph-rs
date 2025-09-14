import type { ContextDefinition, ExpandedTermDefinition } from "jsonld";

export interface LdoJsonldContext extends ContextDefinition {
  [key: string]:
    | null
    | string
    | LdoJsonldContextExpandedTermDefinition
    | LdoJsonldContext[keyof LdoJsonldContext];
}

export type LdoJsonldContextExpandedTermDefinition = ExpandedTermDefinition & {
  "@context"?: LdoJsonldContext | undefined;
  "@isCollection"?: boolean | undefined;
};
