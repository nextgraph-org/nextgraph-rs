import {LinkedInContactData, LinkedInData, LinkedInProfileData} from "@/importers/linkedin/linkedInTypes";
import {codeIRIByLanguageName} from "@/utils/bcp47map";
import {getProficiencyIRI} from "@/utils/proficiencyMap";
import {
  Email,
  Language,
  Organization,
  PhoneNumber,
  Project, Publication,
  Skill,
  SocialContact
} from "@/.orm/shapes/contact.typings.ts";
import {prepareContact} from "@/utils/socialContact/contactUtilsOrm.ts";
import {contactDictMapper} from "@/utils/dictMappers.ts";

const parseLinkedInDate = (dateStr: string): string | undefined => {
  if (!dateStr) return undefined;

  try {
    // LinkedIn dates are in format "DD MMM YYYY" (e.g., "03 Jul 2025")
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

export async function mapLinkedInPerson(
  linkedInData: LinkedInContactData | LinkedInProfileData,
  linkedInUsername: string | undefined,
  isProfile = false,
  otherData?: LinkedInData["data"]["otherData"],
): Promise<SocialContact> {
  const src = "LinkedIn";

  const contact: Partial<SocialContact> = {
  };

  // Map common fields
  if (linkedInData.firstName) {
    contact.name = new Set([{
      "@graph": "",
      "@id": "",
      value: isProfile
        ? `${linkedInData.firstName} ${linkedInData.lastName}`.trim()
        : (linkedInData as LinkedInContactData).fullName || `${linkedInData.firstName} ${linkedInData.lastName}`.trim(),
      firstName: linkedInData.firstName,
      familyName: linkedInData.lastName,
      source: src,
    }]);
  }

  if (isProfile) {
    const profile = linkedInData as LinkedInProfileData;

    if (linkedInUsername) {
      contact.account = new Set([{
        "@graph": "",
        "@id": "",
        value: linkedInUsername,
        protocol: "linkedin",
        source: src,
      }]);
    }

    // Map address
    if (profile.address || profile.geoLocation) {
      contact.address = new Set();
      if (profile.address) {
        contact.address.add({
          "@graph": "",
          "@id": "",
          value: profile.address,
          source: src,
        });
      }
      if (profile.geoLocation) {
        contact.address.add({
          "@graph": "",
          "@id": "",
          value: profile.geoLocation,
          source: src,
        });
      }
    }

    // Map birthday
    if (profile.birthDate) {
      const formattedDate = parseLinkedInDate(profile.birthDate);
      if (formattedDate) {
        contact.birthday = new Set([{
          "@graph": "",
          "@id": "",
          valueDate: formattedDate,
          source: src,
        }]);
      }
    }

    if (profile.headline) {
      contact.headline = new Set([{
        "@graph": "",
        "@id": "",
        value: profile.headline,
        source: src,
      }]);
    }

    // Map biography (summary)
    if (profile.summary) {
      contact.biography = new Set([{
        "@graph": "",
        "@id": "",
        value: profile.summary,
        source: src,
      }]);
    }

    if (profile.industry) {
      contact.industry = new Set([{
        "@graph": "",
        "@id": "",
        value: profile.industry,
        source: src,
      }]);
    }

    // Map other data if available
    if (otherData) {
      if (otherData.Education) {
        const education = otherData.Education;
        contact.education = new Set([{
          "@graph": "",
          "@id": "",
          value: education.schoolName || "",
          startDate: education.startDate ? parseLinkedInDate(education.startDate) : undefined,
          endDate: education.endDate ? parseLinkedInDate(education.endDate) : undefined,
          notes: education.notes || "",
          degreeName: education.degreeName || "",
          activities: education.activities || "",
          source: src,
        }]);
      }

      if (otherData.Projects && Array.isArray(otherData.Projects)) {
        contact.project = new Set(otherData.Projects.map((el): Project => ({
          "@graph": "",
          "@id": "",
          value: el.title || "",
          startDate: el.startedOn ? parseLinkedInDate(el.startedOn) : undefined,
          endDate: el.finishedOn ? parseLinkedInDate(el.finishedOn) : undefined,
          description: el.description || "",
          url: el.url || "",
          source: src,
        })));
      }

      // Map phone numbers
      if (otherData.PhoneNumbers && Array.isArray(otherData.PhoneNumbers)) {
        contact.phoneNumber = new Set(otherData.PhoneNumbers
          .filter((phone) => phone.number)
          .map((phone): PhoneNumber => ({
            "@graph": "",
            "@id": "",
            value: phone.number || "",
            type: contactDictMapper.appendPrefixToDictValue("phoneNumber", "type", phone.type || ""),
            //TODO: check linkedidn phone types
            source: src,
          })));
      }

      // Map positions
      if (otherData.Positions && Array.isArray(otherData.Positions)) {
        contact.organization = new Set(otherData.Positions.map((pos): Organization => ({
          "@graph": "",
          "@id": "",
          value: pos.companyName || "",
          position: pos.title || "",
          jobDescription: pos.description || "",
          startDate: pos.startedOn ? parseLinkedInDate(pos.startedOn) : undefined,
          endDate: pos.finishedOn ? parseLinkedInDate(pos.finishedOn) : undefined,
          location: pos.location || "",
          current: !pos.finishedOn,
          source: src,
        })));
      }

      // Map languages
      if (otherData.Languages && Array.isArray(otherData.Languages)) {
        contact.language = new Set(otherData.Languages.map((lang): Language => ({
          "@graph": "",
          "@id": "",
          valueIRI: codeIRIByLanguageName(lang.name || "") ?? "",
          proficiency: getProficiencyIRI(lang.proficiency || ""),
          source: src,
        })));
      }

      // Map email addresses
      if (otherData["EmailAddresses"] && Array.isArray(otherData.EmailAddresses)) {
        contact.email = new Set(otherData.EmailAddresses.map((email): Email => ({
          "@graph": "",
          "@id": "",
          value: email.emailAddress || "",
          preferred: email.primary === "Yes",
          source: src,
        })));
      }

      // Map skills
      if (otherData.Skills && Array.isArray(otherData.Skills)) {
        contact.skill = new Set(otherData.Skills.map((skill): Skill => ({
          "@graph": "",
          "@id": "",
          value: skill.name || "",
          source: src,
        })));
      }

      if (otherData.Publications && Array.isArray(otherData.Publications)) {
        contact.publication = new Set(otherData.Publications.map((el): Publication => ({
          "@graph": "",
          "@id": "",
          value: el.name || "",
          publishDate: el.publishedOn ? parseLinkedInDate(el.publishedOn) : undefined,
          description: el.description || "",
          publisher: el.publisher || "",
          url: el.url || "",
          source: src,
        })));
      }
    }
  } else {
    linkedInData = linkedInData as LinkedInContactData;

    // Map email
    if (linkedInData.emailAddress) {
      contact.email = new Set([{
        "@graph": "",
        "@id": "",
        value: linkedInData.emailAddress,
        type: contactDictMapper.appendPrefixToDictValue("email", "type", "work"),
        source: src,
      }]);
    }

    // Map URL (LinkedIn profile)
    if (linkedInData.username) {
      contact.account = new Set([{
        "@graph": "",
        "@id": "",
        value: linkedInData.username,
        protocol: "linkedin",
        source: src,
      }]);
    }

    // Map organization
    if (linkedInData.company) {
      contact.organization = new Set([{
        "@graph": "",
        "@id": "",
        value: linkedInData.company,
        position: linkedInData.position || "",
        source: src,
      }]);
    }

    if ("mostRecentInteraction" in linkedInData && linkedInData.mostRecentInteraction) {
      contact.mostRecentInteraction = new Date(linkedInData.mostRecentInteraction as string).toISOString();
    }
  }

  return await prepareContact(contact);
}