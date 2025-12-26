import {
  GreenCheckClaim,
  isAccountClaim,
  isPhoneClaim,
  isEmailClaim,
  CentralityResponse
} from '@/lib/greencheck-api-client/types';
import {SocialContact, Photo} from '@/.orm/shapes/contact.typings';
import {mapBoxSearchService} from "@/services/mapBoxSearchService.ts";
import {appendPrefixToDictValue} from "@/utils/socialContact/dictMapper.ts";

export function mapGreenCheckClaimToSocialContact(claim: GreenCheckClaim): Partial<SocialContact> {
  const contact: Partial<SocialContact> = {
    "@type": new Set(["http://www.w3.org/2006/vcard/ns#Individual"])
  };

  const source = 'GreenCheck';

  if (isPhoneClaim(claim)) {
    contact.phoneNumber = new Set([{
      "@graph": "",
      "@id": "",
      value: claim.claimData.username,
      type: "did:ng:k:contact:phoneNumber#mobile",
      source
    }]);
  } else if (isEmailClaim(claim)) {
    contact.email = new Set([{
      "@graph": "",
      "@id": "",
      value: claim.claimData.username,
      source
    }]);
  } else if (isAccountClaim(claim)) {
    const source = [claim.provider, claim.claimData.server, "via GreenCheck"].filter(Boolean).join(' ');

    if (claim.claimData.fullname) {
      let displayName = claim.claimData.fullname || '';
      if (!displayName && (claim.claimData.given_name || claim.claimData.family_name)) {
        displayName = [claim.claimData.given_name, claim.claimData.family_name].filter(Boolean).join(' ');
      }
      contact.name = new Set([{
        "@graph": "",
        "@id": "",
        value: displayName,
        firstName: claim.claimData.given_name,
        familyName: claim.claimData.family_name,
        source: source
      }]);
    }

    if (claim.claimData.avatar || claim.claimData.image) {
      //@ts-expect-error we would put photo later
      contact.photo = new Set([{
        "@graph": "",
        "@id": "",
        photoUrl: claim.claimData.avatar || claim.claimData.image || '',
        source: source
      }]);
    }

    if (claim.claimData.url) {
      const accountType = claim.provider === "linkedin" ? "linkedin" : "profile";
      contact.url = new Set([{
        "@graph": "",
        "@id": "",
        value: claim.claimData.url,
        type: appendPrefixToDictValue('account', 'type', accountType),
        source: source
      }]);
    }

    if (claim.claimData.description) {
      if (claim.provider === "linkedin") {
        contact.headline = new Set([{
          "@graph": "",
          "@id": "",
          value: claim.claimData.description,
          source: source
        }]);
      } else {
        contact.biography = new Set([{
          "@graph": "",
          "@id": "",
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
            "@graph": "",
            "@id": "",
            value: bio,
            source: source
          }
        )
      } else {
        contact.biography = new Set([{
          "@graph": "",
          "@id": "",
          value: bio,
          source: source
        }]);
      }
    }

    if (claim.claimData.location) {
      contact.address = new Set([{
        "@graph": "",
        "@id": "",
        value: claim.claimData.location,
        source: source
      }])
    }
    if (claim.claimData.username) {
      contact.account = new Set([{
        "@graph": "",
        "@id": "",
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
          "@graph": "",
          "@id": "",
          photoUrl: data.image,
          source: source
        };
        contact.photo = new Set([photo]);
      }

      // Add location
      if (data.loc) {
        contact.address = new Set([{
          "@graph": "",
          "@id": "",
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
