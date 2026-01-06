export interface LinkedInContactData {
  firstName: string;
  lastName: string;
  fullName: string;
  url: string;
  emailAddress: string;
  company: string;
  position: string;
  connectedOn: string;
  username: string;
  mostRecentInteraction?: string;
}

export interface LinkedInProfileData {
  firstName: string;
  lastName: string;
  maidenName: string;
  address: string;
  birthDate: string;
  headline: string;
  summary: string;
  industry: string;
  zipCode: string;
  geoLocation: string;
  twitterHandles: string;
  websites: string;
  instantMessengers: string;
}

export interface LinkedInEmailAddress {
  emailAddress: string;
  confirmed: "Yes" | "No";
  primary: "Yes" | "No";
  updatedOn: string;
}

export interface LinkedInPhoneNumber {
  extension: string;
  number: string;
  type: string;
}

export interface LinkedInEducation {
  schoolName: string;
  startDate: string;
  endDate: string;
  notes: string;
  degreeName: string;
  activities: string;
}

export interface LinkedInPosition {
  companyName: string;
  title: string;
  description: string;
  location: string;
  startedOn: string;
  finishedOn: string;
}

export interface LinkedInLanguage {
  name: string;
  proficiency: string;
}

export interface LinkedInSkill {
  name: string;
}

export interface LinkedInProject {
  title: string;
  description: string;
  url: string;
  startedOn: string;
  finishedOn: string;
}

export interface LinkedInPublication {
  name: string;
  publishedOn: string;
  description: string;
  publisher: string;
  url: string;
}

export interface LinkedInOtherData {
  EmailAddresses?: LinkedInEmailAddress[];
  PhoneNumbers?: LinkedInPhoneNumber[];
  Education?: LinkedInEducation;
  Positions?: LinkedInPosition[];
  Languages?: LinkedInLanguage[];
  Skills?: LinkedInSkill[];
  Projects?: LinkedInProject[];
  Publications?: LinkedInPublication;
}

export interface LinkedInData {
  success: boolean;
  data: {
    profileData: LinkedInProfileData;
    contactsData: LinkedInContactData[];
    otherData?: LinkedInOtherData;
  };
}

export const DEBUG = true;