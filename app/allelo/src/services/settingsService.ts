import {NextGraphSession} from "@/types/nextgraph.ts";

class SettingsService {
  private static instance: SettingsService;

  private constructor() {
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  async isSettingsCreated(session?: NextGraphSession, base?: string, nuri?: string) {
    if (!session || !session.sessionId) {
      return;
    }
    base ??= "did:ng:" + session.privateStoreId?.substring(0, 46);
    nuri ??= "did:ng:" + session.privateStoreId;
    const sparql = `
      PREFIX ngset: <did:ng:x:settings#>
      ASK { <> a ngset:Settings . }`;

    return await session.ng!.sparql_query(session.sessionId, sparql, base, nuri);
  }
}

export const settingsService = SettingsService.getInstance();