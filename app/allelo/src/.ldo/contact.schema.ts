import { Schema } from "shexj";

/**
 * =============================================================================
 * contactSchema: ShexJ Schema for contact
 * =============================================================================
 */
export const contactSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "did:ng:x:contact:class#SocialContact",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: ["http://www.w3.org/2006/vcard/ns#Individual"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines the node as an Individual (from vcard)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: ["http://schema.org/Person"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines the node as a Person (from Schema.org)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: ["http://xmlns.com/foaf/0.1/Person"],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Defines the node as a Person (from foaf)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneNumber",
              valueExpr: "did:ng:x:contact:class#PhoneNumber",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#name",
              valueExpr: "did:ng:x:contact:class#Name",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#email",
              valueExpr: "did:ng:x:contact:class#Email",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#address",
              valueExpr: "did:ng:x:contact:class#Address",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#organization",
              valueExpr: "did:ng:x:contact:class#Organization",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#photo",
              valueExpr: "did:ng:x:contact:class#Photo",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#coverPhoto",
              valueExpr: "did:ng:x:contact:class#CoverPhoto",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#url",
              valueExpr: "did:ng:x:contact:class#Url",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#birthday",
              valueExpr: "did:ng:x:contact:class#Birthday",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#biography",
              valueExpr: "did:ng:x:contact:class#Biography",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#event",
              valueExpr: "did:ng:x:contact:class#Event",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#gender",
              valueExpr: "did:ng:x:contact:class#Gender",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#nickname",
              valueExpr: "did:ng:x:contact:class#Nickname",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#occupation",
              valueExpr: "did:ng:x:contact:class#Occupation",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#relation",
              valueExpr: "did:ng:x:contact:class#Relation",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#interest",
              valueExpr: "did:ng:x:contact:class#Interest",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#skill",
              valueExpr: "did:ng:x:contact:class#Skill",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#locationDescriptor",
              valueExpr: "did:ng:x:contact:class#LocationDescriptor",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#locale",
              valueExpr: "did:ng:x:contact:class#Locale",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#account",
              valueExpr: "did:ng:x:contact:class#Account",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#sipAddress",
              valueExpr: "did:ng:x:contact:class#SipAddress",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#extId",
              valueExpr: "did:ng:x:contact:class#ExternalId",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#fileAs",
              valueExpr: "did:ng:x:contact:class#FileAs",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#calendarUrl",
              valueExpr: "did:ng:x:contact:class#CalendarUrl",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#clientData",
              valueExpr: "did:ng:x:contact:class#ClientData",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#userDefined",
              valueExpr: "did:ng:x:contact:class#UserDefined",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#membership",
              valueExpr: "did:ng:x:contact:class#Membership",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#tag",
              valueExpr: "did:ng:x:contact:class#Tag",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#contactImportGroup",
              valueExpr: "did:ng:x:contact:class#ContactImportGroup",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#internalGroup",
              valueExpr: "did:ng:x:contact:class#InternalGroup",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#headline",
              valueExpr: "did:ng:x:contact:class#Headline",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#industry",
              valueExpr: "did:ng:x:contact:class#Industry",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#education",
              valueExpr: "did:ng:x:contact:class#Education",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#language",
              valueExpr: "did:ng:x:contact:class#Language",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#project",
              valueExpr: "did:ng:x:contact:class#Project",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#publication",
              valueExpr: "did:ng:x:contact:class#Publication",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#naoStatus",
              valueExpr: "did:ng:x:contact:class#NaoStatus",
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#invitedAt",
              valueExpr: "did:ng:x:contact:class#InvitedAt",
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#createdAt",
              valueExpr: "did:ng:x:contact:class#CreatedAt",
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#updatedAt",
              valueExpr: "did:ng:x:contact:class#UpdatedAt",
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#joinedAt",
              valueExpr: "did:ng:x:contact:class#JoinedAt",
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#mergedInto",
              valueExpr: "did:ng:x:contact:class#SocialContact",
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#mergedFrom",
              valueExpr: "did:ng:x:contact:class#SocialContact",
              min: 0,
              max: -1,
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
    {
      id: "did:ng:x:contact:class#PhoneNumber",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The canonicalized ITU-T E.164 form of the phone number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:phoneNumber#home",
                  "did:ng:k:contact:phoneNumber#work",
                  "did:ng:k:contact:phoneNumber#mobile",
                  "did:ng:k:contact:phoneNumber#homeFax",
                  "did:ng:k:contact:phoneNumber#workFax",
                  "did:ng:k:contact:phoneNumber#otherFax",
                  "did:ng:k:contact:phoneNumber#pager",
                  "did:ng:k:contact:phoneNumber#workMobile",
                  "did:ng:k:contact:phoneNumber#workPager",
                  "did:ng:k:contact:phoneNumber#main",
                  "did:ng:k:contact:phoneNumber#googleVoice",
                  "did:ng:k:contact:phoneNumber#callback",
                  "did:ng:k:contact:phoneNumber#car",
                  "did:ng:k:contact:phoneNumber#companyMain",
                  "did:ng:k:contact:phoneNumber#isdn",
                  "did:ng:k:contact:phoneNumber#radio",
                  "did:ng:k:contact:phoneNumber#telex",
                  "did:ng:k:contact:phoneNumber#ttyTdd",
                  "did:ng:k:contact:phoneNumber#assistant",
                  "did:ng:k:contact:phoneNumber#mms",
                  "did:ng:k:contact:phoneNumber#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the phone number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the phone number data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the preferred phone number",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Name",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The display name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#displayNameLastFirst",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The display name with the last name first",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#unstructuredName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The free form name value",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#familyName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The family name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#firstName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The given name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#maidenName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The maiden name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#middleName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The middle name(s)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#honorificPrefix",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The honorific prefixes, such as Mrs. or Dr.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#honorificSuffix",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The honorific suffixes, such as Jr.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticFullName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The full name spelled as it sounds",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticFamilyName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The family name spelled as it sounds",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticGivenName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The given name spelled as it sounds",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticMiddleName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The middle name(s) spelled as they sound",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticHonorificPrefix",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The honorific prefixes spelled as they sound",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticHonorificSuffix",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The honorific suffixes spelled as they sound",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the name data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Email",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The email address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:type#home",
                  "did:ng:k:contact:type#work",
                  "did:ng:k:contact:type#mobile",
                  "did:ng:k:contact:type#custom",
                  "did:ng:k:contact:type#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the email address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#displayName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The display name of the email",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the preferred email address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the email data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Address",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The unstructured value of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:type#home",
                  "did:ng:k:contact:type#work",
                  "did:ng:k:contact:type#custom",
                  "did:ng:k:contact:type#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#coordLat",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#double",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Latitude of address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#coordLng",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#double",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Longitude of address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#poBox",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The P.O. box of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#streetAddress",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The street address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#extendedAddress",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The extended address; for example, the apartment number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#city",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The city of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#region",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The region of the address; for example, the state or province",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#postalCode",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The postal code of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#country",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The country of the address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#countryCode",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The ISO 3166-1 alpha-2 country code",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the address data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the preferred address",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Organization",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The name of the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The phonetic name of the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#phoneticNameStyle",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The phonetic name style",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#department",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's department at the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#position",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's job title at the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#jobDescription",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's job description at the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#symbol",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The symbol associated with the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#domain",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The domain name associated with the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#location",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The location of the organization office the person works at",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#costCenter",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's cost center at the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#fullTimeEquivalentMillipercent",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The person's full-time equivalent millipercent within the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:org:type#business",
                  "did:ng:k:org:type#school",
                  "did:ng:k:org:type#work",
                  "did:ng:k:org:type#custom",
                  "did:ng:k:org:type#school",
                  "did:ng:k:org:type#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#startDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The start date when the person joined the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#endDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The end date when the person left the organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#current",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the person's current organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the organization data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Photo",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#photoUrl",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The URL of the photo",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#photoIRI",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The IRI of blob",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "True if the photo is a default photo",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the photo data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#CoverPhoto",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The URL of the cover photo",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "True if the cover photo is the default cover photo",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the cover photo data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Url",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:link:type#homepage",
                  "did:ng:k:link:type#sourceCode",
                  "did:ng:k:link:type#blog",
                  "did:ng:k:link:type#documentation",
                  "did:ng:k:link:type#profile",
                  "did:ng:k:link:type#home",
                  "did:ng:k:link:type#work",
                  "did:ng:k:link:type#appInstall",
                  "did:ng:k:link:type#linkedin",
                  "did:ng:k:link:type#ftp",
                  "did:ng:k:link:type#custom",
                  "did:ng:k:link:type#reservations",
                  "did:ng:k:link:type#appInstallPage",
                  "did:ng:k:link:type#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the URL data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the preferred URL",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Birthday",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The structured date of the birthday",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the birthday data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Biography",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The short biography",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#contentType",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The content type of the biography. Available types: TEXT_PLAIN, TEXT_HTML, CONTENT_TYPE_UNSPECIFIED",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the biography data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Event",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#startDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The date of the event",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:event#anniversary",
                  "did:ng:k:event#party",
                  "did:ng:k:event#birthday",
                  "did:ng:k:event#custom",
                  "did:ng:k:event#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the event",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the event data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Gender",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueIRI",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:gender#male",
                  "did:ng:k:gender#female",
                  "did:ng:k:gender#other",
                  "did:ng:k:gender#unknown",
                  "did:ng:k:gender#none",
                ],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The gender for the person",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#addressMeAs",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "Free form text field for pronouns that should be used to address the person",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the gender data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Nickname",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The nickname",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:nickname#default",
                  "did:ng:k:contact:nickname#initials",
                  "did:ng:k:contact:nickname#otherName",
                  "did:ng:k:contact:nickname#shortName",
                  "did:ng:k:contact:nickname#maidenName",
                  "did:ng:k:contact:nickname#alternateName",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the nickname",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the nickname data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Occupation",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The occupation; for example, carpenter",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the occupation data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Relation",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The name of the other person this relation refers to",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:humanRelationship#spouse",
                  "did:ng:k:humanRelationship#child",
                  "did:ng:k:humanRelationship#parent",
                  "did:ng:k:humanRelationship#sibling",
                  "did:ng:k:humanRelationship#friend",
                  "did:ng:k:humanRelationship#colleague",
                  "did:ng:k:humanRelationship#manager",
                  "did:ng:k:humanRelationship#assistant",
                  "did:ng:k:humanRelationship#brother",
                  "did:ng:k:humanRelationship#sister",
                  "did:ng:k:humanRelationship#father",
                  "did:ng:k:humanRelationship#mother",
                  "did:ng:k:humanRelationship#domesticPartner",
                  "did:ng:k:humanRelationship#partner",
                  "did:ng:k:humanRelationship#referredBy",
                  "did:ng:k:humanRelationship#relative",
                  "did:ng:k:humanRelationship#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's relation to the other person",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the relation data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Interest",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The interest; for example, stargazing",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the interest data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Skill",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The skill; for example, underwater basket weaving",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the skill data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#LocationDescriptor",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The free-form value of the location",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The type of the location. Available types: desk, grewUp",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#current",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether the location is the current location",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#buildingId",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The building identifier",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#floor",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The floor name or number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#floorSection",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The floor section in floor_name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#deskCode",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The individual desk location",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the location data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Locale",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The well-formed IETF BCP 47 language tag representing the locale",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the locale data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Account",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The user name used in the IM client",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:type#home",
                  "did:ng:k:contact:type#work",
                  "did:ng:k:contact:type#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the IM client",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#protocol",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The protocol of the IM client. Available protocols: aim, msn, yahoo, skype, qq, googleTalk, icq, jabber, netMeeting",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#server",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The server for the IM client",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the chat client data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#preferred",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is the preferred email address",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#SipAddress",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The SIP address in the RFC 3261 19.1 SIP URI format",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:sip#home",
                  "did:ng:k:contact:sip#work",
                  "did:ng:k:contact:sip#mobile",
                  "did:ng:k:contact:sip#other",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the SIP address",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the SIP address data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#ExternalId",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The value of the external ID",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The type of the external ID. Available types: account, customer, network, organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the external ID data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#FileAs",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The file-as value",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the file-as data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#CalendarUrl",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The calendar URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:calendar:type#home",
                  "did:ng:k:calendar:type#availability",
                  "did:ng:k:calendar:type#work",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of the calendar URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the calendar URL data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#ClientData",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#key",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The client specified key of the client data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The client specified value of the client data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the client data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#UserDefined",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#key",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The end user specified key of the user defined data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The end user specified value of the user defined data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the user defined data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Membership",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#contactGroupResourceNameMembership",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Contact group resource name membership",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#inViewerDomainMembership",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether in viewer domain membership",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the membership data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Tag",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueIRI",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:contact:tag#ai",
                  "did:ng:k:contact:tag#technology",
                  "did:ng:k:contact:tag#leadership",
                  "did:ng:k:contact:tag#design",
                  "did:ng:k:contact:tag#creative",
                  "did:ng:k:contact:tag#branding",
                  "did:ng:k:contact:tag#humaneTech",
                  "did:ng:k:contact:tag#ethics",
                  "did:ng:k:contact:tag#networking",
                  "did:ng:k:contact:tag#golang",
                  "did:ng:k:contact:tag#infrastructure",
                  "did:ng:k:contact:tag#blockchain",
                  "did:ng:k:contact:tag#protocols",
                  "did:ng:k:contact:tag#p2p",
                  "did:ng:k:contact:tag#entrepreneur",
                  "did:ng:k:contact:tag#climate",
                  "did:ng:k:contact:tag#agriculture",
                  "did:ng:k:contact:tag#socialImpact",
                  "did:ng:k:contact:tag#investing",
                  "did:ng:k:contact:tag#ventures",
                  "did:ng:k:contact:tag#identity",
                  "did:ng:k:contact:tag#trust",
                  "did:ng:k:contact:tag#digitalCredentials",
                  "did:ng:k:contact:tag#crypto",
                  "did:ng:k:contact:tag#organizations",
                  "did:ng:k:contact:tag#transformation",
                  "did:ng:k:contact:tag#author",
                  "did:ng:k:contact:tag#cognition",
                  "did:ng:k:contact:tag#research",
                  "did:ng:k:contact:tag#futurism",
                  "did:ng:k:contact:tag#writing",
                  "did:ng:k:contact:tag#ventureCapital",
                  "did:ng:k:contact:tag#deepTech",
                  "did:ng:k:contact:tag#startups",
                  "did:ng:k:contact:tag#sustainability",
                  "did:ng:k:contact:tag#environment",
                  "did:ng:k:contact:tag#healthcare",
                  "did:ng:k:contact:tag#policy",
                  "did:ng:k:contact:tag#medicare",
                  "did:ng:k:contact:tag#education",
                  "did:ng:k:contact:tag#careerDevelopment",
                  "did:ng:k:contact:tag#openai",
                  "did:ng:k:contact:tag#decentralized",
                  "did:ng:k:contact:tag#database",
                  "did:ng:k:contact:tag#forestry",
                  "did:ng:k:contact:tag#biotech",
                  "did:ng:k:contact:tag#mrna",
                  "did:ng:k:contact:tag#vaccines",
                  "did:ng:k:contact:tag#fintech",
                  "did:ng:k:contact:tag#product",
                  "did:ng:k:contact:tag#ux",
                ],
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The value of the miscellaneous keyword/tag",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#type",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The miscellaneous keyword type. Available types: OUTLOOK_BILLING_INFORMATION, OUTLOOK_DIRECTORY_SERVER, OUTLOOK_KEYWORD, OUTLOOK_MILEAGE, OUTLOOK_PRIORITY, OUTLOOK_SENSITIVITY, OUTLOOK_SUBJECT, OUTLOOK_USER, HOME, WORK, OTHER",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the tag data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#ContactImportGroup",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "ID of the import group",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#name",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Name of the import group",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the group data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#InternalGroup",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Mostly to preserve current mock UI group id",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the internal group data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#NaoStatus",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "NAO status value",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the status data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#InvitedAt",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueDateTime",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "When the contact was invited",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the invited date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#CreatedAt",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueDateTime",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "When the contact was created",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the creation date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#UpdatedAt",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueDateTime",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "When the contact was last updated",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the update date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#JoinedAt",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueDateTime",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "When the contact joined",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the join date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Headline",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Headline(position at orgName) in Profile",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the headline data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Industry",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Industry in which contact works",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the industry data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#selected",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is main",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Education",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "School name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#startDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Start date of education",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#endDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "End date of education",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#notes",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Education notes",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#degreeName",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Degree name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#activities",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Education activities",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the education data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Language",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#valueIRI",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Language name as IRI",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#proficiency",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "did:ng:k:skills:language:proficiency#elementary",
                  "did:ng:k:skills:language:proficiency#limitedWork",
                  "did:ng:k:skills:language:proficiency#professionalWork",
                  "did:ng:k:skills:language:proficiency#fullWork",
                  "did:ng:k:skills:language:proficiency#bilingual",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Language proficiency",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the language data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Project",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Title of project",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#description",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Project description",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#url1",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Project URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#startDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Project start date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#endDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Project end date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the project data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "did:ng:x:contact:class#Publication",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#value",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Title of publication",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#publishDate",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#date",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Publication date",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#description",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Publication description",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:contact#publisher",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Publisher name",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#url1",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Publication URL",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#source",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Source of the publication data",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "did:ng:x:core#hidden",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Whether this is hidden from list",
                  },
                },
              ],
            },
          ],
        },
      },
    },
  ],
};
