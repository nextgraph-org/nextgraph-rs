import {NextGraphSession} from "@/types/nextgraph.ts";
import {SortParams} from "@/types/contact.ts";
import {Photo, SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {imageService} from "@/services/imageService.ts";
import {socialContactSetProperties, SocialContactSetPropertyName} from "@/.orm/utils/contact.utils.ts";
import {persistProperty} from "@/utils/orm/ormUtils.ts";
import {getContactGraph, resolveContactName} from "@/utils/socialContact/contactUtilsOrm.ts";

class ContactService {
  private static instance: ContactService;

  private constructor() {
  }

  public static getInstance(): ContactService {
    if (!ContactService.instance) {
      ContactService.instance = new ContactService();
    }
    return ContactService.instance;
  }

  prefixes = `
    PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
    PREFIX ngcontact: <did:ng:x:contact#>
    PREFIX ngcore: <did:ng:x:core#>
  `;

  async getContactIDs(session: NextGraphSession, limit?: number, offset?: number, base?: string, nuri?: string,
                      orderBy?: SortParams[], filterParams?: Map<string, string>) {
    const sparql = this.getAllContactIdsQuery(session, "vcard:Individual", limit, offset, orderBy, filterParams);

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  async getContactsCount(session: NextGraphSession, filterParams?: Map<string, string>) {
    const sparql = this.getCountQuery("vcard:Individual", session, filterParams);

    return await session.ng!.sparql_query(session.sessionId, sparql);
  };

  async getAllLinkedinAccountsByContact(session: NextGraphSession) {
    const sparql = `
     PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
  PREFIX ngcontact: <did:ng:x:contact#>
  PREFIX ngcore: <did:ng:x:core#>

  SELECT ?contactUri (SAMPLE(?accountValue) AS ?linkedinAccount)
  WHERE {
    ?contactUri a vcard:Individual .
    ?contactUri ngcontact:account ?accountNode .
    ?accountNode ngcontact:protocol "linkedin" .
    ?accountNode ngcore:value ?accountValue .
    FILTER NOT EXISTS { ?contactUri ngcontact:mergedInto ?mergedIntoNode }
  }
  GROUP BY ?contactUri
`;
    const result = await session.ng!.sparql_query(session.sessionId!, sparql);
    const record: Record<string, string> = {};

    result.results?.bindings?.forEach(binding => {
      const graph = getContactGraph(binding.contactUri.value, session);
      record[graph] = binding.linkedinAccount.value;
    });

    return record;
  }

  private directSortProperties = ["centralityScore", "mostRecentInteraction"];

  getAllContactIdsQuery(session: NextGraphSession, type: string, limit?: number, offset?: number, sortParams?: SortParams[], filterParams?: Map<string, string>) {
    const orderByData: string[] = [];
    const optionalJoinData: string[] = [];

    const filter = this.getFilter(filterParams, session);

    if (sortParams) {
      for (const sortParam of sortParams) {
        const sortDirection = (sortParam["sortDirection"] as string).toUpperCase();
        const sortBy = sortParam["sortBy"] ?? "name";//TODO?
        if (sortDirection === "ASC") {
          orderByData.push(`${sortDirection}(COALESCE(?${sortBy}, "zzzzz"))`);
        } else {
          orderByData.push(`${sortDirection}(?${sortBy})`);
        }

        if (this.directSortProperties.includes(sortBy)) {
          optionalJoinData.push(`OPTIONAL {
          ?contactUri ngcontact:${sortBy} ?${sortBy} .
        }`);
        } else {
          // Nested property with ngcore:value
          optionalJoinData.push(`OPTIONAL {
          ?contactUri ngcontact:${sortBy} ?${sortBy}Node .
          ?${sortBy}Node ngcore:value ?${sortBy} .
        }`);
        }
      }
    }

    const orderBy = ` ORDER BY ${orderByData.join(", ")}`;
    const optionalJoin = optionalJoinData.join(" ");

    return `
      ${this.prefixes}
      
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

  async getContactAllProperties(session: NextGraphSession, nuri: string, property?: string) {
    const sparql = `
      ${this.prefixes}

      SELECT ?mainProperty ?subProperty ?value ?node
      WHERE {
        <${nuri}> ?mainPropertyUri ?node .
        ?node ?subPropertyUri ?value .
        BIND(REPLACE(STR(?mainPropertyUri), ".*[#/]", "") AS ?mainProperty)
        BIND(REPLACE(STR(?subPropertyUri), ".*[#/]", "") AS ?subProperty)
        
        ${property ? `FILTER(?mainProperty = "${property}")` : ""}
        FILTER(?subPropertyUri != "rdf:type")
      }`;

    return await session.ng!.sparql_query(session.sessionId, sparql);
  }

  async getContactPropertiesList(session: NextGraphSession, nuri: string, property?: string) {
    const allProperties = await this.getContactAllProperties(session, nuri, property);

    const result: Record<string, Record<string, Record<string, string>>> = {};
    allProperties.results?.bindings?.forEach(binding => {
      const prop = binding.mainProperty.value;
      const id = binding.node.value;

      result[prop] ??= {};
      result[prop][id] ??= {id};
      result[prop][id][binding.subProperty.value] = binding.value.value;
    });

    return result;
  }

  getCountQuery(type: string, session: NextGraphSession, filterParams?: Map<string, string>) {
    const filter = this.getFilter(filterParams, session);

    return `
      ${this.prefixes}

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

  makeEqualityFilter = (key: string, value: string) => [
    `?contactUri ngcontact:${key} ?${key} .`,
    `FILTER (?${key} = <${value}>)`
  ];

  makeStringFilter = (key: string, value: string) => [
    `?contactUri ngcontact:${key} ?${key} .`,
    `FILTER (?${key} = '${value}')`
  ];

  getFilterData(key: string, value: string): string[] {
    switch (key) {
      case "fts":
        return this.getFtsFilterData(value);
      case "hasAddress":
        return value === "true" ? [
          `FILTER EXISTS { ?contactUri ngcontact:address ?addressNode }`
        ] : [];
      case "hasNetworkCentrality":
        return value === "true" ? [
          `FILTER EXISTS { ?contactUri ngcontact:centralityScore ?centralityScore }`
        ] : [];
      case "account":
        return [`
          ?contactUri ngcontact:${key} ?${key}Node .
          ?${key}Node ngcontact:protocol ?${key} .
        `,
          `FILTER (?${key} = "${value}")`
        ];
      case "rcard":
        if (value === "default") {
          return [
            `FILTER NOT EXISTS { ?contactUri ngcontact:rcard ?rcard }`
          ];
        }
        return this.makeEqualityFilter(key, value);
      case "naoStatus":
        if (value === "not_invited") {
          return [
            `FILTER NOT EXISTS { ?contactUri ngcontact:naoStatus ?naoStatus }`
          ];
        }
        return this.makeStringFilter(key, value);
      default:
        return this.makeEqualityFilter(key, value);
    }
  }

  getFilter(filterParams?: Map<string, string>, session?: NextGraphSession) {
    filterParams ??= new Map();
    const filterData = [
      `OPTIONAL {
          ?contactUri ngcontact:isDraft ?isDraft .
      }`,
      `FILTER ( !BOUND(?isDraft) || ?isDraft = false )`,
      `FILTER NOT EXISTS { ?contactUri ngcontact:mergedInto ?mergedIntoNode }`
    ];
    for (const [key, value] of filterParams) {
      filterData.push(...this.getFilterData(key, value));
    }

    if (session && session.protectedStoreId) {
      filterData.push(`FILTER (?contactUri != <did:ng:${session.protectedStoreId.substring(0, 46)}>)`)
    }

    return filterData.join("\n");
  }

  private async downloadAndUploadPhoto(photo: Photo, contactId: string, sessionId: string): Promise<void> {
    if (!photo.photoUrl || photo.photoIRI) {
      return;
    }

    const response = await fetch(photo.photoUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from ${photo.photoUrl}: ${response.statusText}`);
      return;
    }

    const blob = await response.blob();
    const fileName = photo.photoUrl.split('/').pop() || 'photo.jpg';
    const file = new File([blob], fileName, {type: blob.type});

    const nuri = await imageService.uploadFile(
      file,
      contactId,
      sessionId,
      () => {
      } // No-op progress callback
    );

    if (nuri) {
      photo.photoIRI = nuri;
    }
  }

  async persistSocialContact(
    session: NextGraphSession,
    updateData: Partial<SocialContact>,
    contact: SocialContact
  ) {
    if (!session || !session.ng) {
      throw new Error('No active session available');
    }

    for (const key in updateData) {
      const propertyKey = key as keyof SocialContact;
      try {
        if (propertyKey === "photo" && updateData.photo) {
          for (const el of updateData.photo) {
            await this.downloadAndUploadPhoto(el, contact["@id"]!, session.sessionId);
          }
        }
      } catch (e: any) {
        console.error("Couldn't upload file: ", e);
      }
      persistProperty(propertyKey, contact, updateData, socialContactSetProperties.includes(propertyKey as SocialContactSetPropertyName));
    }
  }

  async updateContactDocHeader(contact: SocialContact, session: NextGraphSession) {
    const contactName = resolveContactName(contact) || 'Unknown Contact';
    await session!.ng!.update_header(session.sessionId, contact["@graph"], contactName);
  }

  async getDraftContactId(session: NextGraphSession): Promise<string | undefined> {
    const sparql = `
      ${this.prefixes}
      SELECT DISTINCT ?contactUri
      WHERE {
        ?contactUri a vcard:Individual .
        ?contactUri ngcontact:isDraft ?isDraft .
        FILTER (?isDraft = true )
      }
    `;

    const result = await session.ng!.sparql_query(session.sessionId, sparql);

    return (result.results?.bindings ?? [])[0]?.contactUri.value;
  }

  resetDraftContact(draftContact: SocialContact) {
    const excludeFields: (keyof SocialContact)[] = ["@graph", "@id", "@type", "isDraft", "rcard"];
    for (const key in draftContact) {
      const propertyKey = key as keyof SocialContact;

      if (excludeFields.includes(propertyKey)) {
        continue;
      }
      delete draftContact[propertyKey];
      const isSetProperty = socialContactSetProperties.includes(propertyKey as SocialContactSetPropertyName);
      if (isSetProperty) {
        draftContact[propertyKey as SocialContactSetPropertyName] = new Set<any>();
      }
    }
  }
}

export const contactService = ContactService.getInstance();