import {NextGraphSession} from "@/types/nextgraph.ts";

class RCardService {
  private static instance: RCardService;

  private constructor() {
  }

  public static getInstance(): RCardService {
    if (!RCardService.instance) {
      RCardService.instance = new RCardService();
    }
    return RCardService.instance;
  }

  async getRCardId(session?: NextGraphSession, cardId = "default"): Promise<string | undefined> {
    if (!session) return;
    const sparql = `PREFIX ngrcard: <did:ng:x:social:rcard#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?rcardUri ?order
WHERE {
  ?rcardUri a ngrcard:Card .
  OPTIONAL { ?rcardUri ngrcard:cardId ?cardId . }
  FILTER (?cardId = "${cardId}")
}
`;
    const sparqlResult = await session.ng!.sparql_query(session.sessionId!, sparql);
    return (sparqlResult?.results?.bindings ?? [])[0]?.rcardUri?.value;
  }

  async getRCardsIDs(session?: NextGraphSession): Promise<string[]> {
    if (!session) return [];
    const sparql = `PREFIX ngrcard: <did:ng:x:social:rcard#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?rcardUri
WHERE {
  ?rcardUri a ngrcard:Card .
  OPTIONAL { ?rcardUri ngrcard:order ?order . }
}
ORDER BY ASC(?order) ASC(?rcardUri)
`;
    const sparqlResult = await session.ng!.sparql_query(session.sessionId!, sparql);
    return sparqlResult?.results?.bindings?.map(
      (binding) => binding.rcardUri.value
    ) ?? [];
  }
}

export const rCardService = RCardService.getInstance();