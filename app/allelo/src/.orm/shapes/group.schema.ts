import type { Schema } from "@ng-org/shex-orm";

/**
 * =============================================================================
 * groupSchema: Schema for group
 * =============================================================================
 */
export const groupSchema: Schema = {
  "did:ng:x:social:group#SocialGroup": {
    iri: "did:ng:x:social:group#SocialGroup",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:group#Group"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:group#title",
        readablePredicate: "title",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#description",
        readablePredicate: "description",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#tag",
        readablePredicate: "tag",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#logoIRI",
        readablePredicate: "logoIRI",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#hasMember",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#hasMember",
        readablePredicate: "hasMember",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#createdAt",
        readablePredicate: "createdAt",
      },
      {
        dataTypes: [
          {
            valType: "shape",
            shape:
              "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#post",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:group#post",
        readablePredicate: "post",
      },
    ],
  },
  "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#hasMember": {
    iri: "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#hasMember",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#contactId",
        readablePredicate: "contactId",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#invited"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#joined"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#declined"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#memberStatus",
        readablePredicate: "memberStatus",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#joinDate",
        readablePredicate: "joinDate",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#isAdmin",
        readablePredicate: "isAdmin",
      },
    ],
  },
  "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#post": {
    iri: "did:ng:x:social:group#SocialGroup||did:ng:x:social:group#post",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:post#Post"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#author",
        readablePredicate: "author",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#createdAt",
        readablePredicate: "createdAt",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:post#tag",
        readablePredicate: "tag",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#description",
        readablePredicate: "description",
      },
    ],
  },
  "did:ng:x:social:post#SocialPost": {
    iri: "did:ng:x:social:post#SocialPost",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:x:social:post#Post"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        readablePredicate: "@type",
        extra: true,
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#author",
        readablePredicate: "author",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#createdAt",
        readablePredicate: "createdAt",
      },
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: -1,
        minCardinality: 0,
        iri: "did:ng:x:social:post#tag",
        readablePredicate: "tag",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:social:post#description",
        readablePredicate: "description",
      },
    ],
  },
  "did:ng:x:contact:class#GroupMembership": {
    iri: "did:ng:x:contact:class#GroupMembership",
    predicates: [
      {
        dataTypes: [
          {
            valType: "iri",
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#contactId",
        readablePredicate: "contactId",
      },
      {
        dataTypes: [
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#invited"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#joined"],
          },
          {
            valType: "iri",
            literals: ["did:ng:k:contact:memberStatus#declined"],
          },
        ],
        maxCardinality: 1,
        minCardinality: 1,
        iri: "did:ng:x:contact#memberStatus",
        readablePredicate: "memberStatus",
      },
      {
        dataTypes: [
          {
            valType: "string",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#joinDate",
        readablePredicate: "joinDate",
      },
      {
        dataTypes: [
          {
            valType: "boolean",
          },
        ],
        maxCardinality: 1,
        minCardinality: 0,
        iri: "did:ng:x:contact#isAdmin",
        readablePredicate: "isAdmin",
      },
    ],
  },
};
