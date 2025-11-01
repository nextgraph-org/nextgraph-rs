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

export interface LinkedInData {
  success: boolean;
  data: {
    profileData: LinkedInProfileData;
    contactsData: LinkedInContactData[];
    otherData?: {
      Education?: any;
      Projects?: any[];
      PhoneNumbers?: any[];
      Positions?: any[];
      Languages?: any[];
      EmailAddresses?: any[];
      Skills?: any[];
      Publications?: any[]
    };
  };
}

export const DEBUG = false;