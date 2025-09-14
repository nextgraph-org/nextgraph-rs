import type fetch from "cross-fetch";
import type { ResourceInfo } from "@ldo/test-solid-server";

export const SERVER_DOMAIN = process.env.SERVER || "http://localhost:3003/";
export const ROOT_ROUTE = process.env.ROOT_CONTAINER || "example/";
export const ROOT_CONTAINER = `${SERVER_DOMAIN}${ROOT_ROUTE}`;
export const PROFILE_CONTAINER = `${ROOT_CONTAINER}profile/`;
export const WEB_ID = `${PROFILE_CONTAINER}card.ttl#me`;
export const PUBLIC_TYPE_INDEX_URI = `${PROFILE_CONTAINER}publicTypeIndex.ttl`;
export const PRIVATE_TYPE_INDEX_URI = `${PROFILE_CONTAINER}privateTypeIndex.ttl`;
export const MY_BOOKMARKS_CONTAINER = `${ROOT_CONTAINER}myBookmarks/`;
export const MY_BOOKMARKS_1_URI = `${ROOT_CONTAINER}myBookmarks/bookmark1.ttl`;
export const MY_BOOKMARKS_2_URI = `${ROOT_CONTAINER}myBookmarks/bookmark2.ttl`;

export const PROFILE_TTL = `
<#me> <http://www.w3.org/ns/solid/terms#publicTypeIndex> <${PROFILE_CONTAINER}publicTypeIndex.ttl> ;
      <http://www.w3.org/ns/solid/terms#privateTypeIndex> <${PROFILE_CONTAINER}privateTypeIndex.ttl> .`;
export const PUBLIC_TYPE_INDEX_TTL = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
@prefix bk: <http://www.w3.org/2002/01/bookmark#>.

<>
  a solid:TypeIndex ;
  a solid:ListedDocument.

<#ab09fd> a solid:TypeRegistration;
  solid:forClass vcard:AddressBook;
  solid:instance <https://example.com/myPublicAddressBook.ttl>.

<#bq1r5e> a solid:TypeRegistration;
  solid:forClass bk:Bookmark;
  solid:instanceContainer <${ROOT_CONTAINER}myBookmarks/>.`;
export const PRIVATE_TYPE_INDEX_TTL = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
@prefix vcard: <http://www.w3.org/2006/vcard/ns#>.
@prefix bk: <http://www.w3.org/2002/01/bookmark#>.

<>
  a solid:TypeIndex ;
  a solid:UnlistedDocument.

<#ab09fd> a solid:TypeRegistration;
  solid:forClass vcard:AddressBook;
  solid:instance <https://example.com/myPrivateAddressBook.ttl>.

<#bq1r5e> a solid:TypeRegistration;
  solid:forClass bk:Bookmark;
  solid:instanceContainer <${ROOT_CONTAINER}myBookmarks/>.`;

export const fileData: ResourceInfo = {
  slug: "myBookmarks/",
  isContainer: true,
  contains: [],
};

export async function setupFullTypeIndex(authFetch: typeof fetch) {
  // Create a new document called sample.ttl
  await authFetch(WEB_ID, { method: "DELETE" });
  await authFetch(ROOT_CONTAINER, {
    method: "POST",
    headers: {
      link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
      slug: "myBookmarks/",
    },
  });
  await Promise.all([
    authFetch(PROFILE_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "card.ttl" },
      body: PROFILE_TTL,
    }),
    authFetch(PROFILE_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "publicTypeIndex.ttl" },
      body: PUBLIC_TYPE_INDEX_TTL,
    }),
    authFetch(PROFILE_CONTAINER, {
      method: "POST",
      headers: {
        "content-type": "text/turtle",
        slug: "privateTypeIndex.ttl",
      },
      body: PRIVATE_TYPE_INDEX_TTL,
    }),
    authFetch(MY_BOOKMARKS_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "bookmark1.ttl" },
      body: "",
    }),
    authFetch(MY_BOOKMARKS_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "bookmark2.ttl" },
      body: "",
    }),
  ]);
}

export async function setupEmptyTypeIndex(authFetch: typeof fetch) {
  // Create a new document called sample.ttl
  await authFetch(WEB_ID, { method: "DELETE" });
  await authFetch(ROOT_CONTAINER, {
    method: "POST",
    headers: {
      link: '<http://www.w3.org/ns/ldp#Container>; rel="type"',
      slug: "myBookmarks/",
    },
  });
  await Promise.all([
    authFetch(PROFILE_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "card.ttl" },
      body: "",
    }),
    authFetch(MY_BOOKMARKS_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "bookmark1.ttl" },
      body: "",
    }),
    authFetch(MY_BOOKMARKS_CONTAINER, {
      method: "POST",
      headers: { "content-type": "text/turtle", slug: "bookmark2.ttl" },
      body: "",
    }),
  ]);
}
