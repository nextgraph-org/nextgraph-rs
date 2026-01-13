import {NextGraphSession} from "@/types/nextgraph.ts";
import {contactService} from "@/services/contactService.ts";
import {getContactGraph} from "@/utils/socialContact/contactUtilsOrm.ts";
import {getShortId} from "@/utils/orm/ormUtils.ts";

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

    const data = await session.ng!.sparql_query(session.sessionId!, sparql);
    const duplicatesList: string[][] = data.results?.bindings?.map(binding =>
      binding.duplicateContacts.value.split(",").map(contactId => getContactGraph("did:ng:o:" + contactId, session))) ?? [];

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

  async markContactsAsMerged(session: NextGraphSession, contactIds: string[], mergedIntoId: string): Promise<void> {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    if (contactIds.length === 0) {
      return;
    }

    for (const contactId of contactIds) {
      const sparql = `
        ${contactService.prefixes}
        INSERT DATA {
          <${getShortId(contactId)}> ngcontact:mergedInto <${mergedIntoId}> .
        }
      `;

      await session.ng.sparql_update(session.sessionId!, sparql, contactId);
    }
  }
}

export const mergeContactService = MergeContactService.getInstance();