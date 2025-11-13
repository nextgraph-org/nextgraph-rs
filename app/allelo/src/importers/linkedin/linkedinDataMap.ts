import {LinkedInContactData, LinkedInData, LinkedInProfileData} from "@/importers/linkedin/linkedInTypes";
import {Contact} from "@/types/contact";
import {getContactIriValue} from "@/utils/socialContact/dictMapper";
import {codeIRIByLanguageName} from "@/utils/bcp47map";
import {getProficiencyIRI} from "@/utils/proficiencyMap";
import {processContactFromJSON} from "@/utils/socialContact/contactUtils";

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
  withIds = true
): Promise<Contact> {
  const src = "LinkedIn";

  const contactJson: any = {
    type: [
      {
        "@id": "Individual"
      }
    ],
  };

  // Map common fields
  if ("firstName" in linkedInData && linkedInData.firstName) {
    contactJson.name = [{
      value: isProfile
        ? `${linkedInData.firstName} ${linkedInData.lastName}`.trim()
        : (linkedInData as LinkedInContactData).fullName || `${linkedInData.firstName} ${linkedInData.lastName}`.trim(),
      firstName: linkedInData.firstName,
      familyName: linkedInData.lastName,
      source: src,
    }];
  }

  // Map email
  if ("emailAddress" in linkedInData && linkedInData.emailAddress) {
    contactJson.email = [{
      value: linkedInData.emailAddress,
      type2: getContactIriValue("email", "work"),
      source: src,
    }];
  }

  // Map URL (LinkedIn profile)
  if ("username" in linkedInData && linkedInData.username) {
    contactJson.account = [{
      value: linkedInData.username,
      protocol: "linkedin",
      source: src,
    }];
  }

  // Map organization
  if ("company" in linkedInData && linkedInData.company) {
    contactJson.organization = [{
      value: linkedInData.company,
      position: linkedInData.position || "",
      source: src,
    }];
  }

  // Map profile-specific fields
  if (isProfile) {
    const profile = linkedInData as LinkedInProfileData;

    if(linkedInUsername) {
      contactJson.account = [{
        value: linkedInUsername,
        protocol: "linkedin",
        source: src,
      }]
    }

    // Map address
    if (profile.address) {
      contactJson.address = [{
        value: profile.address,
        source: src,
      }];
    }

    // Map geo location
    if (profile.geoLocation) {
      contactJson.address = contactJson.address || [];
      if (contactJson.address.length === 0) {
        contactJson.address.push({
          value: profile.geoLocation,
          source: src,
        });
      } else {
        contactJson.address[0].value = profile.geoLocation;
      }
    }

    // Map birthday
    if (profile.birthDate) {
      const formattedDate = parseLinkedInDate(profile.birthDate);
      if (formattedDate) {
        contactJson.birthday = [{
          valueDate: formattedDate,
          source: src,
        }];
      }
    }

    if (profile.headline) {
      contactJson.headline = [{
        value: profile.headline,
        source: src,
      }];
    }

    // Map biography (summary)
    if (profile.summary) {
      contactJson.biography = [];

      contactJson.biography.push({
        value: profile.summary,
        source: src,
      });
    }

    if (profile.industry) {
      contactJson.industry = [{
        value: profile.industry,
        source: src,
      }];
    }

    // Map other data if available
    if (otherData) {
      if (otherData.Education && Array.isArray(otherData.Education)) {
        contactJson.education = otherData.Education.map((edu: any) => ({
          value: edu.schoolName || "",
          startDate: edu.startDate ? parseLinkedInDate(edu.startDate) : undefined,
          endDate: edu.endDate ? parseLinkedInDate(edu.endDate) : undefined,
          notes: edu.notes || "",
          degreeName: edu.degreeName || "",
          activities: edu.activities || "",
          source: src,
        }));
      }

      if (otherData.Projects && Array.isArray(otherData.Projects)) {
        contactJson.project = otherData.Projects.map((el: any) => ({
          value: el.title || "",
          startDate: el.startedOn ? parseLinkedInDate(el.startedOn) : undefined,
          endDate: el.finishedOn ? parseLinkedInDate(el.finishedOn) : undefined,
          description: el.description || "",
          url1: el.url || "",
          source: src,
        }));
      }

      // Map phone numbers
      if (otherData.PhoneNumbers && Array.isArray(otherData.PhoneNumbers)) {
        contactJson.phoneNumber = otherData.PhoneNumbers
          .filter((phone: any) => phone.number)
          .map((phone: any) => ({
            value: phone.number || "",
            type2: getContactIriValue("phoneNumber", phone.type || ""), //TODO: check linkedidn phone types
            source: src,
          }));
      }

      // Map positions
      if (otherData.Positions && Array.isArray(otherData.Positions)) {
        contactJson.organization = otherData.Positions.map((pos: any) => ({
          value: pos.companyName || "",
          position: pos.title || "",
          jobDescription: pos.description || "",
          startDate: pos.startedOn ? parseLinkedInDate(pos.startedOn) : undefined,
          endDate: pos.finishedOn ? parseLinkedInDate(pos.finishedOn) : undefined,
          location: pos.location || "",
          current: !pos.finishedOn,
          source: src,
        }));
      }

      // Map languages
      if (otherData.Languages && Array.isArray(otherData.Languages)) {
        contactJson.language = otherData.Languages.map((lang: any) => ({
          valueIRI: lang.name ? codeIRIByLanguageName(lang.name || "") : undefined,
          proficiency: getProficiencyIRI(lang.proficiency || ""),
          source: src,
        }));
      }

      // Map email addresses
      if (otherData["EmailAddresses"] && Array.isArray(otherData["EmailAddresses"])) {
        contactJson.email = otherData["EmailAddresses"].map((email: any) => ({
          value: email.emailAddress || "",
          preferred: email.primary === "Yes",
          source: src,
        }));
      }

      // Map skills
      if (otherData.Skills && Array.isArray(otherData.Skills)) {
        contactJson.skill = otherData.Skills.map((skill: any) => ({
          value: skill.name || "",
          source: src,
        }));
      }

      if (otherData.Publications && Array.isArray(otherData.Publications)) {
        contactJson.publication = otherData.Publications.map((el: any) => ({
          value: el.name || "",
          publishDate: el.publishedOn ? parseLinkedInDate(el.publishedOn) : undefined,
          description: el.description || "",
          publisher: el.publisher || "",
          url1: el.url || "",
          source: src,
        }));
      }
    }
  }

  return await processContactFromJSON(contactJson, withIds);
}