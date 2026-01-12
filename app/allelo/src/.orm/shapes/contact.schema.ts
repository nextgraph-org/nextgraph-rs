import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * contactSchema: Schema for contact
 * =============================================================================
 */
export const contactSchema: Schema = {
  "did:ng:x:contact:class#SocialContact": {
    iri: "did:ng:x:contact:class#SocialContact",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["http://www.w3.org/2006/vcard/ns#Individual"],
          },
          {
            valType: "iri",
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
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#phoneNumber",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneNumber",
        readablePredicate: "phoneNumber",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name",
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
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#email",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#email",
        readablePredicate: "email",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#address",
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
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#organization",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#organization",
        readablePredicate: "organization",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#photo",
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
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#coverPhoto",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#coverPhoto",
        readablePredicate: "coverPhoto",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#url",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#url",
        readablePredicate: "url",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#birthday",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#birthday",
        readablePredicate: "birthday",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#biography",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#biography",
        readablePredicate: "biography",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#event",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#event",
        readablePredicate: "event",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#gender",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#gender",
        readablePredicate: "gender",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#nickname",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#nickname",
        readablePredicate: "nickname",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#occupation",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#occupation",
        readablePredicate: "occupation",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#relation",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#relation",
        readablePredicate: "relation",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#interest",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#interest",
        readablePredicate: "interest",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#skill",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#skill",
        readablePredicate: "skill",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locationDescriptor",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#locationDescriptor",
        readablePredicate: "locationDescriptor",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locale",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#locale",
        readablePredicate: "locale",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#account",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#account",
        readablePredicate: "account",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#sipAddress",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#sipAddress",
        readablePredicate: "sipAddress",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#extId",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#extId",
        readablePredicate: "extId",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#fileAs",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#fileAs",
        readablePredicate: "fileAs",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#calendarUrl",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#calendarUrl",
        readablePredicate: "calendarUrl",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#clientData",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#clientData",
        readablePredicate: "clientData",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#userDefined",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#userDefined",
        readablePredicate: "userDefined",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#membership",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#membership",
        readablePredicate: "membership",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#tag",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#tag",
        readablePredicate: "tag",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#contactImportGroup",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#contactImportGroup",
        readablePredicate: "contactImportGroup",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#headline",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#headline",
        readablePredicate: "headline",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#industry",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#industry",
        readablePredicate: "industry",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#education",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#education",
        readablePredicate: "education",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#language",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#language",
        readablePredicate: "language",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#project",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#project",
        readablePredicate: "project",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#publication",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#publication",
        readablePredicate: "publication",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#rcard",
        readablePredicate: "rcard",
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
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#invitedAt",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#invitedAt",
        readablePredicate: "invitedAt",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#createdAt",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#createdAt",
        readablePredicate: "createdAt",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#updatedAt",
        readablePredicate: "updatedAt",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:contact:class#SocialContact||did:ng:x:contact#joinedAt",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#joinedAt",
        readablePredicate: "joinedAt",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#mergedInto",
        readablePredicate: "mergedInto",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:contact#mergedFrom",
        readablePredicate: "mergedFrom",
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
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#isDraft",
        readablePredicate: "isDraft",
      },
    ],
  },
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#phoneNumber": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#phoneNumber",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#homeFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#otherFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#pager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workMobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workPager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#main"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#googleVoice"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#callback"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#car"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#companyMain"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#isdn"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#radio"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#telex"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#ttyTdd"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#assistant"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#mms"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#other"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#name",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#email": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#email",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "iri",
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#displayName",
        readablePredicate: "displayName",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#address": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#address",
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
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "iri",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#organization": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#organization",
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
        iri: "did:ng:x:contact#phoneticName",
        readablePredicate: "phoneticName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticNameStyle",
        readablePredicate: "phoneticNameStyle",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#department",
        readablePredicate: "department",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#position",
        readablePredicate: "position",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#jobDescription",
        readablePredicate: "jobDescription",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#symbol",
        readablePredicate: "symbol",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#domain",
        readablePredicate: "domain",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#location",
        readablePredicate: "location",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#costCenter",
        readablePredicate: "costCenter",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#fullTimeEquivalentMillipercent",
        readablePredicate: "fullTimeEquivalentMillipercent",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#business"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#school"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#school"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#other"],
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#current",
        readablePredicate: "current",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#photo": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#photo",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#coverPhoto": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#coverPhoto",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#url": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#url",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#homepage"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#sourceCode"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#blog"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#documentation"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#profile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#appInstall"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#linkedin"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#ftp"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#reservations"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#appInstallPage"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#other"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#birthday": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#birthday",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDate",
        readablePredicate: "valueDate",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#biography": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#biography",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:contact#contentType",
        readablePredicate: "contentType",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#event": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#event",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:event#anniversary"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#party"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#birthday"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#other"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#gender": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#gender",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:gender#male"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#female"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#other"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#unknown"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#none"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#addressMeAs",
        readablePredicate: "addressMeAs",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#nickname": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#nickname",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#default"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#initials"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#otherName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#shortName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#maidenName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#alternateName"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#occupation": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#occupation",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#relation": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#relation",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#spouse"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#child"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#parent"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#sibling"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#friend"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#colleague"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#manager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#assistant"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#brother"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#sister"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#father"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#mother"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#domesticPartner"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#partner"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#referredBy"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#relative"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#other"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#interest": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#interest",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#skill": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#skill",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locationDescriptor": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locationDescriptor",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#current",
        readablePredicate: "current",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#buildingId",
        readablePredicate: "buildingId",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#floor",
        readablePredicate: "floor",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#floorSection",
        readablePredicate: "floorSection",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#deskCode",
        readablePredicate: "deskCode",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locale": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#locale",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#account": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#account",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#protocol",
        readablePredicate: "protocol",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#server",
        readablePredicate: "server",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#sipAddress": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#sipAddress",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#other"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#extId": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#extId",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#fileAs": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#fileAs",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#calendarUrl": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#calendarUrl",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#availability"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#work"],
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#clientData": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#clientData",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#key",
        readablePredicate: "key",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#userDefined": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#userDefined",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#key",
        readablePredicate: "key",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#membership": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#membership",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#contactGroupResourceNameMembership",
        readablePredicate: "contactGroupResourceNameMembership",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#inViewerDomainMembership",
        readablePredicate: "inViewerDomainMembership",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#tag": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#tag",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ai"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#technology"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#leadership"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#design"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#creative"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#branding"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#humaneTech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ethics"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#networking"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#golang"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#infrastructure"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#blockchain"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#protocols"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#p2p"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#entrepreneur"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#climate"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#agriculture"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#socialImpact"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#investing"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ventures"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#identity"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#trust"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#digitalCredentials"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#crypto"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#organizations"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#transformation"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#author"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#cognition"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#research"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#futurism"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#writing"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ventureCapital"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#deepTech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#startups"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#sustainability"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#environment"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#healthcare"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#policy"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#medicare"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#education"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#careerDevelopment"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#openai"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#decentralized"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#database"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#forestry"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#biotech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#mrna"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#vaccines"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#fintech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#product"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ux"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "string",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#contactImportGroup": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#contactImportGroup",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:contact#name",
        readablePredicate: "name",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#headline": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#headline",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#industry": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#industry",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#education": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#education",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#notes",
        readablePredicate: "notes",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#degreeName",
        readablePredicate: "degreeName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#activities",
        readablePredicate: "activities",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#language": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#language",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#elementary"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#limitedWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#professionalWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#fullWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#bilingual"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#proficiency",
        readablePredicate: "proficiency",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#project": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#project",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#url",
        readablePredicate: "url",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#publication": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#publication",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#publishDate",
        readablePredicate: "publishDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#publisher",
        readablePredicate: "publisher",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#url",
        readablePredicate: "url",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#invitedAt": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#invitedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#createdAt": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#createdAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#updatedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#SocialContact||did:ng:x:contact#joinedAt": {
    iri: "did:ng:x:contact:class#SocialContact||did:ng:x:contact#joinedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#PhoneNumber": {
    iri: "did:ng:x:contact:class#PhoneNumber",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#homeFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#otherFax"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#pager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workMobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#workPager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#main"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#googleVoice"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#callback"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#car"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#companyMain"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#isdn"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#radio"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#telex"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#ttyTdd"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#assistant"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#mms"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:phoneNumber#other"],
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
  "did:ng:x:contact:class#Email": {
    iri: "did:ng:x:contact:class#Email",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "iri",
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#displayName",
        readablePredicate: "displayName",
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
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#custom"],
          },
          {
            valType: "iri",
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
  "did:ng:x:contact:class#Organization": {
    iri: "did:ng:x:contact:class#Organization",
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
        iri: "did:ng:x:contact#phoneticName",
        readablePredicate: "phoneticName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#phoneticNameStyle",
        readablePredicate: "phoneticNameStyle",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#department",
        readablePredicate: "department",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#position",
        readablePredicate: "position",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#jobDescription",
        readablePredicate: "jobDescription",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#symbol",
        readablePredicate: "symbol",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#domain",
        readablePredicate: "domain",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#location",
        readablePredicate: "location",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#costCenter",
        readablePredicate: "costCenter",
      },
      {
        dataTypes: [
          {
            valType: "number",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#fullTimeEquivalentMillipercent",
        readablePredicate: "fullTimeEquivalentMillipercent",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#business"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#school"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#school"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:org:type#other"],
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#current",
        readablePredicate: "current",
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
  "did:ng:x:contact:class#CoverPhoto": {
    iri: "did:ng:x:contact:class#CoverPhoto",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
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
  "did:ng:x:contact:class#Url": {
    iri: "did:ng:x:contact:class#Url",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#homepage"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#sourceCode"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#blog"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#documentation"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#profile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#appInstall"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#linkedin"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#ftp"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#reservations"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#appInstallPage"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:link:type#other"],
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
  "did:ng:x:contact:class#Birthday": {
    iri: "did:ng:x:contact:class#Birthday",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDate",
        readablePredicate: "valueDate",
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
  "did:ng:x:contact:class#Biography": {
    iri: "did:ng:x:contact:class#Biography",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:contact#contentType",
        readablePredicate: "contentType",
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
  "did:ng:x:contact:class#Event": {
    iri: "did:ng:x:contact:class#Event",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:event#anniversary"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#party"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#birthday"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#custom"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:event#other"],
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
  "did:ng:x:contact:class#Gender": {
    iri: "did:ng:x:contact:class#Gender",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:gender#male"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#female"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#other"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#unknown"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:gender#none"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#addressMeAs",
        readablePredicate: "addressMeAs",
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
  "did:ng:x:contact:class#Nickname": {
    iri: "did:ng:x:contact:class#Nickname",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#default"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#initials"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#otherName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#shortName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#maidenName"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:nickname#alternateName"],
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
  "did:ng:x:contact:class#Occupation": {
    iri: "did:ng:x:contact:class#Occupation",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Relation": {
    iri: "did:ng:x:contact:class#Relation",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#spouse"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#child"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#parent"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#sibling"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#friend"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#colleague"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#manager"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#assistant"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#brother"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#sister"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#father"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#mother"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#domesticPartner"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#partner"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#referredBy"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#relative"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:humanRelationship#other"],
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
  "did:ng:x:contact:class#Interest": {
    iri: "did:ng:x:contact:class#Interest",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Skill": {
    iri: "did:ng:x:contact:class#Skill",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#LocationDescriptor": {
    iri: "did:ng:x:contact:class#LocationDescriptor",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#current",
        readablePredicate: "current",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#buildingId",
        readablePredicate: "buildingId",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#floor",
        readablePredicate: "floor",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#floorSection",
        readablePredicate: "floorSection",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#deskCode",
        readablePredicate: "deskCode",
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
  "did:ng:x:contact:class#Locale": {
    iri: "did:ng:x:contact:class#Locale",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Account": {
    iri: "did:ng:x:contact:class#Account",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:type#work"],
          },
          {
            valType: "iri",
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
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#protocol",
        readablePredicate: "protocol",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#server",
        readablePredicate: "server",
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
  "did:ng:x:contact:class#SipAddress": {
    iri: "did:ng:x:contact:class#SipAddress",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#work"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#mobile"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:sip#other"],
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
  "did:ng:x:contact:class#ExternalId": {
    iri: "did:ng:x:contact:class#ExternalId",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#type",
        readablePredicate: "type",
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
  "did:ng:x:contact:class#FileAs": {
    iri: "did:ng:x:contact:class#FileAs",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#CalendarUrl": {
    iri: "did:ng:x:contact:class#CalendarUrl",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#value",
        readablePredicate: "value",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#home"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#availability"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:calendar:type#work"],
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
  "did:ng:x:contact:class#ClientData": {
    iri: "did:ng:x:contact:class#ClientData",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#key",
        readablePredicate: "key",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#UserDefined": {
    iri: "did:ng:x:contact:class#UserDefined",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#key",
        readablePredicate: "key",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Membership": {
    iri: "did:ng:x:contact:class#Membership",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#contactGroupResourceNameMembership",
        readablePredicate: "contactGroupResourceNameMembership",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#inViewerDomainMembership",
        readablePredicate: "inViewerDomainMembership",
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
  "did:ng:x:contact:class#Tag": {
    iri: "did:ng:x:contact:class#Tag",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ai"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#technology"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#leadership"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#design"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#creative"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#branding"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#humaneTech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ethics"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#networking"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#golang"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#infrastructure"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#blockchain"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#protocols"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#p2p"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#entrepreneur"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#climate"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#agriculture"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#socialImpact"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#investing"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ventures"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#identity"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#trust"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#digitalCredentials"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#crypto"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#organizations"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#transformation"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#author"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#cognition"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#research"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#futurism"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#writing"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ventureCapital"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#deepTech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#startups"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#sustainability"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#environment"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#healthcare"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#policy"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#medicare"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#education"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#careerDevelopment"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#openai"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#decentralized"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#database"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#forestry"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#biotech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#mrna"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#vaccines"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#fintech"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#product"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:tag#ux"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "string",
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
  "did:ng:x:contact:class#ContactImportGroup": {
    iri: "did:ng:x:contact:class#ContactImportGroup",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:contact#name",
        readablePredicate: "name",
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
  "did:ng:x:contact:class#InvitedAt": {
    iri: "did:ng:x:contact:class#InvitedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#CreatedAt": {
    iri: "did:ng:x:contact:class#CreatedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#UpdatedAt": {
    iri: "did:ng:x:contact:class#UpdatedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#JoinedAt": {
    iri: "did:ng:x:contact:class#JoinedAt",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueDateTime",
        readablePredicate: "valueDateTime",
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
  "did:ng:x:contact:class#Headline": {
    iri: "did:ng:x:contact:class#Headline",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Industry": {
    iri: "did:ng:x:contact:class#Industry",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
  "did:ng:x:contact:class#Education": {
    iri: "did:ng:x:contact:class#Education",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#notes",
        readablePredicate: "notes",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#degreeName",
        readablePredicate: "degreeName",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#activities",
        readablePredicate: "activities",
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
  "did:ng:x:contact:class#Language": {
    iri: "did:ng:x:contact:class#Language",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:core#valueIRI",
        readablePredicate: "valueIRI",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#elementary"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#limitedWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#professionalWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#fullWork"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:skills:language:proficiency#bilingual"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#proficiency",
        readablePredicate: "proficiency",
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
  "did:ng:x:contact:class#Project": {
    iri: "did:ng:x:contact:class#Project",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#url",
        readablePredicate: "url",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#startDate",
        readablePredicate: "startDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#endDate",
        readablePredicate: "endDate",
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
  "did:ng:x:contact:class#Publication": {
    iri: "did:ng:x:contact:class#Publication",
    predicates: [
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
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
        iri: "did:ng:x:core#publishDate",
        readablePredicate: "publishDate",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#publisher",
        readablePredicate: "publisher",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:core#url",
        readablePredicate: "url",
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
};
