import type { Schema } from "shexj";
import type { ContextDefinition } from "jsonld";
import type { LdSet, ShapeType } from "../src/index.js";

export const profileShex: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
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
              predicate: "http://www.w3.org/2006/vcard/ns#fn",
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
                      "The formatted name of a person. Example: John Smith",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://xmlns.com/foaf/0.1/name",
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
                    value: "An alternate way to define a person's name.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#hasAddress",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#AddressShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's street address.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#hasEmail",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#EmailShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The person's email.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#hasPhoto",
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
                    value: "A link to the person's photo",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://xmlns.com/foaf/0.1/img",
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
                    value: "Photo link but in string form",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#hasTelephone",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#PhoneNumberShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "Person's telephone number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#phone",
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
                      "An alternative way to define a person's telephone number using a string",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#organization-name",
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
                      "The name of the organization with which the person is affiliated",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#role",
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
                      "The name of the person's role in their organization",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/acl#trustedApp",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#TrustedAppShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A list of app origins that are trusted by this user",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/cert#key",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#RSAPublicKeyShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A list of RSA public keys that are associated with private keys the user holds.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/ldp#inbox",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The user's LDP inbox to which apps can post notifications",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/pim/space#preferencesFile",
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
                    value: "The user's preferences",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/pim/space#storage",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The location of a Solid storage server related to this WebId",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/solid/terms#account",
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
                    value: "The user's account",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/solid/terms#privateTypeIndex",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A registry of all types used on the user's Pod (for private access only)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/solid/terms#publicTypeIndex",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A registry of all types used on the user's Pod (for public access)",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://xmlns.com/foaf/0.1/knows",
              valueExpr:
                "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
              min: 0,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "A list of WebIds for all the people this user knows.",
                  },
                },
              ],
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
    {
      id: "https://shaperepo.com/schemas/solidProfile#AddressShape",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#country-name",
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
                    value: "The name of the user's country of residence",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#locality",
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
                      "The name of the user's locality (City, Town etc.) of residence",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#postal-code",
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
                    value: "The user's postal code",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#region",
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
                      "The name of the user's region (State, Province etc.) of residence",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#street-address",
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
                    value: "The user's street address",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "https://shaperepo.com/schemas/solidProfile#EmailShape",
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
                values: [
                  "http://www.w3.org/2006/vcard/ns#Dom",
                  "http://www.w3.org/2006/vcard/ns#Home",
                  "http://www.w3.org/2006/vcard/ns#ISDN",
                  "http://www.w3.org/2006/vcard/ns#Internet",
                  "http://www.w3.org/2006/vcard/ns#Intl",
                  "http://www.w3.org/2006/vcard/ns#Label",
                  "http://www.w3.org/2006/vcard/ns#Parcel",
                  "http://www.w3.org/2006/vcard/ns#Postal",
                  "http://www.w3.org/2006/vcard/ns#Pref",
                  "http://www.w3.org/2006/vcard/ns#Work",
                  "http://www.w3.org/2006/vcard/ns#X400",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The type of email.",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#value",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The value of an email as a mailto link (Example <mailto:jane@example.com>)",
                  },
                },
              ],
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
    {
      id: "https://shaperepo.com/schemas/solidProfile#PhoneNumberShape",
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
                values: [
                  "http://www.w3.org/2006/vcard/ns#Dom",
                  "http://www.w3.org/2006/vcard/ns#Home",
                  "http://www.w3.org/2006/vcard/ns#ISDN",
                  "http://www.w3.org/2006/vcard/ns#Internet",
                  "http://www.w3.org/2006/vcard/ns#Intl",
                  "http://www.w3.org/2006/vcard/ns#Label",
                  "http://www.w3.org/2006/vcard/ns#Parcel",
                  "http://www.w3.org/2006/vcard/ns#Postal",
                  "http://www.w3.org/2006/vcard/ns#Pref",
                  "http://www.w3.org/2006/vcard/ns#Work",
                  "http://www.w3.org/2006/vcard/ns#X400",
                ],
              },
              min: 0,
              max: 1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "They type of Phone Number",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/2006/vcard/ns#value",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value:
                      "The value of a phone number as a tel link (Example <tel:555-555-5555>)",
                  },
                },
              ],
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
    {
      id: "https://shaperepo.com/schemas/solidProfile#TrustedAppShape",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/acl#mode",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "http://www.w3.org/ns/auth/acl#Append",
                  "http://www.w3.org/ns/auth/acl#Control",
                  "http://www.w3.org/ns/auth/acl#Read",
                  "http://www.w3.org/ns/auth/acl#Write",
                ],
              },
              min: 1,
              max: -1,
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The level of access provided to this origin",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/acl#origin",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "The app origin the user trusts",
                  },
                },
              ],
            },
          ],
        },
      },
    },
    {
      id: "https://shaperepo.com/schemas/solidProfile#RSAPublicKeyShape",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/cert#modulus",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "RSA Modulus",
                  },
                },
              ],
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/auth/cert#exponent",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              },
              annotations: [
                {
                  type: "Annotation",
                  predicate: "http://www.w3.org/2000/01/rdf-schema#comment",
                  object: {
                    value: "RSA Exponent",
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

export const profileContext: ContextDefinition = {
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
  type: {
    "@id": "@type",
    "@container": "@set",
  },
  Dom: "http://www.w3.org/2006/vcard/ns#Dom",
  Home: "http://www.w3.org/2006/vcard/ns#Home",
  ISDN: "http://www.w3.org/2006/vcard/ns#ISDN",
  Internet: "http://www.w3.org/2006/vcard/ns#Internet",
  Intl: "http://www.w3.org/2006/vcard/ns#Intl",
  Label: "http://www.w3.org/2006/vcard/ns#Label",
  Parcel: "http://www.w3.org/2006/vcard/ns#Parcel",
  Postal: "http://www.w3.org/2006/vcard/ns#Postal",
  Pref: "http://www.w3.org/2006/vcard/ns#Pref",
  Work: "http://www.w3.org/2006/vcard/ns#Work",
  X400: "http://www.w3.org/2006/vcard/ns#X400",
  value: {
    "@id": "http://www.w3.org/2006/vcard/ns#value",
    "@container": "@set",
  },
  modulus: {
    "@id": "http://www.w3.org/ns/auth/cert#modulus",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  exponent: {
    "@id": "http://www.w3.org/ns/auth/cert#exponent",
    "@type": "http://www.w3.org/2001/XMLSchema#integer",
  },
  Person: "http://schema.org/Person",
  Person2: "http://xmlns.com/foaf/0.1/Person",
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
    "@container": "@set",
  },
  hasEmail: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasEmail",
    "@type": "@id",
    "@container": "@set",
  },
  hasPhoto: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasPhoto",
  },
  img: {
    "@id": "http://xmlns.com/foaf/0.1/img",
    "@type": "http://www.w3.org/2001/XMLSchema#string",
  },
  hasTelephone: {
    "@id": "http://www.w3.org/2006/vcard/ns#hasTelephone",
    "@type": "@id",
    "@container": "@set",
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
    "@container": "@set",
  },
  mode: {
    "@id": "http://www.w3.org/ns/auth/acl#mode",
    "@container": "@set",
  },
  Append: "http://www.w3.org/ns/auth/acl#Append",
  Control: "http://www.w3.org/ns/auth/acl#Control",
  Read: "http://www.w3.org/ns/auth/acl#Read",
  Write: "http://www.w3.org/ns/auth/acl#Write",
  origin: {
    "@id": "http://www.w3.org/ns/auth/acl#origin",
  },
  key: {
    "@id": "http://www.w3.org/ns/auth/cert#key",
    "@type": "@id",
    "@container": "@set",
  },
  inbox: {
    "@id": "http://www.w3.org/ns/ldp#inbox",
    "@type": "@id",
  },
  preferencesFile: {
    "@id": "http://www.w3.org/ns/pim/space#preferencesFile",
  },
  storage: {
    "@id": "http://www.w3.org/ns/pim/space#storage",
    "@container": "@set",
  },
  account: {
    "@id": "http://www.w3.org/ns/solid/terms#account",
  },
  privateTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#privateTypeIndex",
    "@container": "@set",
  },
  publicTypeIndex: {
    "@id": "http://www.w3.org/ns/solid/terms#publicTypeIndex",
    "@container": "@set",
  },
  knows: {
    "@id": "http://xmlns.com/foaf/0.1/knows",
    "@container": "@set",
  },
};

