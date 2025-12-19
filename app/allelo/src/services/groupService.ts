import {NextGraphSession} from "@/types/nextgraph";

interface SortParams {
  sortBy: string;
  sortDirection: "asc" | "desc";
}

class GroupService {
  private static instance: GroupService;

  private constructor() {
  }

  public static getInstance(): GroupService {
    if (!GroupService.instance) {
      GroupService.instance = new GroupService();
    }
    return GroupService.instance;
  }

  groupPrefixes = `
      PREFIX nggroup:  <did:ng:x:social:group#>
      PREFIX ngpost:   <did:ng:x:social:post#>
      PREFIX xsd:      <http://www.w3.org/2001/XMLSchema#>
  `;

  async getGroupIDs(
    session: NextGraphSession,
    limit?: number,
    offset?: number,
    base?: string,
    nuri?: string,
    orderBy?: SortParams[],
    filterParams?: Map<string, string>
  ) {
    const sparql = this.getAllGroupIdsQuery("nggroup:Group", limit, offset, orderBy, filterParams);
    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  async getGroupsCount(session: NextGraphSession, filterParams?: Map<string, string>) {
    const sparql = this.getCountQuery("nggroup:Group", filterParams);
    return await session.ng!.sparql_query(session.sessionId, sparql);
  }

  getAllGroupIdsQuery(
    type: string,
    limit?: number,
    offset?: number,
    sortParams?: SortParams[],
    filterParams?: Map<string, string>
  ) {
    const orderByData: string[] = [];
    const optionalJoinData: string[] = [];

    const filter = this.getFilter(filterParams);

    if (sortParams) {
      for (const sortParam of sortParams) {
        const sortDirection = sortParam.sortDirection.toUpperCase();
        const sortBy = sortParam.sortBy ?? "title";

        if (sortDirection === "ASC") {
          orderByData.push(`${sortDirection}(COALESCE(?${sortBy}, "zzzzz"))`);
        } else {
          orderByData.push(`${sortDirection}(?${sortBy})`);
        }

        optionalJoinData.push(`OPTIONAL {
          ?groupUri nggroup:${sortBy} ?${sortBy} .
        }`);
      }
    }

    const orderBy = orderByData.length > 0 ? ` ORDER BY ${orderByData.join(", ")}` : "";
    const optionalJoin = optionalJoinData.join(" ");

    return `
      ${this.groupPrefixes}

      SELECT DISTINCT ?groupUri
      WHERE {
        ?groupUri a ${type} .
        ${optionalJoin}
        ${filter}
      }
      ${orderBy}
      ${limit ? 'LIMIT ' + limit : ''}
      ${offset ? 'OFFSET ' + offset : ''}
    `;
  }

  getCountQuery(type: string, filterParams?: Map<string, string>) {
    const filter = this.getFilter(filterParams);

    return `
      ${this.groupPrefixes}

      SELECT (COUNT(DISTINCT(?groupUri)) AS ?totalCount)
      WHERE {
        ?groupUri a ${type} .
        ${filter}
      }
    `;
  }

  getFtsFilterData(value: string) {
    value = value.toLowerCase();
    // Escape special characters to prevent SPARQL injection
    value = value.replace(/[\\"]/g, '\\$&');

    const ftsFields: string[] = ["title", "description"];
    const filterData: string[] = [];
    const joinData: string[] = [];

    ftsFields.forEach(field => {
      joinData.push(`OPTIONAL {
        ?groupUri nggroup:${field} ?${field} .
      }`);
      filterData.push(`(BOUND(?${field}) && CONTAINS(LCASE(?${field}), "${value}"))`);
    });

    joinData.push(`FILTER (
      ${filterData.join(" || ")}
    )`);

    return joinData;
  }

  getFilterData(key: string, value: string): string[] {
    switch (key) {
      case "fts":
        return this.getFtsFilterData(value);
      case "hasMember":
        return [
          `?groupUri nggroup:hasMember ?member .`,
          `FILTER (?member = <${value}>)`
        ];
      case "hasAdmin":
        return [
          `?groupUri nggroup:hasAdmin ?admin .`,
          `FILTER (?admin = <${value}>)`
        ];
      default:
        return [];
    }
  }

  getFilter(filterParams?: Map<string, string>) {
    filterParams ??= new Map();
    const filterData: string[] = [];

    for (const [key, value] of filterParams) {
      filterData.push(...this.getFilterData(key, value));
    }

    return filterData.join("\n");
  }

}

export const groupService = GroupService.getInstance();