import {
  GreenCheckClaim,
  isAccountClaim,
  isPhoneClaim,
  isEmailClaim,
  CentralityResponse
} from '@/lib/greencheck-api-client/types';
import {SocialContact, Name, PhoneNumber, Email, Url, Photo} from '@/.ldo/contact.typings';
import {BasicLdSet} from "@/lib/ldo/BasicLdSet";
import {mapBoxSearchService} from "@/services/mapBoxSearchService.ts";

export function mapGreenCheckClaimToSocialContact(claim: GreenCheckClaim): Partial<SocialContact> {
  const contact: Partial<SocialContact> = {
    type: new BasicLdSet([{"@id": "Individual"}])
  };

  if (isPhoneClaim(claim)) {
    const phoneNumber: PhoneNumber = {
      value: claim.claimData.username,
      type2: {"@id": "mobile"}, //TODO: could it be other type?
      source: 'GreenCheck'
    };
    contact.phoneNumber = new BasicLdSet([phoneNumber])
  } else if (isEmailClaim(claim)) {
    const email: Email = {
      value: claim.claimData.username,
      source: 'GreenCheck'
    };
    contact.email = new BasicLdSet([email]);
  } else if (isAccountClaim(claim)) {
    const source = [claim.provider, claim.claimData.server, "via GreenCheck"].filter(Boolean).join(' ');

    if (claim.claimData.fullname) {
      let displayName = claim.claimData.fullname || '';
      if (!displayName && (claim.claimData.given_name || claim.claimData.family_name)) {
        displayName = [claim.claimData.given_name, claim.claimData.family_name].filter(Boolean).join(' ');
      }
      const name: Name = {
        value: displayName,
        firstName: claim.claimData.given_name,
        familyName: claim.claimData.family_name,
        source: source
      };
      contact.name = new BasicLdSet([name]);
    }

    if (claim.claimData.avatar || claim.claimData.image) {
      //@ts-expect-error we would put photo later
      const photo: Photo = {
        photoUrl: claim.claimData.avatar || claim.claimData.image || '',
        source: source
      };
      contact.photo = new BasicLdSet([photo]);
    }

    if (claim.claimData.url) {
      const accountType = claim.provider === "linkedin" ? "linkedin" : "profile";
      const url: Url = {
        value: claim.claimData.url,
        type2: {"@id": accountType},
        source: source
      };
      contact.url = new BasicLdSet([url]);
    }

    if (claim.claimData.description) {
      if (claim.provider === "linkedin") {
        contact.headline = new BasicLdSet([{
          value: claim.claimData.description,
          source: source
        }]);
      } else {
        contact.biography = new BasicLdSet([{
          value: claim.claimData.description,
          source: source
        }]);
      }
    }

    if (claim.claimData.about) {
      //TODO: this shouldn't leak from GreenCheck
      const bio = claim.claimData.about.replace(/GreenCheck\s+token:\s*\S+/g, "");
      if (contact.biography) {
        contact.biography.add(
          {
            value: bio,
            source: source
          }
        )
      } else {
        contact.biography = new BasicLdSet([{
          value: bio,
          source: source
        }]);
      }
    }

    if (claim.claimData.location) {
      contact.address = new BasicLdSet([{
        value: claim.claimData.location,
        source: source
      }])
    }
    if (claim.claimData.username) {
      contact.account = new BasicLdSet([{
        value: claim.claimData.username,
        server: claim.claimData.server,
        protocol: claim.provider,
        source: source
      }])
    }

  }

  return contact;
}

export async function mapCentralityResponseToSocialContacts(
  response: CentralityResponse,
  linkedinContacts: Record<string, string>,
  getCentrality?: boolean,
  getProfileDetails?: boolean
): Promise<Record<string, Partial<SocialContact>>> {
  const contacts: Record<string, Partial<SocialContact>> = {};

  const centrality = response.centrality;
  const profileData = response.profile_data;
  if (!centrality) {
    return contacts;
  }

  const source = 'GreenCheck';

  for (const [account, contactNuri] of Object.entries(linkedinContacts)) {
    if (!centrality[account]) {
      continue;
    }

    const contact: Partial<SocialContact> = {};

    if (getCentrality) {
      contact.centralityScore = centrality[account];
    }

    if (getProfileDetails && profileData && profileData[account]?.linkedin) {
      const data = profileData[account].linkedin;
      // Add photo
      if (data.image) {
        //@ts-expect-error we would put photo later
        const photo: Photo = {
          photoUrl: data.image,
          source: source
        };
        contact.photo = new BasicLdSet([photo]);
      }

      // Add location
      if (data.loc) {
        contact.address = new BasicLdSet([{
          value: data.loc,
          source: source
        }]);
        //TODO: this is fallback for coordinates via paid API
        await mapBoxSearchService.initContactGeoCodes(contact);
      }
    }
    contacts[contactNuri] = contact;
  }
  return contacts;
}
