import {
  fileData,
  MY_BOOKMARKS_1_URI,
  MY_BOOKMARKS_2_URI,
  PRIVATE_TYPE_INDEX_URI,
  PUBLIC_TYPE_INDEX_URI,
  ROOT_CONTAINER,
  setupEmptyTypeIndex,
  setupFullTypeIndex,
  WEB_ID,
} from "./fileData.js";
import { getInstanceUris, getTypeRegistrations } from "../src/getTypeIndex.js";
import {
  addRegistration,
  initTypeIndex,
  removeRegistration,
} from "../src/setTypeIndex.js";
import { TypeIndexProfileShapeType } from "../src/.ldo/profile.shapeTypes.js";
import { INSTANCE } from "../src/constants.js";
import { createSolidLdoDataset } from "@ldo/connected-solid";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setupServer } from "@ldo/test-solid-server";
import { it, expect, describe, afterEach } from "vitest";
import { namedNode } from "@ldo/rdf-utils";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

const ADDRESS_BOOK = "http://www.w3.org/2006/vcard/ns#AddressBook";
const BOOKMARK = "http://www.w3.org/2002/01/bookmark#Bookmark";
const EXAMPLE_THING = "https://example.com/ExampleThing";

describe("General Tests", () => {
  const s = setupServer(
    3003,
    fileData,
    join(
      __dirname,
      "configs",
      "components-config",
      "unauthenticatedServer.json",
    ),
  );

  afterEach(async () => {
    await Promise.all([
      await s.authFetch(WEB_ID, { method: "DELETE" }),
      await s.authFetch(PUBLIC_TYPE_INDEX_URI, { method: "DELETE" }),
      await s.authFetch(PRIVATE_TYPE_INDEX_URI, { method: "DELETE" }),
      await s.authFetch(MY_BOOKMARKS_1_URI, { method: "DELETE" }),
      await s.authFetch(MY_BOOKMARKS_2_URI, { method: "DELETE" }),
    ]);
  });

  it("gets the current typeindex", async () => {
    await setupFullTypeIndex(s.authFetch);

    const solidLdoDataset = createSolidLdoDataset();
    const typeRegistrations = await getTypeRegistrations(WEB_ID, {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: come back and see if we can fix this
      solidLdoDataset,
    });
    const addressBookUris = await getInstanceUris(
      ADDRESS_BOOK,
      typeRegistrations.toArray(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO: come back and see if we can fix this
      { solidLdoDataset },
    );
    expect(addressBookUris).toEqual(
      expect.arrayContaining([
        "https://example.com/myPrivateAddressBook.ttl",
        "https://example.com/myPublicAddressBook.ttl",
      ]),
    );
    const bookmarkUris = await getInstanceUris(
      BOOKMARK,
      typeRegistrations.toArray(),
      {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TODO: come back and see if we can fix this
        solidLdoDataset,
      },
    );
    expect(bookmarkUris).toEqual(
      expect.arrayContaining([MY_BOOKMARKS_1_URI, MY_BOOKMARKS_2_URI]),
    );
  });

  it("initializes the type index", async () => {
    await setupEmptyTypeIndex(s.authFetch);

    const solidLdoDataset = createSolidLdoDataset();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO: come back and see if we can fix this
    await initTypeIndex(WEB_ID, { solidLdoDataset });

    const profile = solidLdoDataset
      .usingType(TypeIndexProfileShapeType)
      .fromSubject(WEB_ID);

    expect(profile.privateTypeIndex?.toArray()[0]?.["@id"]).toBeDefined();
    expect(profile.publicTypeIndex?.toArray()[0]?.["@id"]).toBeDefined();
  });

  it("Adds to the typeIndex", async () => {
    await setupFullTypeIndex(s.authFetch);

    const solidLdoDataset = createSolidLdoDataset();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO: come back and see if we can fix this
    await getTypeRegistrations(WEB_ID, { solidLdoDataset });

    const transaction = solidLdoDataset.startTransaction();
    addRegistration(
      PUBLIC_TYPE_INDEX_URI,
      ADDRESS_BOOK,
      { instance: ["https://example.com/AdressBook3"] },
      { solidLdoDataset: transaction },
    );
    addRegistration(
      PRIVATE_TYPE_INDEX_URI,
      EXAMPLE_THING,
      { instanceContainer: ["https://example.com/ExampleInstance"] },
      { solidLdoDataset: transaction },
    );
    const { added, removed } = transaction.getChanges();

    const existingRegistration = namedNode(
      "http://localhost:3003/example/profile/publicTypeIndex.ttl#ab09fd",
    );

    expect(removed).not.toBeDefined();
    expect(added?.size).toBe(4);
    expect(added?.match(existingRegistration).size).toBe(1);
    expect(
      added?.match(
        existingRegistration,
        namedNode(INSTANCE),
        namedNode("https://example.com/AdressBook3"),
        namedNode("http://localhost:3003/example/profile/publicTypeIndex.ttl"),
      ).size,
    ).toBe(1);
  });

  it("Removes from the typeIndex", async () => {
    await setupFullTypeIndex(s.authFetch);

    const solidLdoDataset = createSolidLdoDataset();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO: come back and see if we can fix this
    await getTypeRegistrations(WEB_ID, { solidLdoDataset });

    const transaction = solidLdoDataset.startTransaction();
    removeRegistration(
      PUBLIC_TYPE_INDEX_URI,
      ADDRESS_BOOK,
      { instance: ["https://example.com/myPublicAddressBook.ttl"] },
      { solidLdoDataset: transaction },
    );
    removeRegistration(
      PRIVATE_TYPE_INDEX_URI,
      BOOKMARK,
      { instanceContainer: [`${ROOT_CONTAINER}myBookmarks/`] },
      { solidLdoDataset: transaction },
    );
    const { added, removed } = transaction.getChanges();

    expect(added).not.toBeDefined();
    expect(removed?.size).toBe(2);
  });
});