export interface AddressShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  /**
   * The name of the user's country of residence
   */
  countryName?: string;
  /**r
   * The name of the user's locality (City, Town etc.) of residencer
   */
  locality?: string;
  /**
   * The user's postal code
   */
  postalCode?: string;
  /**
   * The name of the user's region (State, Province etc.) of residence
   */
  region?: string;
  /**
   * The user's street address
   */
  streetAddress?: string;
}

export interface EmailShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  /**
   * The type of email.
   */
  type?:
    | { "@id": "Dom" }
    | { "@id": "Home" }
    | { "@id": "ISDN" }
    | { "@id": "Internet" }
    | { "@id": "Intl" }
    | { "@id": "Label" }
    | { "@id": "Parcel" }
    | { "@id": "Postal" }
    | { "@id": "Pref" }
    | { "@id": "Work" }
    | { "@id": "X400" };
  /**
   * The value of an email as a mailto link (Example <mailto:jane@example.com>)
   */
  value: string;
}

export interface PhoneNumberShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  /**
   * They type of Phone Number
   */
  type?:
    | { "@id": "Dom" }
    | { "@id": "Home" }
    | { "@id": "ISDN" }
    | { "@id": "Internet" }
    | { "@id": "Intl" }
    | { "@id": "Label" }
    | { "@id": "Parcel" }
    | { "@id": "Postal" }
    | { "@id": "Pref" }
    | { "@id": "Work" }
    | { "@id": "X400" };
  /**
   * The value of a phone number as a tel link (Example <tel:555-555-5555>)
   */
  value: string;
}

