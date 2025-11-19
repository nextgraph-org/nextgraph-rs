import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * contactContext: JSONLD Context for contact
 * =============================================================================
 */
export const contactContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
    "@isCollection": true,
  },
  Individual: {
    "@id": "http://www.w3.org/2006/vcard/ns#Individual",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      phoneNumber: {
        "@id": "did:ng:x:contact#phoneNumber",
        "@type": "@id",
        "@isCollection": true,
      },
      name: {
        "@id": "did:ng:x:contact#name",
        "@type": "@id",
        "@isCollection": true,
      },
      email: {
        "@id": "did:ng:x:contact#email",
        "@type": "@id",
        "@isCollection": true,
      },
      address: {
        "@id": "did:ng:x:contact#address",
        "@type": "@id",
        "@isCollection": true,
      },
      organization: {
        "@id": "did:ng:x:contact#organization",
        "@type": "@id",
        "@isCollection": true,
      },
      photo: {
        "@id": "did:ng:x:contact#photo",
        "@type": "@id",
        "@isCollection": true,
      },
      coverPhoto: {
        "@id": "did:ng:x:contact#coverPhoto",
        "@type": "@id",
        "@isCollection": true,
      },
      url: {
        "@id": "did:ng:x:contact#url",
        "@type": "@id",
        "@isCollection": true,
      },
      birthday: {
        "@id": "did:ng:x:contact#birthday",
        "@type": "@id",
        "@isCollection": true,
      },
      biography: {
        "@id": "did:ng:x:contact#biography",
        "@type": "@id",
        "@isCollection": true,
      },
      event: {
        "@id": "did:ng:x:contact#event",
        "@type": "@id",
        "@isCollection": true,
      },
      gender: {
        "@id": "did:ng:x:contact#gender",
        "@type": "@id",
        "@isCollection": true,
      },
      nickname: {
        "@id": "did:ng:x:contact#nickname",
        "@type": "@id",
        "@isCollection": true,
      },
      occupation: {
        "@id": "did:ng:x:contact#occupation",
        "@type": "@id",
        "@isCollection": true,
      },
      relation: {
        "@id": "did:ng:x:contact#relation",
        "@type": "@id",
        "@isCollection": true,
      },
      interest: {
        "@id": "did:ng:x:contact#interest",
        "@type": "@id",
        "@isCollection": true,
      },
      skill: {
        "@id": "did:ng:x:contact#skill",
        "@type": "@id",
        "@isCollection": true,
      },
      locationDescriptor: {
        "@id": "did:ng:x:contact#locationDescriptor",
        "@type": "@id",
        "@isCollection": true,
      },
      locale: {
        "@id": "did:ng:x:contact#locale",
        "@type": "@id",
        "@isCollection": true,
      },
      account: {
        "@id": "did:ng:x:contact#account",
        "@type": "@id",
        "@isCollection": true,
      },
      sipAddress: {
        "@id": "did:ng:x:contact#sipAddress",
        "@type": "@id",
        "@isCollection": true,
      },
      extId: {
        "@id": "did:ng:x:contact#extId",
        "@type": "@id",
        "@isCollection": true,
      },
      fileAs: {
        "@id": "did:ng:x:contact#fileAs",
        "@type": "@id",
        "@isCollection": true,
      },
      calendarUrl: {
        "@id": "did:ng:x:contact#calendarUrl",
        "@type": "@id",
        "@isCollection": true,
      },
      clientData: {
        "@id": "did:ng:x:contact#clientData",
        "@type": "@id",
        "@isCollection": true,
      },
      userDefined: {
        "@id": "did:ng:x:contact#userDefined",
        "@type": "@id",
        "@isCollection": true,
      },
      membership: {
        "@id": "did:ng:x:contact#membership",
        "@type": "@id",
        "@isCollection": true,
      },
      tag: {
        "@id": "did:ng:x:contact#tag",
        "@type": "@id",
        "@isCollection": true,
      },
      contactImportGroup: {
        "@id": "did:ng:x:contact#contactImportGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      internalGroup: {
        "@id": "did:ng:x:contact#internalGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      headline: {
        "@id": "did:ng:x:contact#headline",
        "@type": "@id",
        "@isCollection": true,
      },
      industry: {
        "@id": "did:ng:x:contact#industry",
        "@type": "@id",
        "@isCollection": true,
      },
      education: {
        "@id": "did:ng:x:contact#education",
        "@type": "@id",
        "@isCollection": true,
      },
      language: {
        "@id": "did:ng:x:contact#language",
        "@type": "@id",
        "@isCollection": true,
      },
      project: {
        "@id": "did:ng:x:contact#project",
        "@type": "@id",
        "@isCollection": true,
      },
      publication: {
        "@id": "did:ng:x:contact#publication",
        "@type": "@id",
        "@isCollection": true,
      },
      naoStatus: {
        "@id": "did:ng:x:contact#naoStatus",
        "@type": "@id",
      },
      invitedAt: {
        "@id": "did:ng:x:contact#invitedAt",
        "@type": "@id",
      },
      createdAt: {
        "@id": "did:ng:x:contact#createdAt",
        "@type": "@id",
      },
      updatedAt: {
        "@id": "did:ng:x:contact#updatedAt",
        "@type": "@id",
      },
      joinedAt: {
        "@id": "did:ng:x:contact#joinedAt",
        "@type": "@id",
      },
      mergedInto: {
        "@id": "did:ng:x:contact#mergedInto",
        "@type": "@id",
        "@isCollection": true,
      },
      mergedFrom: {
        "@id": "did:ng:x:contact#mergedFrom",
        "@type": "@id",
        "@isCollection": true,
      },
      centralityScore: {
        "@id": "did:ng:x:contact#centralityScore",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  Person: {
    "@id": "http://schema.org/Person",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      phoneNumber: {
        "@id": "did:ng:x:contact#phoneNumber",
        "@type": "@id",
        "@isCollection": true,
      },
      name: {
        "@id": "did:ng:x:contact#name",
        "@type": "@id",
        "@isCollection": true,
      },
      email: {
        "@id": "did:ng:x:contact#email",
        "@type": "@id",
        "@isCollection": true,
      },
      address: {
        "@id": "did:ng:x:contact#address",
        "@type": "@id",
        "@isCollection": true,
      },
      organization: {
        "@id": "did:ng:x:contact#organization",
        "@type": "@id",
        "@isCollection": true,
      },
      photo: {
        "@id": "did:ng:x:contact#photo",
        "@type": "@id",
        "@isCollection": true,
      },
      coverPhoto: {
        "@id": "did:ng:x:contact#coverPhoto",
        "@type": "@id",
        "@isCollection": true,
      },
      url: {
        "@id": "did:ng:x:contact#url",
        "@type": "@id",
        "@isCollection": true,
      },
      birthday: {
        "@id": "did:ng:x:contact#birthday",
        "@type": "@id",
        "@isCollection": true,
      },
      biography: {
        "@id": "did:ng:x:contact#biography",
        "@type": "@id",
        "@isCollection": true,
      },
      event: {
        "@id": "did:ng:x:contact#event",
        "@type": "@id",
        "@isCollection": true,
      },
      gender: {
        "@id": "did:ng:x:contact#gender",
        "@type": "@id",
        "@isCollection": true,
      },
      nickname: {
        "@id": "did:ng:x:contact#nickname",
        "@type": "@id",
        "@isCollection": true,
      },
      occupation: {
        "@id": "did:ng:x:contact#occupation",
        "@type": "@id",
        "@isCollection": true,
      },
      relation: {
        "@id": "did:ng:x:contact#relation",
        "@type": "@id",
        "@isCollection": true,
      },
      interest: {
        "@id": "did:ng:x:contact#interest",
        "@type": "@id",
        "@isCollection": true,
      },
      skill: {
        "@id": "did:ng:x:contact#skill",
        "@type": "@id",
        "@isCollection": true,
      },
      locationDescriptor: {
        "@id": "did:ng:x:contact#locationDescriptor",
        "@type": "@id",
        "@isCollection": true,
      },
      locale: {
        "@id": "did:ng:x:contact#locale",
        "@type": "@id",
        "@isCollection": true,
      },
      account: {
        "@id": "did:ng:x:contact#account",
        "@type": "@id",
        "@isCollection": true,
      },
      sipAddress: {
        "@id": "did:ng:x:contact#sipAddress",
        "@type": "@id",
        "@isCollection": true,
      },
      extId: {
        "@id": "did:ng:x:contact#extId",
        "@type": "@id",
        "@isCollection": true,
      },
      fileAs: {
        "@id": "did:ng:x:contact#fileAs",
        "@type": "@id",
        "@isCollection": true,
      },
      calendarUrl: {
        "@id": "did:ng:x:contact#calendarUrl",
        "@type": "@id",
        "@isCollection": true,
      },
      clientData: {
        "@id": "did:ng:x:contact#clientData",
        "@type": "@id",
        "@isCollection": true,
      },
      userDefined: {
        "@id": "did:ng:x:contact#userDefined",
        "@type": "@id",
        "@isCollection": true,
      },
      membership: {
        "@id": "did:ng:x:contact#membership",
        "@type": "@id",
        "@isCollection": true,
      },
      tag: {
        "@id": "did:ng:x:contact#tag",
        "@type": "@id",
        "@isCollection": true,
      },
      contactImportGroup: {
        "@id": "did:ng:x:contact#contactImportGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      internalGroup: {
        "@id": "did:ng:x:contact#internalGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      headline: {
        "@id": "did:ng:x:contact#headline",
        "@type": "@id",
        "@isCollection": true,
      },
      industry: {
        "@id": "did:ng:x:contact#industry",
        "@type": "@id",
        "@isCollection": true,
      },
      education: {
        "@id": "did:ng:x:contact#education",
        "@type": "@id",
        "@isCollection": true,
      },
      language: {
        "@id": "did:ng:x:contact#language",
        "@type": "@id",
        "@isCollection": true,
      },
      project: {
        "@id": "did:ng:x:contact#project",
        "@type": "@id",
        "@isCollection": true,
      },
      publication: {
        "@id": "did:ng:x:contact#publication",
        "@type": "@id",
        "@isCollection": true,
      },
      naoStatus: {
        "@id": "did:ng:x:contact#naoStatus",
        "@type": "@id",
      },
      invitedAt: {
        "@id": "did:ng:x:contact#invitedAt",
        "@type": "@id",
      },
      createdAt: {
        "@id": "did:ng:x:contact#createdAt",
        "@type": "@id",
      },
      updatedAt: {
        "@id": "did:ng:x:contact#updatedAt",
        "@type": "@id",
      },
      joinedAt: {
        "@id": "did:ng:x:contact#joinedAt",
        "@type": "@id",
      },
      mergedInto: {
        "@id": "did:ng:x:contact#mergedInto",
        "@type": "@id",
        "@isCollection": true,
      },
      mergedFrom: {
        "@id": "did:ng:x:contact#mergedFrom",
        "@type": "@id",
        "@isCollection": true,
      },
      centralityScore: {
        "@id": "did:ng:x:contact#centralityScore",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  Person2: {
    "@id": "http://xmlns.com/foaf/0.1/Person",
    "@context": {
      type: {
        "@id": "@type",
        "@isCollection": true,
      },
      phoneNumber: {
        "@id": "did:ng:x:contact#phoneNumber",
        "@type": "@id",
        "@isCollection": true,
      },
      name: {
        "@id": "did:ng:x:contact#name",
        "@type": "@id",
        "@isCollection": true,
      },
      email: {
        "@id": "did:ng:x:contact#email",
        "@type": "@id",
        "@isCollection": true,
      },
      address: {
        "@id": "did:ng:x:contact#address",
        "@type": "@id",
        "@isCollection": true,
      },
      organization: {
        "@id": "did:ng:x:contact#organization",
        "@type": "@id",
        "@isCollection": true,
      },
      photo: {
        "@id": "did:ng:x:contact#photo",
        "@type": "@id",
        "@isCollection": true,
      },
      coverPhoto: {
        "@id": "did:ng:x:contact#coverPhoto",
        "@type": "@id",
        "@isCollection": true,
      },
      url: {
        "@id": "did:ng:x:contact#url",
        "@type": "@id",
        "@isCollection": true,
      },
      birthday: {
        "@id": "did:ng:x:contact#birthday",
        "@type": "@id",
        "@isCollection": true,
      },
      biography: {
        "@id": "did:ng:x:contact#biography",
        "@type": "@id",
        "@isCollection": true,
      },
      event: {
        "@id": "did:ng:x:contact#event",
        "@type": "@id",
        "@isCollection": true,
      },
      gender: {
        "@id": "did:ng:x:contact#gender",
        "@type": "@id",
        "@isCollection": true,
      },
      nickname: {
        "@id": "did:ng:x:contact#nickname",
        "@type": "@id",
        "@isCollection": true,
      },
      occupation: {
        "@id": "did:ng:x:contact#occupation",
        "@type": "@id",
        "@isCollection": true,
      },
      relation: {
        "@id": "did:ng:x:contact#relation",
        "@type": "@id",
        "@isCollection": true,
      },
      interest: {
        "@id": "did:ng:x:contact#interest",
        "@type": "@id",
        "@isCollection": true,
      },
      skill: {
        "@id": "did:ng:x:contact#skill",
        "@type": "@id",
        "@isCollection": true,
      },
      locationDescriptor: {
        "@id": "did:ng:x:contact#locationDescriptor",
        "@type": "@id",
        "@isCollection": true,
      },
      locale: {
        "@id": "did:ng:x:contact#locale",
        "@type": "@id",
        "@isCollection": true,
      },
      account: {
        "@id": "did:ng:x:contact#account",
        "@type": "@id",
        "@isCollection": true,
      },
      sipAddress: {
        "@id": "did:ng:x:contact#sipAddress",
        "@type": "@id",
        "@isCollection": true,
      },
      extId: {
        "@id": "did:ng:x:contact#extId",
        "@type": "@id",
        "@isCollection": true,
      },
      fileAs: {
        "@id": "did:ng:x:contact#fileAs",
        "@type": "@id",
        "@isCollection": true,
      },
      calendarUrl: {
        "@id": "did:ng:x:contact#calendarUrl",
        "@type": "@id",
        "@isCollection": true,
      },
      clientData: {
        "@id": "did:ng:x:contact#clientData",
        "@type": "@id",
        "@isCollection": true,
      },
      userDefined: {
        "@id": "did:ng:x:contact#userDefined",
        "@type": "@id",
        "@isCollection": true,
      },
      membership: {
        "@id": "did:ng:x:contact#membership",
        "@type": "@id",
        "@isCollection": true,
      },
      tag: {
        "@id": "did:ng:x:contact#tag",
        "@type": "@id",
        "@isCollection": true,
      },
      contactImportGroup: {
        "@id": "did:ng:x:contact#contactImportGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      internalGroup: {
        "@id": "did:ng:x:contact#internalGroup",
        "@type": "@id",
        "@isCollection": true,
      },
      headline: {
        "@id": "did:ng:x:contact#headline",
        "@type": "@id",
        "@isCollection": true,
      },
      industry: {
        "@id": "did:ng:x:contact#industry",
        "@type": "@id",
        "@isCollection": true,
      },
      education: {
        "@id": "did:ng:x:contact#education",
        "@type": "@id",
        "@isCollection": true,
      },
      language: {
        "@id": "did:ng:x:contact#language",
        "@type": "@id",
        "@isCollection": true,
      },
      project: {
        "@id": "did:ng:x:contact#project",
        "@type": "@id",
        "@isCollection": true,
      },
      publication: {
        "@id": "did:ng:x:contact#publication",
        "@type": "@id",
        "@isCollection": true,
      },
      naoStatus: {
        "@id": "did:ng:x:contact#naoStatus",
        "@type": "@id",
      },
      invitedAt: {
        "@id": "did:ng:x:contact#invitedAt",
        "@type": "@id",
      },
      createdAt: {
        "@id": "did:ng:x:contact#createdAt",
        "@type": "@id",
      },
      updatedAt: {
        "@id": "did:ng:x:contact#updatedAt",
        "@type": "@id",
      },
      joinedAt: {
        "@id": "did:ng:x:contact#joinedAt",
        "@type": "@id",
      },
      mergedInto: {
        "@id": "did:ng:x:contact#mergedInto",
        "@type": "@id",
        "@isCollection": true,
      },
      mergedFrom: {
        "@id": "did:ng:x:contact#mergedFrom",
        "@type": "@id",
        "@isCollection": true,
      },
      centralityScore: {
        "@id": "did:ng:x:contact#centralityScore",
        "@type": "http://www.w3.org/2001/XMLSchema#integer",
      },
    },
  },
  phoneNumber: {
    "@id": "did:ng:x:contact#phoneNumber",
    "@type": "@id",
    "@isCollection": true,
  },
  value: {
    "@id": "did:ng:x:core#value",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  type2: {
    "@id": "did:ng:x:core#type",
    "@isCollection": true,
  },
  home: "did:ng:k:contact:phoneNumber#home",
  work: "did:ng:k:contact:phoneNumber#work",
  mobile: "did:ng:k:contact:phoneNumber#mobile",
  homeFax: "did:ng:k:contact:phoneNumber#homeFax",
  workFax: "did:ng:k:contact:phoneNumber#workFax",
  otherFax: "did:ng:k:contact:phoneNumber#otherFax",
  pager: "did:ng:k:contact:phoneNumber#pager",
  workMobile: "did:ng:k:contact:phoneNumber#workMobile",
  workPager: "did:ng:k:contact:phoneNumber#workPager",
  main: "did:ng:k:contact:phoneNumber#main",
  googleVoice: "did:ng:k:contact:phoneNumber#googleVoice",
  callback: "did:ng:k:contact:phoneNumber#callback",
  car: "did:ng:k:contact:phoneNumber#car",
  companyMain: "did:ng:k:contact:phoneNumber#companyMain",
  isdn: "did:ng:k:contact:phoneNumber#isdn",
  radio: "did:ng:k:contact:phoneNumber#radio",
  telex: "did:ng:k:contact:phoneNumber#telex",
  ttyTdd: "did:ng:k:contact:phoneNumber#ttyTdd",
  assistant: "did:ng:k:contact:phoneNumber#assistant",
  mms: "did:ng:k:contact:phoneNumber#mms",
  other: "did:ng:k:contact:phoneNumber#other",
  source: {
    "@id": "did:ng:x:core#source",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hidden: {
    "@id": "did:ng:x:core#hidden",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  preferred: {
    "@id": "did:ng:x:contact#preferred",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  name: {
    "@id": "did:ng:x:contact#name",
    "@type": "@id",
    "@isCollection": true,
  },
  displayNameLastFirst: {
    "@id": "did:ng:x:contact#displayNameLastFirst",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  unstructuredName: {
    "@id": "did:ng:x:contact#unstructuredName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  familyName: {
    "@id": "did:ng:x:contact#familyName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  firstName: {
    "@id": "did:ng:x:contact#firstName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  maidenName: {
    "@id": "did:ng:x:contact#maidenName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  middleName: {
    "@id": "did:ng:x:contact#middleName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  honorificPrefix: {
    "@id": "did:ng:x:contact#honorificPrefix",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  honorificSuffix: {
    "@id": "did:ng:x:contact#honorificSuffix",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticFullName: {
    "@id": "did:ng:x:contact#phoneticFullName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticFamilyName: {
    "@id": "did:ng:x:contact#phoneticFamilyName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticGivenName: {
    "@id": "did:ng:x:contact#phoneticGivenName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticMiddleName: {
    "@id": "did:ng:x:contact#phoneticMiddleName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticHonorificPrefix: {
    "@id": "did:ng:x:contact#phoneticHonorificPrefix",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticHonorificSuffix: {
    "@id": "did:ng:x:contact#phoneticHonorificSuffix",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  selected: {
    "@id": "did:ng:x:core#selected",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  email: {
    "@id": "did:ng:x:contact#email",
    "@type": "@id",
    "@isCollection": true,
  },
  home2: "did:ng:k:contact:type#home",
  work2: "did:ng:k:contact:type#work",
  mobile2: "did:ng:k:contact:type#mobile",
  custom: "did:ng:k:contact:type#custom",
  other2: "did:ng:k:contact:type#other",
  displayName: {
    "@id": "did:ng:x:contact#displayName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  address: {
    "@id": "did:ng:x:contact#address",
    "@type": "@id",
    "@isCollection": true,
  },
  coordLat: {
    "@id": "did:ng:x:contact#coordLat",
    "@type": "http://www.w3.org/2001/XMLSchema#double",
  },
  coordLng: {
    "@id": "did:ng:x:contact#coordLng",
    "@type": "http://www.w3.org/2001/XMLSchema#double",
  },
  poBox: {
    "@id": "did:ng:x:contact#poBox",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  streetAddress: {
    "@id": "did:ng:x:contact#streetAddress",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  extendedAddress: {
    "@id": "did:ng:x:contact#extendedAddress",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  city: {
    "@id": "did:ng:x:contact#city",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  region: {
    "@id": "did:ng:x:contact#region",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  postalCode: {
    "@id": "did:ng:x:contact#postalCode",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  country: {
    "@id": "did:ng:x:contact#country",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  countryCode: {
    "@id": "did:ng:x:contact#countryCode",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  organization: {
    "@id": "did:ng:x:contact#organization",
    "@type": "@id",
    "@isCollection": true,
  },
  phoneticName: {
    "@id": "did:ng:x:contact#phoneticName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  phoneticNameStyle: {
    "@id": "did:ng:x:contact#phoneticNameStyle",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  department: {
    "@id": "did:ng:x:contact#department",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  position: {
    "@id": "did:ng:x:contact#position",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  jobDescription: {
    "@id": "did:ng:x:contact#jobDescription",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  symbol: {
    "@id": "did:ng:x:contact#symbol",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  domain: {
    "@id": "did:ng:x:contact#domain",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  location: {
    "@id": "did:ng:x:contact#location",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  costCenter: {
    "@id": "did:ng:x:contact#costCenter",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  fullTimeEquivalentMillipercent: {
    "@id": "did:ng:x:contact#fullTimeEquivalentMillipercent",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  business: "did:ng:k:org:type#business",
  school: "did:ng:k:org:type#school",
  work3: "did:ng:k:org:type#work",
  custom2: "did:ng:k:org:type#custom",
  other3: "did:ng:k:org:type#other",
  startDate: {
    "@id": "did:ng:x:core#startDate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  endDate: {
    "@id": "did:ng:x:core#endDate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  current: {
    "@id": "did:ng:x:contact#current",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  photo: {
    "@id": "did:ng:x:contact#photo",
    "@type": "@id",
    "@isCollection": true,
  },
  data: {
    "@id": "did:ng:x:contact#data",
    "@type": "http://www.w3.org/2001/XMLSchema#base64Binary",
  },
  coverPhoto: {
    "@id": "did:ng:x:contact#coverPhoto",
    "@type": "@id",
    "@isCollection": true,
  },
  url: {
    "@id": "did:ng:x:contact#url",
    "@type": "@id",
    "@isCollection": true,
  },
  homepage: "did:ng:k:link:type#homepage",
  sourceCode: "did:ng:k:link:type#sourceCode",
  blog: "did:ng:k:link:type#blog",
  documentation: "did:ng:k:link:type#documentation",
  profile: "did:ng:k:link:type#profile",
  home3: "did:ng:k:link:type#home",
  work4: "did:ng:k:link:type#work",
  appInstall: "did:ng:k:link:type#appInstall",
  linkedin: "did:ng:k:link:type#linkedin",
  ftp: "did:ng:k:link:type#ftp",
  custom3: "did:ng:k:link:type#custom",
  reservations: "did:ng:k:link:type#reservations",
  appInstallPage: "did:ng:k:link:type#appInstallPage",
  other4: "did:ng:k:link:type#other",
  birthday: {
    "@id": "did:ng:x:contact#birthday",
    "@type": "@id",
    "@isCollection": true,
  },
  valueDate: {
    "@id": "did:ng:x:core#valueDate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  biography: {
    "@id": "did:ng:x:contact#biography",
    "@type": "@id",
    "@isCollection": true,
  },
  contentType: {
    "@id": "did:ng:x:contact#contentType",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  event: {
    "@id": "did:ng:x:contact#event",
    "@type": "@id",
    "@isCollection": true,
  },
  anniversary: "did:ng:k:event#anniversary",
  party: "did:ng:k:event#party",
  birthday2: "did:ng:k:event#birthday",
  custom4: "did:ng:k:event#custom",
  other5: "did:ng:k:event#other",
  gender: {
    "@id": "did:ng:x:contact#gender",
    "@type": "@id",
    "@isCollection": true,
  },
  valueIRI: {
    "@id": "did:ng:x:core#valueIRI",
    "@isCollection": true,
  },
  male: "did:ng:k:gender#male",
  female: "did:ng:k:gender#female",
  other6: "did:ng:k:gender#other",
  unknown: "did:ng:k:gender#unknown",
  none: "did:ng:k:gender#none",
  addressMeAs: {
    "@id": "did:ng:x:contact#addressMeAs",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  nickname: {
    "@id": "did:ng:x:contact#nickname",
    "@type": "@id",
    "@isCollection": true,
  },
  default: "did:ng:k:contact:nickname#default",
  initials: "did:ng:k:contact:nickname#initials",
  otherName: "did:ng:k:contact:nickname#otherName",
  shortName: "did:ng:k:contact:nickname#shortName",
  maidenName2: "did:ng:k:contact:nickname#maidenName",
  alternateName: "did:ng:k:contact:nickname#alternateName",
  occupation: {
    "@id": "did:ng:x:contact#occupation",
    "@type": "@id",
    "@isCollection": true,
  },
  relation: {
    "@id": "did:ng:x:contact#relation",
    "@type": "@id",
    "@isCollection": true,
  },
  spouse: "did:ng:k:humanRelationship#spouse",
  child: "did:ng:k:humanRelationship#child",
  parent: "did:ng:k:humanRelationship#parent",
  sibling: "did:ng:k:humanRelationship#sibling",
  friend: "did:ng:k:humanRelationship#friend",
  colleague: "did:ng:k:humanRelationship#colleague",
  manager: "did:ng:k:humanRelationship#manager",
  assistant2: "did:ng:k:humanRelationship#assistant",
  brother: "did:ng:k:humanRelationship#brother",
  sister: "did:ng:k:humanRelationship#sister",
  father: "did:ng:k:humanRelationship#father",
  mother: "did:ng:k:humanRelationship#mother",
  domesticPartner: "did:ng:k:humanRelationship#domesticPartner",
  partner: "did:ng:k:humanRelationship#partner",
  referredBy: "did:ng:k:humanRelationship#referredBy",
  relative: "did:ng:k:humanRelationship#relative",
  other7: "did:ng:k:humanRelationship#other",
  interest: {
    "@id": "did:ng:x:contact#interest",
    "@type": "@id",
    "@isCollection": true,
  },
  skill: {
    "@id": "did:ng:x:contact#skill",
    "@type": "@id",
    "@isCollection": true,
  },
  locationDescriptor: {
    "@id": "did:ng:x:contact#locationDescriptor",
    "@type": "@id",
    "@isCollection": true,
  },
  buildingId: {
    "@id": "did:ng:x:contact#buildingId",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  floor: {
    "@id": "did:ng:x:contact#floor",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  floorSection: {
    "@id": "did:ng:x:contact#floorSection",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  deskCode: {
    "@id": "did:ng:x:contact#deskCode",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  locale: {
    "@id": "did:ng:x:contact#locale",
    "@type": "@id",
    "@isCollection": true,
  },
  account: {
    "@id": "did:ng:x:contact#account",
    "@type": "@id",
    "@isCollection": true,
  },
  protocol: {
    "@id": "did:ng:x:contact#protocol",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  server: {
    "@id": "did:ng:x:contact#server",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  sipAddress: {
    "@id": "did:ng:x:contact#sipAddress",
    "@type": "@id",
    "@isCollection": true,
  },
  home4: "did:ng:k:contact:sip#home",
  work5: "did:ng:k:contact:sip#work",
  mobile3: "did:ng:k:contact:sip#mobile",
  other8: "did:ng:k:contact:sip#other",
  extId: {
    "@id": "did:ng:x:contact#extId",
    "@type": "@id",
    "@isCollection": true,
  },
  fileAs: {
    "@id": "did:ng:x:contact#fileAs",
    "@type": "@id",
    "@isCollection": true,
  },
  calendarUrl: {
    "@id": "did:ng:x:contact#calendarUrl",
    "@type": "@id",
    "@isCollection": true,
  },
  home5: "did:ng:k:calendar:type#home",
  availability: "did:ng:k:calendar:type#availability",
  work6: "did:ng:k:calendar:type#work",
  clientData: {
    "@id": "did:ng:x:contact#clientData",
    "@type": "@id",
    "@isCollection": true,
  },
  key: {
    "@id": "did:ng:x:contact#key",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  userDefined: {
    "@id": "did:ng:x:contact#userDefined",
    "@type": "@id",
    "@isCollection": true,
  },
  membership: {
    "@id": "did:ng:x:contact#membership",
    "@type": "@id",
    "@isCollection": true,
  },
  contactGroupResourceNameMembership: {
    "@id": "did:ng:x:contact#contactGroupResourceNameMembership",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  inViewerDomainMembership: {
    "@id": "did:ng:x:contact#inViewerDomainMembership",
    "@type": "http://www.w3.org/2001/XMLSchema#boolean",
  },
  tag: {
    "@id": "did:ng:x:contact#tag",
    "@type": "@id",
    "@isCollection": true,
  },
  ai: "did:ng:k:contact:tag#ai",
  technology: "did:ng:k:contact:tag#technology",
  leadership: "did:ng:k:contact:tag#leadership",
  design: "did:ng:k:contact:tag#design",
  creative: "did:ng:k:contact:tag#creative",
  branding: "did:ng:k:contact:tag#branding",
  humaneTech: "did:ng:k:contact:tag#humaneTech",
  ethics: "did:ng:k:contact:tag#ethics",
  networking: "did:ng:k:contact:tag#networking",
  golang: "did:ng:k:contact:tag#golang",
  infrastructure: "did:ng:k:contact:tag#infrastructure",
  blockchain: "did:ng:k:contact:tag#blockchain",
  protocols: "did:ng:k:contact:tag#protocols",
  p2p: "did:ng:k:contact:tag#p2p",
  entrepreneur: "did:ng:k:contact:tag#entrepreneur",
  climate: "did:ng:k:contact:tag#climate",
  agriculture: "did:ng:k:contact:tag#agriculture",
  socialImpact: "did:ng:k:contact:tag#socialImpact",
  investing: "did:ng:k:contact:tag#investing",
  ventures: "did:ng:k:contact:tag#ventures",
  identity: "did:ng:k:contact:tag#identity",
  trust: "did:ng:k:contact:tag#trust",
  digitalCredentials: "did:ng:k:contact:tag#digitalCredentials",
  crypto: "did:ng:k:contact:tag#crypto",
  organizations: "did:ng:k:contact:tag#organizations",
  transformation: "did:ng:k:contact:tag#transformation",
  author: "did:ng:k:contact:tag#author",
  cognition: "did:ng:k:contact:tag#cognition",
  research: "did:ng:k:contact:tag#research",
  futurism: "did:ng:k:contact:tag#futurism",
  writing: "did:ng:k:contact:tag#writing",
  ventureCapital: "did:ng:k:contact:tag#ventureCapital",
  deepTech: "did:ng:k:contact:tag#deepTech",
  startups: "did:ng:k:contact:tag#startups",
  sustainability: "did:ng:k:contact:tag#sustainability",
  environment: "did:ng:k:contact:tag#environment",
  healthcare: "did:ng:k:contact:tag#healthcare",
  policy: "did:ng:k:contact:tag#policy",
  medicare: "did:ng:k:contact:tag#medicare",
  education: "did:ng:k:contact:tag#education",
  careerDevelopment: "did:ng:k:contact:tag#careerDevelopment",
  openai: "did:ng:k:contact:tag#openai",
  decentralized: "did:ng:k:contact:tag#decentralized",
  database: "did:ng:k:contact:tag#database",
  forestry: "did:ng:k:contact:tag#forestry",
  biotech: "did:ng:k:contact:tag#biotech",
  mrna: "did:ng:k:contact:tag#mrna",
  vaccines: "did:ng:k:contact:tag#vaccines",
  fintech: "did:ng:k:contact:tag#fintech",
  product: "did:ng:k:contact:tag#product",
  ux: "did:ng:k:contact:tag#ux",
  contactImportGroup: {
    "@id": "did:ng:x:contact#contactImportGroup",
    "@type": "@id",
    "@isCollection": true,
  },
  internalGroup: {
    "@id": "did:ng:x:contact#internalGroup",
    "@type": "@id",
    "@isCollection": true,
  },
  headline: {
    "@id": "did:ng:x:contact#headline",
    "@type": "@id",
    "@isCollection": true,
  },
  industry: {
    "@id": "did:ng:x:contact#industry",
    "@type": "@id",
    "@isCollection": true,
  },
  education2: {
    "@id": "did:ng:x:contact#education",
    "@type": "@id",
    "@isCollection": true,
  },
  notes: {
    "@id": "did:ng:x:contact#notes",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  degreeName: {
    "@id": "did:ng:x:contact#degreeName",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  activities: {
    "@id": "did:ng:x:contact#activities",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  language: {
    "@id": "did:ng:x:contact#language",
    "@type": "@id",
    "@isCollection": true,
  },
  proficiency: {
    "@id": "did:ng:x:contact#proficiency",
    "@isCollection": true,
  },
  elementary: "did:ng:k:skills:language:proficiency#elementary",
  limitedWork: "did:ng:k:skills:language:proficiency#limitedWork",
  professionalWork: "did:ng:k:skills:language:proficiency#professionalWork",
  fullWork: "did:ng:k:skills:language:proficiency#fullWork",
  bilingual: "did:ng:k:skills:language:proficiency#bilingual",
  project: {
    "@id": "did:ng:x:contact#project",
    "@type": "@id",
    "@isCollection": true,
  },
  description: {
    "@id": "did:ng:x:core#description",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  url1: {
    "@id": "did:ng:x:core#url1",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  publication: {
    "@id": "did:ng:x:contact#publication",
    "@type": "@id",
    "@isCollection": true,
  },
  publishDate: {
    "@id": "did:ng:x:core#publishDate",
    "@type": "http://www.w3.org/2001/XMLSchema#date",
  },
  publisher: {
    "@id": "did:ng:x:contact#publisher",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  naoStatus: {
    "@id": "did:ng:x:contact#naoStatus",
    "@type": "@id",
  },
  invitedAt: {
    "@id": "did:ng:x:contact#invitedAt",
    "@type": "@id",
  },
  valueDateTime: {
    "@id": "did:ng:x:core#valueDateTime",
    "@type": "http://www.w3.org/2001/XMLSchema#dateTime",
  },
  createdAt: {
    "@id": "did:ng:x:contact#createdAt",
    "@type": "@id",
  },
  updatedAt: {
    "@id": "did:ng:x:contact#updatedAt",
    "@type": "@id",
  },
  joinedAt: {
    "@id": "did:ng:x:contact#joinedAt",
    "@type": "@id",
  },
  mergedInto: {
    "@id": "did:ng:x:contact#mergedInto",
    "@type": "@id",
    "@isCollection": true,
  },
  mergedFrom: {
    "@id": "did:ng:x:contact#mergedFrom",
    "@type": "@id",
    "@isCollection": true,
  },
  centralityScore: {
    "@id": "did:ng:x:contact#centralityScore",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
};
