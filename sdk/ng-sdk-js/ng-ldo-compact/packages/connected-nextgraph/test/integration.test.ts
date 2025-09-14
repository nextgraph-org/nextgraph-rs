import type { ConnectedLdoDataset } from "@ldo/connected";
import ng from "nextgraph";
import type {
  NextGraphConnectedPlugin,
  NextGraphResource,
  NextGraphUri,
} from "../src/index.js";
import { createNextGraphLdoDataset } from "../src/createNextGraphLdoDataset.js";
import { parseRdf } from "@ldo/ldo";
import { namedNode } from "@ldo/rdf-utils";
import type { NextGraphReadSuccess } from "../src/results/NextGraphReadSuccess.js";
import { rm, cp } from "fs/promises";
import path from "path";
import { describe, it, expect, beforeEach, afterAll } from "vitest";

const SAMPLE_TTL = `@base <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix rel: <http://www.perceive.net/schemas/relationship/> .

<#green-goblin>
    rel:enemyOf <#spiderman> ;
    a foaf:Person ;    # in the context of the Marvel universe
    foaf:name "Green Goblin" .

<#spiderman>
    rel:enemyOf <#green-goblin> ;
    a foaf:Person ;
    foaf:name "Spiderman", "Человек-паук"@ru .`;

describe("NextGraph Plugin", () => {
  let nextgraphLdoDataset: ConnectedLdoDataset<NextGraphConnectedPlugin[]>;

  beforeEach(async () => {
    // Generate a wallet
    const [wallet, mnemonic] = await ng.gen_wallet_for_test(
      "lL2mo9Jtgz8yWN5PSaEMMftDGXyKJNbv9atQOygmeTcA",
    );
    const openedWallet = await ng.wallet_open_with_mnemonic_words(
      wallet.wallet,
      mnemonic,
      [1, 2, 1, 2],
    );
    const userId = openedWallet.V0.personal_site;
    const walletName = openedWallet.V0.wallet_id;
    const session = await ng.session_in_memory_start(walletName, userId);
    const sessionId = session.session_id;
    const protectedStoreId = session.protected_store_id.substring(2, 46);
    const publicStoreId = session.protected_store_id.substring(2, 46);
    const privateStoreId = session.protected_store_id.substring(2, 46);

    // Get SessionId for that wallet
    nextgraphLdoDataset = createNextGraphLdoDataset();
    nextgraphLdoDataset.setContext("nextgraph", {
      ng,
      sessionId,
      protectedStoreId,
      publicStoreId,
      privateStoreId,
    });
  });

  afterAll(async () => {
    const dataDir = path.resolve(__dirname, "./nextgraph-data");
    const backupDir = path.resolve(__dirname, "./nextgraph-data-backup");
    // Remove the existing data directory
    await rm(dataDir, { recursive: true, force: true });
    // Copy the entire backup directory to data directory
    await cp(backupDir, dataDir, { recursive: true });
  });

  describe("createResource", () => {
    it("creates a resource by assuming the protected store", async () => {
      const resource = await nextgraphLdoDataset.createResource("nextgraph");
      expect(resource.isError).toBe(false);
      const resourceAsR = resource as NextGraphResource;
      expect(resourceAsR.uri).toBeDefined();
      expect(resourceAsR.isFetched()).toBe(true);
      expect(resourceAsR.isPresent()).toBe(true);
    });
  });

  describe("read and subscribe", () => {
    let populatedResourceUri: NextGraphUri;
    beforeEach(async () => {
      const resource = (await nextgraphLdoDataset.createResource(
        "nextgraph",
      )) as NextGraphResource;
      await resource.update({
        added: await parseRdf(SAMPLE_TTL),
      });
      nextgraphLdoDataset.forgetAllResources();
      nextgraphLdoDataset.deleteMatches(
        undefined,
        undefined,
        undefined,
        undefined,
      );
      populatedResourceUri = resource.uri;
    });

    it("reads a resource that exists", async () => {
      expect(nextgraphLdoDataset.size).toBe(0);
      const resource = nextgraphLdoDataset.getResource(populatedResourceUri);
      const result = await resource.read();
      expect(result.isError).toBe(false);
      expect(result.type).toBe("nextGraphReadSuccess");
      expect(resource.isAbsent()).toBe(false);
      expect(resource.isPresent()).toBe(true);
      expect(resource.isLoading()).toBe(false);
      expect(nextgraphLdoDataset.size).toBe(7);
      expect(
        nextgraphLdoDataset.match(
          namedNode("http://example.org/#spiderman"),
          namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
          namedNode("http://example.org/#green-goblin"),
          namedNode(resource.uri),
        ).size,
      ).toBe(1);
    });

    it("reads a resource that is absent", async () => {
      const nuri =
        "did:ng:o:W6GCQRfQkNTLtSS_2-QhKPJPkhEtLVh-B5lzpWMjGNEA:v:h8ViqyhCYMS2I6IKwPrY6UZi4ougUm1gpM4QnxlmNMQA";
      const resource = nextgraphLdoDataset.getResource(nuri);
      const readResult = await resource.read();
      expect(resource.uri).toBe(nuri);
      expect(readResult.type).toBe("nextGraphReadSuccess");
      expect(nextgraphLdoDataset.size).toBe(0);
      expect(resource.isLoading()).toBe(false);
      expect(resource.isAbsent()).toBe(true);
    });

    it("Reads a resource from memory.", async () => {
      const resource = nextgraphLdoDataset.getResource(populatedResourceUri);
      await resource.read();
      const result2 = await resource.readIfUnfetched();
      expect(result2.isError).toBe(false);
      const result = result2 as NextGraphReadSuccess;
      expect(result.type).toBe("nextGraphReadSuccess");
      expect(result.recalledFromMemory).toBe(true);
    });

    it("Subscribes to a resource", async () => {
      const resource = nextgraphLdoDataset.getResource(populatedResourceUri);
      await resource.subscribeToNotifications();
      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(nextgraphLdoDataset.size).toBe(7);
      expect(
        nextgraphLdoDataset.match(
          namedNode("http://example.org/#spiderman"),
          namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
          namedNode("http://example.org/#green-goblin"),
          namedNode(resource.uri),
        ).size,
      ).toBe(1);
      await resource.unsubscribeFromAllNotifications();
    });
  });
});
