import {NextGraphSession, CreateDataFunction, CommitDataFunction, ChangeDataFunction} from "@/types/nextgraph";
import {dataset} from "@/lib/nextgraph";
import {SocialGroupShapeType} from "@/.ldo/group.shapeTypes";
import {SocialGroup} from "@/.ldo/group.typings";
import {NextGraphResource} from "@ldo/connected-nextgraph";

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

  async createGroup(
    session: NextGraphSession,
    group: Partial<SocialGroup>,
    createData: CreateDataFunction,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ): Promise<string | undefined> {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const protectedStoreId = "did:ng:" + session.protectedStoreId;
    const resource = await dataset.createResource("nextgraph", {storeRepo: protectedStoreId});

    if (resource.isError) {
      throw new Error(`Failed to create resource`);
    }

    const groupObj = createData(
      SocialGroupShapeType,
      resource.uri.substring(0, 53),
      resource
    );

    //@ts-expect-error bug: ldo works only with a single type
    groupObj.type = {"@id": "Group"};

    if (group.title) {
      groupObj.title = group.title;
    }

    await commitData(groupObj);

    await this.persistSocialGroup(session, group, commitData, changeData, resource, groupObj);

    const groupTitle = group.title || 'Untitled Group';
    await session!.ng!.update_header(session.sessionId, resource.uri.substring(0, 53), groupTitle);

    return resource.uri;
  }

  private async persistSocialGroup(
    session: NextGraphSession,
    groupToImport: Partial<SocialGroup>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
    resource: NextGraphResource,
    subject: SocialGroup
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const changedGroup = changeData(subject, resource);

    for (const propertyKey in groupToImport) {
      if (["@id", "@context", "type"].includes(propertyKey)) {
        continue;
      }

      const importValue = groupToImport[propertyKey as keyof SocialGroup];
      if (importValue !== undefined) {
        //@ts-expect-error dynamic property assignment
        changedGroup[propertyKey] = importValue;
      }
    }

    const result = await commitData(changedGroup);
    if (result.isError) {
      throw new Error(`Failed to commit: ${result.message}`);
    }
  }

  async updateGroup(
    session: NextGraphSession | undefined,
    group: SocialGroup,
    changes: Partial<SocialGroup>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const resource = dataset.getResource(group["@id"]!);
    if (resource.isError || resource.type === "InvalidIdentifierResouce") {
      throw new Error(`Failed to get resource`);
    }

    const groupObj = changeData(group, resource);

    await this.persistSocialGroup(session, changes, commitData, changeData, resource, groupObj);

    // Update header if title changed
    if (changes.title) {
      await session!.ng!.update_header(session.sessionId, group["@id"]!.substring(0, 53), changes.title);
    }
  }

  async addMembers(
    session: NextGraphSession | undefined,
    group: SocialGroup,
    memberIds: string[],
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const resource = dataset.getResource(group["@id"]!);
    if (resource.isError || resource.type === "InvalidIdentifierResouce") {
      throw new Error(`Failed to get resource`);
    }

    const groupObj = changeData(group, resource);

    // Add new members to existing members
    memberIds.forEach(memberId => {
      groupObj.hasMember?.add({"@id": memberId});
    });

    const result = await commitData(groupObj);
    if (result.isError) {
      throw new Error(`Failed to commit: ${result.message}`);
    }
  }
}

export const groupService = GroupService.getInstance();