import type { SolidContainerUri, SolidLeafUri } from "@ldo/connected-solid";
import type { ResourceInfo } from "@ldo/test-solid-server";
import fetch from "cross-fetch";
import type { MockedFunction } from "vitest";
import { beforeAll, beforeEach, afterEach, vi } from "vitest";

export const SERVER_DOMAIN = process.env.SERVER || "http://localhost:3002/";
export const ROOT_ROUTE = process.env.ROOT_CONTAINER || "example/";
export const ROOT_CONTAINER = `${SERVER_DOMAIN}${ROOT_ROUTE}`;
export const WEB_ID = `${SERVER_DOMAIN}${ROOT_ROUTE}profile/card#me`;
export const TEST_CONTAINER_SLUG = "test_ldo/";
export const TEST_CONTAINER_URI =
  `${ROOT_CONTAINER}${TEST_CONTAINER_SLUG}` as SolidContainerUri;
export const SAMPLE_DATA_URI =
  `${TEST_CONTAINER_URI}sample.ttl` as SolidLeafUri;
export const SAMPLE2_DATA_SLUG = "sample2.ttl";
export const SAMPLE2_DATA_URI =
  `${TEST_CONTAINER_URI}${SAMPLE2_DATA_SLUG}` as SolidLeafUri;
export const SAMPLE_BINARY_URI =
  `${TEST_CONTAINER_URI}sample.txt` as SolidLeafUri;
export const SAMPLE2_BINARY_SLUG = `sample2.txt`;
export const SAMPLE2_BINARY_URI =
  `${TEST_CONTAINER_URI}${SAMPLE2_BINARY_SLUG}` as SolidLeafUri;
export const SAMPLE_CONTAINER_URI =
  `${TEST_CONTAINER_URI}sample_container/` as SolidContainerUri;
export const LINK_QUERY_CONTAINER = `${ROOT_CONTAINER}link-query/`;
export const MAIN_PROFILE_URI =
  `${LINK_QUERY_CONTAINER}main-profile.ttl` as SolidContainerUri;
export const MAIN_PROFILE_SUBJECT =
  `${MAIN_PROFILE_URI}#me` as SolidContainerUri;
export const OTHER_PROFILE_URI =
  `${LINK_QUERY_CONTAINER}other-profile.ttl` as SolidContainerUri;
export const OTHER_PROFILE_SUBJECT =
  `${OTHER_PROFILE_URI}#me` as SolidContainerUri;
export const THIRD_PROFILE_URI =
  `${LINK_QUERY_CONTAINER}third-profile.ttl` as SolidContainerUri;
export const THIRD_PROFILE_SUBJECT =
  `${THIRD_PROFILE_URI}#me` as SolidContainerUri;

export const EXAMPLE_POST_TTL = `@prefix schema: <http://schema.org/> .

<#Post1>
  a schema:CreativeWork, schema:Thing, schema:SocialMediaPosting ;
  schema:image <https://example.com/postImage.jpg> ;
  schema:articleBody "test" ;
  schema:publisher <https://example.com/Publisher1>, <https://example.com/Publisher2> .
<#Post2>
  a schema:CreativeWork, schema:Thing, schema:SocialMediaPosting .`;
export const TEST_CONTAINER_TTL = `@prefix dc: <http://purl.org/dc/terms/>.
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix posix: <http://www.w3.org/ns/posix/stat#>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.

<> <urn:npm:solid:community-server:http:slug> "sample.txt";
    a ldp:Container, ldp:BasicContainer, ldp:Resource;
    dc:modified "2023-10-20T13:57:14.000Z"^^xsd:dateTime.
<sample.ttl> a ldp:Resource, <http://www.w3.org/ns/iana/media-types/text/turtle#Resource>;
    dc:modified "2023-10-20T13:57:14.000Z"^^xsd:dateTime.
<sample.txt> a ldp:Resource, <http://www.w3.org/ns/iana/media-types/text/plain#Resource>;
    dc:modified "2023-10-20T13:57:14.000Z"^^xsd:dateTime.
<> posix:mtime 1697810234;
    ldp:contains <sample.ttl>, <sample.txt>.
<sample.ttl> posix:mtime 1697810234;
    posix:size 522.
<sample.txt> posix:mtime 1697810234;
    posix:size 10.`;

export interface SetUpServerReturn {
  authFetch: typeof fetch;
  fetchMock: MockedFunction<
    (
      input: RequestInfo | URL,
      init?: RequestInit | undefined,
    ) => Promise<Response>
  >;
}

export const fileData: ResourceInfo = {
  slug: TEST_CONTAINER_SLUG,
  isContainer: true,
  contains: [
    {
      slug: "sample.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: EXAMPLE_POST_TTL,
    },
    {
      slug: "sample.txt",
      isContainer: false,
      mimeType: "text/plain",
      data: `some text.`,
    },
    {
      slug: "sample2.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      shouldNotInit: true,
      data: "",
    },
    {
      slug: "sample2.txt",
      isContainer: false,
      mimeType: "text/plain",
      shouldNotInit: true,
      data: "",
    },
    {
      slug: "sampleContainer/",
      isContainer: true,
      shouldNotInit: true,
      contains: [],
    },
  ],
};

export function setUpServerFiles(): SetUpServerReturn {
  // Ignore to build s
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const s: SetUpServerReturn = {};

  beforeAll(async () => {
    // s.authFetch = await getAuthenticatedFetch();
    s.authFetch = fetch;
  });

  beforeEach(async () => {
    s.fetchMock = vi.fn(s.authFetch);
    // Create a new document called sample.ttl
    await s.authFetch(ROOT_CONTAINER, {
      method: "POST",
      headers: {
        link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
        slug: TEST_CONTAINER_SLUG,
      },
    });
    await Promise.all([
      s.authFetch(TEST_CONTAINER_URI, {
        method: "POST",
        headers: { "content-type": "text/turtle", slug: "sample.ttl" },
        body: EXAMPLE_POST_TTL,
      }),
      s.authFetch(TEST_CONTAINER_URI, {
        method: "POST",
        headers: { "content-type": "text/plain", slug: "sample.txt" },
        body: "some text.",
      }),
    ]);
  });

  afterEach(async () => {
    await Promise.all([
      s.authFetch(SAMPLE_DATA_URI, {
        method: "DELETE",
      }),
      s.authFetch(SAMPLE2_DATA_URI, {
        method: "DELETE",
      }),
      s.authFetch(SAMPLE_BINARY_URI, {
        method: "DELETE",
      }),
      s.authFetch(SAMPLE2_BINARY_URI, {
        method: "DELETE",
      }),
      s.authFetch(SAMPLE_CONTAINER_URI, {
        method: "DELETE",
      }),
    ]);
  });

  return s;
}
