import {NextGraphSession} from "@/types/nextgraph.ts";
import {contactService} from "@/services/contactService.ts";

class MergeContactService {
  private static instance: MergeContactService;

  private constructor() {
  }

  public static getInstance(): MergeContactService {
    if (!MergeContactService.instance) {
      MergeContactService.instance = new MergeContactService();
    }
    return MergeContactService.instance;
  }

  private mergeGroups(groupsList: string[][]): string[][] {
    const processed: string[][] = [];
    for (const groups of groupsList) {
      const overlappingIndices: number[] = [];

      for (let i = 0; i < processed.length; i++) {
        if (groups.some(item => processed[i].includes(item))) {
          overlappingIndices.push(i);
        }
      }

      if (overlappingIndices.length === 0) {
        processed.push([...groups]);
      } else {
        const merged = [...groups];

        for (let i = overlappingIndices.length - 1; i >= 0; i--) {
          const index = overlappingIndices[i];
          merged.push(...processed[index]);
          processed.splice(index, 1);
        }

        processed.push([...new Set(merged)]);
      }
    }

    return processed;
  }

  async getDuplicatedContacts(session?: NextGraphSession): Promise<string[][]> {
    if (!session) return [];
    const sparql = this.getDuplicatedContactsSparql();

    const data = await session.ng!.sparql_query(session.sessionId, sparql);
    // @ts-expect-error TODO output format of ng sparql query
    const duplicatesList: string[][] = data.results.bindings.map(binding =>
      binding.duplicateContacts.value.split(",").map(contactId => "did:ng:o:" + contactId));

    return this.mergeGroups(duplicatesList);
  }

  getDuplicatedContactsSparql(): string {
    const params = ["email", "phoneNumber", "account"];
    const filter = contactService.getFilter();

    const subQueries = params.map(param => {
      let getQuery = `
        ?contactUri ngcontact:${param} ?${param}Obj .
        ?${param}Obj ngcore:value ?duplicateValue .
      `
      if (param === "account") {
        getQuery = getQuery.replace("duplicate", "account");
        getQuery += `
          ?accountObj ngcontact:protocol ?protocol .
          BIND(CONCAT(?accountValue, " (", ?protocol, ")") AS ?duplicateValue)
        `;
      }

      return `{
        ${getQuery}
        ${filter}
        {
          SELECT ?duplicateValue WHERE {
            ${getQuery}
            ${filter}
          }
          GROUP BY ?duplicateValue
          HAVING(COUNT(DISTINCT ?contactUri) > 1)
        }
      }`
    });

    return `
      ${contactService.prefixes}
      SELECT DISTINCT ?duplicateContacts
      WHERE {
        SELECT ?duplicateValue (GROUP_CONCAT(?shortContact; separator=",") AS ?duplicateContacts)
        WHERE {
          SELECT ?duplicateValue ?contactUri (REPLACE(STR(?contactUri), ".*:", "") AS ?shortContact)
          WHERE {
            ${subQueries.join(" UNION ")}
          }
          ORDER BY ?shortContact
        }
        GROUP BY ?duplicateValue
      }
      GROUP BY ?duplicateContacts
    `;
  }
}

export const mergeContactService = MergeContactService.getInstance();