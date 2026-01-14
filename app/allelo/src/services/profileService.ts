import {NextGraphSession} from "@/types/nextgraph.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

class ProfileService {
  private static instance: ProfileService;

  private constructor() {
  }

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  async createProfile(session: NextGraphSession, protectedStoreId?: string) {
    protectedStoreId ??= "did:ng:" + session.protectedStoreId;
    const sparql = `
        PREFIX ngc: <did:ng:x:contact:class#>
        PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>
        INSERT DATA {
            <> a vcard:Individual . 
            <> a ngc:Me . }`;
    const res = await session.ng!.sparql_update(session.sessionId!, sparql, protectedStoreId);
    if (!Array.isArray(res)) {
      throw new Error(`Failed to create profile on ${protectedStoreId}`);
    }
  }

  async isProfileCreated(session: NextGraphSession, base?: string, nuri?: string) {
    base ??= "did:ng:" + session.protectedStoreId?.substring(0, 46);
    nuri ??= "did:ng:" + session.protectedStoreId;
    const sparql = `
      PREFIX ngc: <did:ng:x:contact:class#>
      ASK { <> a ngc:Me . }`;

    return await session.ng!.sparql_query(session.sessionId!, sparql, base, nuri);
  }

  getProfileNuri = (session: NextGraphSession) => ("did:ng:" + session.protectedStoreId).substring(0, 53);

  isContactProfile(session: NextGraphSession, contact?: SocialContact): boolean {
    if (!contact) return false;
    const profileNuri = this.getProfileNuri(session);
    return contact["@id"] === profileNuri;
  }
}

export const profileService = ProfileService.getInstance();