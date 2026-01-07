import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * shortcontactSchema: Schema for shortcontact
 * =============================================================================
 */
export const shortcontactSchema: Schema = {
  "did:ng:x:contact:class#ShortSocialContact": {
    iri: "did:ng:x:contact:class#ShortSocialContact",
    predicates: [
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["http://www.w3.org/2006/vcard/ns#Individual"],
          },
          {
            valType: "literal",
            literals: ["did:ng:x:contact:class#Me"],
          },
        ],
        maxCardinality: -1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#name",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#name",
        readablePredicate: "name",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#address",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#address",
        readablePredicate: "address",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#photo",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#photo",
        readablePredicate: "photo",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#naoStatus",
        readablePredicate: "naoStatus",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#centralityScore",
        readablePredicate: "centralityScore",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#mostRecentInteraction",
        readablePredicate: "mostRecentInteraction",
      },
    ],
  },
  "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#name": {
    iri: "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#name",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#displayNameLastFirst",
        readablePredicate: "displayNameLastFirst",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#unstructuredName",
        readablePredicate: "unstructuredName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#familyName",
        readablePredicate: "familyName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#firstName",
        readablePredicate: "firstName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#maidenName",
        readablePredicate: "maidenName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#middleName",
        readablePredicate: "middleName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#honorificPrefix",
        readablePredicate: "honorificPrefix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#honorificSuffix",
        readablePredicate: "honorificSuffix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticFullName",
        readablePredicate: "phoneticFullName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticFamilyName",
        readablePredicate: "phoneticFamilyName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticGivenName",
        readablePredicate: "phoneticGivenName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticMiddleName",
        readablePredicate: "phoneticMiddleName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticHonorificPrefix",
        readablePredicate: "phoneticHonorificPrefix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticHonorificSuffix",
        readablePredicate: "phoneticHonorificSuffix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#selected",
        readablePredicate: "selected",
      },
    ],
  },
  "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#address": {
    iri: "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#address",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#other"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#coordLat",
        readablePredicate: "coordLat",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#coordLng",
        readablePredicate: "coordLng",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#poBox",
        readablePredicate: "poBox",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#streetAddress",
        readablePredicate: "streetAddress",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#extendedAddress",
        readablePredicate: "extendedAddress",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#city",
        readablePredicate: "city",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#region",
        readablePredicate: "region",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#postalCode",
        readablePredicate: "postalCode",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#country",
        readablePredicate: "country",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#countryCode",
        readablePredicate: "countryCode",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#hidden",
        readablePredicate: "hidden",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#preferred",
        readablePredicate: "preferred",
      },
    ],
  },
  "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#photo": {
    iri: "did:ng:x:contact:class#ShortSocialContact||did:ng:x:contact#photo",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#photoUrl",
        readablePredicate: "photoUrl",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#photoIRI",
        readablePredicate: "photoIRI",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#preferred",
        readablePredicate: "preferred",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#hidden",
        readablePredicate: "hidden",
      },
    ],
  },
  "did:ng:x:contact:class#Name": {
    iri: "did:ng:x:contact:class#Name",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#displayNameLastFirst",
        readablePredicate: "displayNameLastFirst",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#unstructuredName",
        readablePredicate: "unstructuredName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#familyName",
        readablePredicate: "familyName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#firstName",
        readablePredicate: "firstName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#maidenName",
        readablePredicate: "maidenName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#middleName",
        readablePredicate: "middleName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#honorificPrefix",
        readablePredicate: "honorificPrefix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#honorificSuffix",
        readablePredicate: "honorificSuffix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticFullName",
        readablePredicate: "phoneticFullName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticFamilyName",
        readablePredicate: "phoneticFamilyName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticGivenName",
        readablePredicate: "phoneticGivenName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticMiddleName",
        readablePredicate: "phoneticMiddleName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticHonorificPrefix",
        readablePredicate: "phoneticHonorificPrefix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticHonorificSuffix",
        readablePredicate: "phoneticHonorificSuffix",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#selected",
        readablePredicate: "selected",
      },
    ],
  },
  "did:ng:x:contact:class#Photo": {
    iri: "did:ng:x:contact:class#Photo",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#photoUrl",
        readablePredicate: "photoUrl",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#photoIRI",
        readablePredicate: "photoIRI",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#preferred",
        readablePredicate: "preferred",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#hidden",
        readablePredicate: "hidden",
      },
    ],
  },
  "did:ng:x:contact:class#Address": {
    iri: "did:ng:x:contact:class#Address",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "literal",
            literals: ["did:ng:k:contact:type#other"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#coordLat",
        readablePredicate: "coordLat",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#coordLng",
        readablePredicate: "coordLng",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#poBox",
        readablePredicate: "poBox",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#streetAddress",
        readablePredicate: "streetAddress",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#extendedAddress",
        readablePredicate: "extendedAddress",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#city",
        readablePredicate: "city",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#region",
        readablePredicate: "region",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#postalCode",
        readablePredicate: "postalCode",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#country",
        readablePredicate: "country",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#countryCode",
        readablePredicate: "countryCode",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#source",
        readablePredicate: "source",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#hidden",
        readablePredicate: "hidden",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#preferred",
        readablePredicate: "preferred",
      },
    ],
  },
};
