import type { ResourceInfo } from "@ldo/test-solid-server";

export const BASE_CONTAINER = "http://localhost:3005/test-container/";
export const MAIN_PROFILE_URI = `${BASE_CONTAINER}mainProfile.ttl`;
export const MAIN_PROFILE_SUBJECT = `${MAIN_PROFILE_URI}#me`;
export const OTHER_PROFILE_URI = `${BASE_CONTAINER}otherProfile.ttl`;
export const OTHER_PROFILE_SUBJECT = `${OTHER_PROFILE_URI}#me`;
export const THIRD_PROFILE_URI = `${BASE_CONTAINER}thirdProfile.ttl`;
export const THIRD_PROFILE_SUBJECT = `${THIRD_PROFILE_URI}#me`;

export const linkTraversalData: ResourceInfo = {
  slug: "test-container/",
  isContainer: true,
  contains: [
    {
      slug: "mainProfile.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: `
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .
        @prefix : <#> .

        :me a foaf:Person ;
            foaf:name "Main User" ;
            foaf:mbox <mailto:main@example.org> ;
            foaf:knows <http://localhost:3005/test-container/otherProfile.ttl#me> .
      `,
    },
    {
      slug: "otherProfile.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: `
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .
        @prefix : <#> .

        :me a foaf:Person ;
            foaf:name "Other User" ;
            foaf:mbox <mailto:other@example.org> ;
            foaf:knows <http://localhost:3005/test-container/mainProfile.ttl#me> .
      `,
    },
    {
      slug: "thirdProfile.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: `
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .
        @prefix : <#> .

        :me a foaf:Person ;
            foaf:name "Third User" ;
            foaf:mbox <mailto:third@example.org> ;
            foaf:knows <http://localhost:3005/test-container/mainProfile.ttl#me> .
      `,
    },
  ],
};
