import {SocialContactShapeType} from "@/.ldo/contact.shapeTypes";
import {NextGraphSession, CreateDataFunction, CommitDataFunction, ChangeDataFunction} from "@/types/nextgraph";
import {Contact, SortParams} from "@/types/contact";
import {dataset} from "@/lib/nextgraph";
import {SocialContact} from "@/.ldo/contact.typings";
import {LdSet} from "@ldo/ldo";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {ContactLdSetProperties, contactLdSetProperties, resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {AppSettings} from "@/.ldo/settings.typings.ts";
import {AppSettingsShapeType} from "@/.ldo/settings.shapeTypes.ts";

export function ldoToJson(obj: any): any {//TODO can go to infinite loop, if obj has subobj that has obj as subobj
  if (obj?.toArray) {
    obj = obj.toArray();
  }
  if (Array.isArray(obj)) {
    return obj.map(item => ldoToJson(item));
  }
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, ldoToJson(v)])
    );
  }
  return obj;
}

// @ts-expect-error expects error
window.ldoToJson = ldoToJson;

function mergeGroups(groupsList: string[][]): string[][] {
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

class NextgraphDataService {
  private static instance: NextgraphDataService;

  private constructor() {
  }

  public static getInstance(): NextgraphDataService {
    if (!NextgraphDataService.instance) {
      NextgraphDataService.instance = new NextgraphDataService();
    }
    return NextgraphDataService.instance;
  }

  async getContactIDs(session: NextGraphSession, limit?: number, offset?: number, base?: string, nuri?: string,
                      orderBy?: SortParams[], filterParams?: Map<string, string>) {
    const sparql = this.getAllContactIdsQuery(session, "vcard:Individual", limit, offset, orderBy, filterParams);

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  async getContactsCount(session: NextGraphSession, filterParams?: Map<string, string>) {
    const sparql = this.getCountQuery("vcard:Individual", session,  filterParams);

    return await session.ng!.sparql_query(session.sessionId, sparql);
  };

  getAllContactIdsQuery(session: NextGraphSession, type: string, limit?: number, offset?: number, sortParams?: SortParams[], filterParams?: Map<string, string>) {
    const orderByData: string[] = [];
    const optionalJoinData: string[] = [];

    const filter = this.getFilter(filterParams, session);

    if (sortParams) {
      for (const sortParam of sortParams) {
        const sortDirection = (sortParam["sortDirection"] as string).toUpperCase();
        const sortBy = sortParam["sortBy"];
        if (sortDirection === "ASC") {
          orderByData.push(`${sortDirection}(COALESCE(?${sortBy}, "zzzzz"))`);
        } else {
          orderByData.push(`${sortDirection}(?${sortBy})`);
        }

        optionalJoinData.push(`OPTIONAL {
          ?contactUri ngcontact:${sortBy} ?${sortBy}Node .
          ?${sortBy}Node ngcore:value ?${sortBy} .
        }`);
      }
    }

    const orderBy = ` ORDER BY ${orderByData.join(", ")}`;
    const optionalJoin = optionalJoinData.join(" ");

    return `
      ${this.contactPrefixes}
      
      SELECT DISTINCT ?contactUri
      WHERE {
        ?contactUri a ${type} .
        ${optionalJoin}
        ${filter}
      }
      ${orderBy}
      ${limit ? 'LIMIT ' + limit : ''}
      ${offset ? 'OFFSET ' + offset : ''}
`;
  };

  async getContactAllProperties(session: NextGraphSession, nuri: string) {
    const sparql = `
      ${this.contactPrefixes}

      SELECT ?mainProperty ?subProperty ?value
      WHERE {
        <${nuri}> ?mainPropertyUri ?node .
        ?node ?subPropertyUri ?value .
        BIND(REPLACE(STR(?mainPropertyUri), ".*[#/]", "") AS ?mainProperty)
        BIND(REPLACE(STR(?subPropertyUri), ".*[#/]", "") AS ?subProperty)
        
        FILTER(?subPropertyUri != "rdf:type")
  }`

    return await session.ng!.sparql_query(session.sessionId, sparql);
  }

  contactPrefixes = `
    PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
    PREFIX ngcontact: <did:ng:x:contact#>
    PREFIX ngcore: <did:ng:x:core#>
  `;

  getCountQuery(type: string, session: NextGraphSession, filterParams?: Map<string, string>) {
    const filter = this.getFilter(filterParams, session);

    return `
      ${this.contactPrefixes}

SELECT (COUNT(DISTINCT(?contactUri)) AS ?totalCount)
WHERE {
  ?contactUri a ${type} .
  ${filter}
}
`;
  }

  getFtsFilterData(value: string) {
    value = value.toLowerCase();
    // Escape special characters to prevent SPARQL injection
    value = value.replace(/[\\"]/g, '\\$&');
    const ftsFields: string[] = [
      "name",
      "email",
      "organization",
      "position",
      "region",
      "country"
    ];
    const filterData: string[] = [];
    const joinData: string[] = [`OPTIONAL {
      ?contactUri ngcontact:address ?addressNode .
    }`];
    ftsFields.forEach(field => {
      switch (field) {
        case "position":
          joinData.push(`OPTIONAL {
            ?organizationNode ngcontact:${field} ?${field} .
          }`);
          break;
        case "region":
        case "country":
          joinData.push(`OPTIONAL {
            ?addressNode ngcontact:${field} ?${field} .
          }`);
          break;
        default:
          joinData.push(`OPTIONAL {
            ?contactUri ngcontact:${field} ?${field}Node .
            ?${field}Node ngcore:value ?${field} .
          }`);
      }
      filterData.push(`(BOUND(?${field}) && CONTAINS(LCASE(?${field}), "${value}"))`)
    });
    joinData.push(`FILTER (
      ${filterData.join(" || ")}
    )`);
    return joinData;
  }

  getFilter(filterParams?: Map<string, string>, session?: NextGraphSession) {
    filterParams ??= new Map();
    const filterData = [
      `FILTER NOT EXISTS { ?contactUri ngcontact:mergedInto ?mergedIntoNode }`
    ];
    for (const [key, value] of filterParams) {
      if (key === "fts") {
        filterData.push(...this.getFtsFilterData(value));
      } else {
        filterData.push(`
          ?contactUri ngcontact:${key} ?${key}Node .
          ?${key}Node ngcontact:protocol ?${key} .
        `);//TODO make generic for other properties
        filterData.push(`FILTER (?${key} = "${value}")`);
      }
    }

    if (session && session.protectedStoreId) {
      filterData.push(`FILTER (?contactUri != <did:ng:${session.protectedStoreId.substring(0, 46)}>)`)
    }

    return filterData.join("\n");
  }

  async isProfileCreated(session: NextGraphSession, base?: string, nuri?: string) {
    base ??= "did:ng:" + session.protectedStoreId?.substring(0, 46);
    nuri ??="did:ng:" + session.protectedStoreId;
    const sparql = `
      PREFIX ngc: <did:ng:x:contact:class#>
      ASK { <> a ngc:Me . }`;

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  private async commitProperty<T extends import("@ldo/ldo").LdoBase>(
    contactObj: T,
    commitData: CommitDataFunction
  ) {
    const result = await commitData(contactObj);
    if (result.isError) {
      throw new Error(`Failed to commit: ${result.message}`);
    }
  }

  async createContact(
    session: NextGraphSession,
    contact: Contact,
    createData: CreateDataFunction,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ): Promise<string | undefined> {
    const resource = await dataset.createResource("nextgraph", {primaryClass: "social:contact"});
    if (resource.isError) {
      throw new Error(`Failed to create resource`);
    }

    const contactObj = createData(
      SocialContactShapeType,
      resource.uri.substring(0, 53),
      resource
    );

    //@ts-expect-error bug: ldo works only with a single type
    contactObj.type = {"@id": "Individual"};

    await commitData(contactObj);

    await this.persistSocialContact(session, contact, commitData, changeData, resource, contactObj);

    const contactName = resolveFrom(contact, "name")?.value || 'Unknown Contact';
    await session!.ng!.update_header(session.sessionId, resource.uri.substring(0, 53), contactName);
    return resource.uri;
  }

  async updateProfile(
    session: NextGraphSession | undefined,
    contact: Partial<SocialContact>,
    changeData: ChangeDataFunction,
    commitData: CommitDataFunction
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const protectedStoreId = "did:ng:" + session.protectedStoreId;
    const resource = dataset.getResource(protectedStoreId, "nextgraph");

    if (resource.isError || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to get resource ${protectedStoreId}`);
    }
    const base = "did:ng:" + session.protectedStoreId?.substring(0, 46);
    const isProfileCreated = await nextgraphDataService.isProfileCreated(session, base, protectedStoreId);
    if (!isProfileCreated) {
     await this.createProfile(session, protectedStoreId);
    }
    const subject = dataset.usingType(SocialContactShapeType).fromSubject(base);
    await this.persistSocialContact(session, contact, commitData, changeData, resource, subject);
  }

  async createProfile(session: NextGraphSession, protectedStoreId?: string) {
    protectedStoreId ??= "did:ng:" + session.protectedStoreId;
    const sparql = `
        PREFIX ngc: <did:ng:x:contact:class#>
        PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
        INSERT DATA {
            <> a vcard:Individual . 
            <> a ngc:Me . }`;
    const res = await session.ng!.sparql_update(session.sessionId, sparql, protectedStoreId);
    if (!Array.isArray(res)) {
      throw new Error(`Failed to create profile on ${protectedStoreId}`);
    }
  }

  async createSettings(session: NextGraphSession, privateStoreId?: string) {
    if (!session || !session.sessionId) {
      return ;
    }

    privateStoreId ??= "did:ng:" + session.privateStoreId;
    const sparql = `
        PREFIX ngset: <did:ng:x:settings#>
        INSERT DATA {
            <> a ngset:Settings . }`;
    const res = await session.ng!.sparql_update(session.sessionId, sparql, privateStoreId);
    if (!Array.isArray(res)) {
      throw new Error(`Failed to create settings on ${privateStoreId}`);
    }
  }

  async isSettingsCreated(session?: NextGraphSession, base?: string, nuri?: string) {
    if (!session || !session.sessionId) {
      return ;
    }
    base ??= "did:ng:" + session.privateStoreId?.substring(0, 46);
    nuri ??="did:ng:" + session.privateStoreId;
    const sparql = `
      PREFIX ngset: <did:ng:x:settings#>
      ASK { <> a ngset:Settings . }`;

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  async updateSettings(
    session: NextGraphSession | undefined,
    settings: Partial<AppSettings>,
    changeData: ChangeDataFunction,
    commitData: CommitDataFunction
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    const privateStoreId = "did:ng:" + session.privateStoreId;
    const resource = dataset.getResource(privateStoreId, "nextgraph");

    if (resource.isError || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to get resource ${privateStoreId}`);
    }

    const base = "did:ng:" + session.privateStoreId?.substring(0, 46);
    const subject = dataset.usingType(AppSettingsShapeType).fromSubject(base);
    const settingsObj = changeData(subject, resource);
    Object.entries(settings).forEach(([key, value]) => {
      //@ts-expect-error it's ok
      settingsObj[key] = value;
    });

    const result = await commitData(settingsObj);
    if (result.isError) {
      throw new Error(`Failed to commit: ${result.message}`);
    }
  }

  private async persistProperty<K extends keyof SocialContact>(
    contactToImport: Partial<SocialContact>,
    propertyKey: K,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
    resource: NextGraphResource,
    subject: SocialContact
  ) {
    const importValue = contactToImport[propertyKey];

    if (importValue != undefined) { //just in case
      const newContactObj = changeData(subject, resource);

      if (contactLdSetProperties.includes(propertyKey as keyof ContactLdSetProperties)) {
        const newTargetProperty = newContactObj[propertyKey as keyof ContactLdSetProperties];
        const importLdSet = importValue as LdSet<any>;

        importLdSet.forEach((el: any) => {
          newTargetProperty?.add(el);
        });
      } else {
        newContactObj[propertyKey] = importValue;
      }

      try {
        await this.commitProperty(newContactObj, commitData);
      } catch (e) {
        console.log("Failed to save property: " + propertyKey);
        console.log(contactToImport.name);
        throw e;
      }
    }
  }

  private async persistSocialContact(
    session: NextGraphSession,
    contactToImport: Partial<SocialContact>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
    resource: NextGraphResource,
    subject: SocialContact
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    for (const propertyKey in contactToImport) {
      if (["@id", "@context", "type"].includes(propertyKey)) {
        continue;
      }
      await this.persistProperty(contactToImport, propertyKey as keyof SocialContact, commitData, changeData, resource, subject);
    }
  }

  async saveContacts(
    session: NextGraphSession,
    contacts: Contact[],
    createData: CreateDataFunction,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ) {
    for (const contact of contacts) {
      await this.createContact(session, contact, createData, commitData, changeData);
    }
  };

  async getDuplicatedContacts(session?: NextGraphSession): Promise<string[][]> {
    if (!session) return [];
    const sparql = this.getDuplicatedContactsSparql();

    const data = await session.ng!.sparql_query(session.sessionId, sparql);
    // @ts-expect-error TODO output format of ng sparql query
    const duplicatesList: string[][] = data.results.bindings.map(binding =>
      binding.duplicateContacts.value.split(",").map(contactId => "did:ng:o:" + contactId));

    return mergeGroups(duplicatesList);
  }

  getDuplicatedContactsSparql(): string {
    const params = ["email", "phoneNumber", "account"];
    const filter = this.getFilter();

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
      ${this.contactPrefixes}
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

  async updateContact(
    session: NextGraphSession | undefined,
    contact: Contact,
    changes: Partial<Contact>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ): Promise<void>
  async updateContact(
    session: NextGraphSession | undefined,
    contactId: string,
    changes: Partial<Contact>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ): Promise<void>
  async updateContact(
    session: NextGraphSession | undefined,
    contact: Contact | string,
    changes: Partial<Contact>,
    commitData: CommitDataFunction,
    changeData: ChangeDataFunction,
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    if (typeof contact === "string") {
      contact = dataset.usingType(SocialContactShapeType).fromSubject(contact);
    }

    const resource = dataset.getResource(contact["@id"]!);
    if (resource.isError || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to create resource`);
    }

    const contactObj = changeData(contact, resource);

    await this.persistSocialContact(session, changes, commitData, changeData, resource, contactObj);
  }
}

export const nextgraphDataService = NextgraphDataService.getInstance();