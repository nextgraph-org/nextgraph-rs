import {NextGraphSession} from "@/types/nextgraph.ts";

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private notificationPrefixes = `
    PREFIX ngnotif: <did:ng:x:social:notification#>
    PREFIX xsd:    <http://www.w3.org/2001/XMLSchema#>
  `;

  async getNotificationIDs(
    session: NextGraphSession,
    limit?: number,
    offset?: number,
    base?: string,
    nuri?: string,
  ) {
    const sparql = this.getAllNotificationIdsQuery(limit, offset);

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }

  async getNotificationsCount(session: NextGraphSession) {
    const sparql = this.getNotificationsCountQuery();

    return await session.ng!.sparql_query(session.sessionId, sparql);
  }

  getAllNotificationIdsQuery(limit?: number, offset?: number) {
    return `
    ${this.notificationPrefixes}

    SELECT DISTINCT ?notificationUri ?date
    WHERE {
      ?notificationUri a ngnotif:Notification ;
                       ngnotif:date ?date .
    }
    ORDER BY DESC(?date)
    ${limit ? `LIMIT ${limit}` : ``}
    ${offset ? `OFFSET ${offset}` : ``}
  `;
  }

  getNotificationsCountQuery() {
    return `
    ${this.notificationPrefixes}

    SELECT (COUNT(DISTINCT ?notificationUri) AS ?count)
    WHERE {
      ?notificationUri a ngnotif:Notification ;
                       ngnotif:date ?date .
    }
  `;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();