export interface RSAPublicKeyShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  /**
   * RSA Modulus
   */
  modulus: string;
  /**
   * RSA Exponent
   */
  exponent: number;
}

export interface SolidProfileShape {
  "@id"?: string;
  /**
   * Defines the node as a Person (from Schema.org) | Defines the node as a Person (from foaf)
   */
  type: LdSet<{ "@id": "Person" } | { "@id": "Person2" }>;
  /**
   * The formatted name of a person. Example: John Smith
   */
  fn?: string;
  /**
   * An alternate way to define a person's name.
   */
  name?: string;
  /**
   * The person's street address.
   */
  hasAddress?: LdSet<AddressShape>;
  /**
   * The person's email.
   */
  hasEmail?: LdSet<EmailShape>;
  /**
   * A link to the person's photo
   */
  hasPhoto?: string;
  /**
     * Photo link but in string form
     *
    img?: string;
    /**
     * Person's telephone number
     */
  hasTelephone?: LdSet<PhoneNumberShape>;
  /**
   * An alternative way to define a person's telephone number using a string
   */
  phone?: string;
  /**
   * The name of the organization with which the person is affiliated
   */
  organizationName?: string;
  /**
   * The name of the person's role in their organization
   */
  role?: string;
  /**
   * A list of app origins that are trusted by this user
   */
  trustedApp?: LdSet<TrustedAppShape>;
  /**
   * A list of RSA public keys that are associated with private keys the user holds.
   */
  key?: LdSet<RSAPublicKeyShape>;
  /**
   * The user's LDP inbox to which apps can post notifications
   */
  inbox: { "@id": string };
  /**
   * The user's preferences
   */
  preferencesFile?: string;
  /**
   * The location of a Solid storage server related to this WebId
   */
  storage?: LdSet<string>;
  /**
   * The user's account
   */
  account?: string;
  /**
   * A registry of all types used on the user's Pod (for private access only)
   */
  privateTypeIndex?: LdSet<string>;
  /**
   * A registry of all types used on the user's Pod (for public access)
   */
  publicTypeIndex?: LdSet<string>;
  /**
   * A list of WebIds for all the people this user knows.
   */
  knows?: LdSet<SolidProfileShape>;
}

export interface TrustedAppShape {
  "@id"?: string;
  "@context"?: ContextDefinition;
  /**
   * The level of access provided to this origin
   */
  mode: LdSet<
    | { "@id": "Append" }
    | { "@id": "Control" }
    | { "@id": "Read" }
    | { "@id": "Write" }
  >;
  /**
   * The app origin the user trusts
   */
  origin: string;
}

export const ProfileShapeType: ShapeType<SolidProfileShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#SolidProfileShape",
  context: profileContext,
};

export const TrustedAppShapeType: ShapeType<TrustedAppShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#TrustedAppShape",
  context: profileContext,
};

export const AddressShapeType: ShapeType<AddressShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#AddressShape",
  context: profileContext,
};

export const EmailShapeType: ShapeType<EmailShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#EmailShape",
  context: profileContext,
};

export const PhoneNumberShapeType: ShapeType<PhoneNumberShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#PhoneNumberShape",
  context: profileContext,
};

export const RSAPublicKeyShapeType: ShapeType<RSAPublicKeyShape> = {
  schema: profileShex,
  shape: "https://shaperepo.com/schemas/solidProfile#RSAPublicKeyShape",
  context: profileContext,
};
