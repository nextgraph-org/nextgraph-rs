import { LdoJsonldContext } from "@ldo/ldo";

/**
 * =============================================================================
 * solidProfileContext: JSONLD Context for solidProfile
 * =============================================================================
 */
export const solidProfileContext: LdoJsonldContext = {
  type: {
    "@id": "@type",
  },
  Person: {
    "@id": "http://schema.org/Person",
    "@context": {
      type: {
        "@id": "@type",
      },
      fn: {
        "@id": "http://www.w3.org/2006/vcard/ns#fn",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name: {
        "@id": "http://xmlns.com/foaf/0.1/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasAddress: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
        "@type": "@id",
        "@isCollection": true,
      },
      hasEmail: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
        "@type": "@id",
        "@isCollection": true,
      },
      hasPhoto: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
        "@type": "@id",
      },
      img: {
        "@id": "http://xmlns.com/foaf/0.1/img",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasTelephone: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
        "@type": "@id",
        "@isCollection": true,
      },
      phone: {
        "@id": "http://www.w3.org/2006/vcard/ns#phone",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      organizationName: {
        "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      role: {
        "@id": "http://www.w3.org/2006/vcard/ns#role",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      trustedApp: {
        "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
        "@type": "@id",
        "@isCollection": true,
      },
      key: {
        "@id": "http://www.w3.org/ns/auth/cert#key",
        "@type": "@id",
        "@isCollection": true,
      },
      inbox: {
        "@id": "http://www.w3.org/ns/ldp#inbox",
        "@type": "@id",
      },
      preferencesFile: {
        "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
        "@type": "@id",
      },
      storage: {
        "@id": "http://www.w3.org/ns/pim/space#storage",
        "@type": "@id",
        "@isCollection": true,
      },
      account: {
        "@id": "http://www.w3.org/ns/solid/terms#account",
        "@type": "@id",
      },
      privateTypeIndex: {
        "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
        "@type": "@id",
        "@isCollection": true,
      },
      publicTypeIndex: {
        "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
        "@type": "@id",
        "@isCollection": true,
      },
      knows: {
        "@id": "http://xmlns.com/foaf/0.1/knows",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  Person2: {
    "@id": "http://xmlns.com/foaf/0.1/Person",
    "@context": {
      type: {
        "@id": "@type",
      },
      fn: {
        "@id": "http://www.w3.org/2006/vcard/ns#fn",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      name: {
        "@id": "http://xmlns.com/foaf/0.1/name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasAddress: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
        "@type": "@id",
        "@isCollection": true,
      },
      hasEmail: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
        "@type": "@id",
        "@isCollection": true,
      },
      hasPhoto: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
        "@type": "@id",
      },
      img: {
        "@id": "http://xmlns.com/foaf/0.1/img",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      hasTelephone: {
        "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
        "@type": "@id",
        "@isCollection": true,
      },
      phone: {
        "@id": "http://www.w3.org/2006/vcard/ns#phone",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      organizationName: {
        "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      role: {
        "@id": "http://www.w3.org/2006/vcard/ns#role",
        "@type": "http://www.w3.org/2001/XMLSchema#string",
      },
      trustedApp: {
        "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
        "@type": "@id",
        "@isCollection": true,
      },
      key: {
        "@id": "http://www.w3.org/ns/auth/cert#key",
        "@type": "@id",
        "@isCollection": true,
      },
      inbox: {
        "@id": "http://www.w3.org/ns/ldp#inbox",
        "@type": "@id",
      },
      preferencesFile: {
        "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
        "@type": "@id",
      },
      storage: {
        "@id": "http://www.w3.org/ns/pim/space#storage",
        "@type": "@id",
        "@isCollection": true,
      },
      account: {
        "@id": "http://www.w3.org/ns/solid/terms#account",
        "@type": "@id",
      },
      privateTypeIndex: {
        "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
        "@type": "@id",
        "@isCollection": true,
      },
      publicTypeIndex: {
        "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
        "@type": "@id",
        "@isCollection": true,
      },
      knows: {
        "@id": "http://xmlns.com/foaf/0.1/knows",
        "@type": "@id",
        "@isCollection": true,
      },
    },
  },
  fn: {
    "@id": "http://www.w3.org/2006/vcard/ns#fn",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  name: {
    "@id": "http://xmlns.com/foaf/0.1/name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasAddress: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasAddress",
    "@type": "@id",
    "@isCollection": true,
  },
  countryName: {
    "@id": "http://www.w3.org/2006/vcard/ns#country-name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  locality: {
    "@id": "http://www.w3.org/2006/vcard/ns#locality",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  postalCode: {
    "@id": "http://www.w3.org/2006/vcard/ns#postal-code",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  region: {
    "@id": "http://www.w3.org/2006/vcard/ns#region",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  streetAddress: {
    "@id": "http://www.w3.org/2006/vcard/ns#street-address",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasEmail: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
    "@type": "@id",
    "@isCollection": true,
  },
  Dom: {
    "@id": "http://www.w3.org/2006/vcard/ns#Dom",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Home: {
    "@id": "http://www.w3.org/2006/vcard/ns#Home",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  ISDN: {
    "@id": "http://www.w3.org/2006/vcard/ns#ISDN",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Internet: {
    "@id": "http://www.w3.org/2006/vcard/ns#Internet",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Intl: {
    "@id": "http://www.w3.org/2006/vcard/ns#Intl",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Label: {
    "@id": "http://www.w3.org/2006/vcard/ns#Label",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Parcel: {
    "@id": "http://www.w3.org/2006/vcard/ns#Parcel",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Postal: {
    "@id": "http://www.w3.org/2006/vcard/ns#Postal",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Pref: {
    "@id": "http://www.w3.org/2006/vcard/ns#Pref",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  Work: {
    "@id": "http://www.w3.org/2006/vcard/ns#Work",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  X400: {
    "@id": "http://www.w3.org/2006/vcard/ns#X400",
    "@context": {
      type: {
        "@id": "@type",
      },
      value: {
        "@id": "http://www.w3.org/2006/vcard/ns#value",
        "@type": "@id",
      },
    },
  },
  value: {
    "@id": "http://www.w3.org/2006/vcard/ns#value",
    "@type": "@id",
  },
  hasPhoto: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
    "@type": "@id",
  },
  img: {
    "@id": "http://xmlns.com/foaf/0.1/img",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasTelephone: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
    "@type": "@id",
    "@isCollection": true,
  },
  phone: {
    "@id": "http://www.w3.org/2006/vcard/ns#phone",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  organizationName: {
    "@id": "http://www.w3.org/2006/vcard/ns#organization-name",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  role: {
    "@id": "http://www.w3.org/2006/vcard/ns#role",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  trustedApp: {
    "@id": "http://www.w3.org/ns/auth/acl#trustedApp",
    "@type": "@id",
    "@isCollection": true,
  },
  mode: {
    "@id": "http://www.w3.org/ns/auth/acl#mode",
    "@isCollection": true,
  },
  Append: "http://www.w3.org/ns/auth/acl#Append",
  Control: "http://www.w3.org/ns/auth/acl#Control",
  Read: "http://www.w3.org/ns/auth/acl#Read",
  Write: "http://www.w3.org/ns/auth/acl#Write",
  origin: {
    "@id": "http://www.w3.org/ns/auth/acl#origin",
    "@type": "@id",
  },
  key: {
    "@id": "http://www.w3.org/ns/auth/cert#key",
    "@type": "@id",
    "@isCollection": true,
  },
  modulus: {
    "@id": "http://www.w3.org/ns/auth/cert#modulus",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  exponent: {
    "@id": "http://www.w3.org/ns/auth/cert#exponent",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  inbox: {
    "@id": "http://www.w3.org/ns/ldp#inbox",
    "@type": "@id",
  },
  preferencesFile: {
    "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
    "@type": "@id",
  },
  storage: {
    "@id": "http://www.w3.org/ns/pim/space#storage",
    "@type": "@id",
    "@isCollection": true,
  },
  account: {
    "@id": "http://www.w3.org/ns/solid/terms#account",
    "@type": "@id",
  },
  privateTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
    "@type": "@id",
    "@isCollection": true,
  },
  publicTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
    "@type": "@id",
    "@isCollection": true,
  },
  knows: {
    "@id": "http://xmlns.com/foaf/0.1/knows",
    "@type": "@id",
    "@isCollection": true,
  },
};
