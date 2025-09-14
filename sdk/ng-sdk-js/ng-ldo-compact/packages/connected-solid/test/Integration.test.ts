import {
  namedNode,
  quad as createQuad,
  literal,
  defaultGraph,
} from "@ldo/rdf-utils";
import type { CreateSuccess } from "../src/requester/results/success/CreateSuccess.js";
import { Buffer } from "buffer";
import { PostShShapeType } from "./.ldo/post.shapeTypes.js";
import type {
  ServerHttpError,
  UnauthenticatedHttpError,
  UnexpectedHttpError,
} from "../src/requester/results/error/HttpErrorResult.js";
import type { NoncompliantPodError } from "../src/requester/results/error/NoncompliantPodError.js";
import type { GetStorageContainerFromWebIdSuccess } from "../src/requester/results/success/CheckRootContainerSuccess.js";
import { wait } from "./utils.helper.js";
import path from "path";
import type {
  GetWacRuleSuccess,
  UpdateResultError,
  WacRule,
} from "../src/index.js";
import {
  createSolidLdoDataset,
  type SolidConnectedPlugin,
  type SolidContainer,
  type SolidContainerUri,
  type SolidLeaf,
  type SolidLeafUri,
} from "../src/index.js";
import type {
  AggregateError,
  AggregateSuccess,
  IgnoredInvalidUpdateSuccess,
  InvalidUriError,
  UnexpectedResourceError,
  UpdateDefaultGraphSuccess,
  UpdateSuccess,
  ConnectedLdoDataset,
} from "@ldo/connected";
import {
  changeData,
  commitData,
  ConnectedLdoTransactionDataset,
} from "@ldo/connected";
import { getStorageFromWebId } from "../src/getStorageFromWebId.js";
import type { ResourceInfo } from "@ldo/test-solid-server";
import { createApp, setupServer } from "@ldo/test-solid-server";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ROOT_CONTAINER = "http://localhost:3001/";
const WEB_ID = "http://localhost:3001/example/profile/card#me";
const TEST_CONTAINER_SLUG = "test_ldo/";
const TEST_CONTAINER_URI =
  `${ROOT_CONTAINER}${TEST_CONTAINER_SLUG}` as SolidContainerUri;
const SAMPLE_DATA_URI = `${TEST_CONTAINER_URI}sample.ttl` as SolidLeafUri;
const SAMPLE2_DATA_SLUG = "sample2.ttl";
const SAMPLE2_DATA_URI =
  `${TEST_CONTAINER_URI}${SAMPLE2_DATA_SLUG}` as SolidLeafUri;
const SAMPLE_BINARY_URI = `${TEST_CONTAINER_URI}sample.txt` as SolidLeafUri;
const SAMPLE2_BINARY_SLUG = `sample2.txt`;
const SAMPLE2_BINARY_URI =
  `${TEST_CONTAINER_URI}${SAMPLE2_BINARY_SLUG}` as SolidLeafUri;
const SAMPLE_CONTAINER_URI =
  `${TEST_CONTAINER_URI}sample_container/` as SolidContainerUri;
const SAMPLE_PROFILE_URI = `${TEST_CONTAINER_URI}profile.ttl` as SolidLeafUri;
const SPIDER_MAN_TTL = `@base <http://example.org/> .
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
const TEST_CONTAINER_TTL = `@prefix dc: <http://purl.org/dc/terms/>.
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
const _TEST_CONTAINER_ACL_URI = `${TEST_CONTAINER_URI}.acl`;
const TEST_CONTAINER_ACL = `<#b30e3fd1-b5a8-4763-ad9d-e95de9cf7933> a <http://www.w3.org/ns/auth/acl#Authorization>;
<http://www.w3.org/ns/auth/acl#accessTo> <${TEST_CONTAINER_URI}>;
<http://www.w3.org/ns/auth/acl#default> <${TEST_CONTAINER_URI}>;
<http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write>, <http://www.w3.org/ns/auth/acl#Append>, <http://www.w3.org/ns/auth/acl#Control>;
<http://www.w3.org/ns/auth/acl#agent> <${WEB_ID}>;
<http://www.w3.org/ns/auth/acl#agentClass> <http://xmlns.com/foaf/0.1/Agent>, <http://www.w3.org/ns/auth/acl#AuthenticatedAgent>.`;
const SAMPLE_PROFILE_TTL = `
@prefix pim: <http://www.w3.org/ns/pim/space#> .

<${SAMPLE_PROFILE_URI}> pim:storage <https://example.com/A/>, <https://example.com/B/> .
`;

const resourceInfo: ResourceInfo = {
  slug: TEST_CONTAINER_SLUG,
  isContainer: true,
  contains: [
    {
      slug: ".acl",
      isContainer: false,
      mimeType: "text/turtle",
      data: TEST_CONTAINER_ACL,
    },
    {
      slug: "sample.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: SPIDER_MAN_TTL,
    },
    {
      slug: "sample.txt",
      isContainer: false,
      mimeType: "text/plain",
      data: "some text.",
    },
    {
      slug: "profile.ttl",
      isContainer: false,
      mimeType: "text/turtle",
      data: SAMPLE_PROFILE_TTL,
    },
    {
      slug: "sample_container/",
      isContainer: true,
      shouldNotInit: true,
      contains: [],
    },
    {
      slug: SAMPLE2_DATA_SLUG,
      isContainer: false,
      shouldNotInit: true,
      mimeType: "text/turtle",
      data: "",
    },
    {
      slug: SAMPLE2_BINARY_SLUG,
      isContainer: false,
      shouldNotInit: true,
      mimeType: "text/plain",
      data: "",
    },
  ],
};

async function testRequestLoads<ReturnVal>(
  request: () => Promise<ReturnVal>,
  loadingResource: SolidLeaf | SolidContainer,
  loadingValues: Partial<{
    isLoading: boolean;
    isCreating: boolean;
    isReading: boolean;
    isUploading: boolean;
    isReloading: boolean;
    isDeleting: boolean;
    isUpdating: boolean;
    isDoingInitialFetch: boolean;
  }>,
): Promise<ReturnVal> {
  const allLoadingValues = {
    isLoading: false,
    isCreating: false,
    isReading: false,
    isUploading: false,
    isReloading: false,
    isDeleting: false,
    isUpdating: false,
    isDoingInitialFetch: false,
    ...loadingValues,
  };
  const [returnVal] = await Promise.all([
    request(),
    (async () => {
      Object.entries(allLoadingValues).forEach(([key, value]) => {
        if (
          loadingResource.type === "SolidContainer" &&
          (key === "isUploading" || key === "isUpdating")
        ) {
          return;
        }
        expect(loadingResource[key]()).toBe(value);
      });
    })(),
  ]);
  return returnVal;
}

describe("Integration", () => {
  let solidLdoDataset: ConnectedLdoDataset<SolidConnectedPlugin[]>;

  const s = setupServer(3001, resourceInfo);

  beforeEach(async () => {
    solidLdoDataset = createSolidLdoDataset();
    solidLdoDataset.setContext("solid", { fetch: s.fetchMock });
  });

  /**
   * General
   */
  describe("General", () => {
    it("Does not include the hash when creating a resource", () => {
      const resource = solidLdoDataset.getResource(
        "https://example.com/thing#hash",
      );
      expect(resource.uri).toBe("https://example.com/thing");
    });
  });

  /**
   * Read
   */
  describe("read", () => {
    it("Reads a data leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.type).toBe("dataReadSuccess");
      expect(
        solidLdoDataset.match(
          namedNode("http://example.org/#spiderman"),
          namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
          namedNode("http://example.org/#green-goblin"),
        ).size,
      ).toBe(1);
      expect(resource.isBinary()).toBe(false);
      expect(resource.isDataResource()).toBe(true);
      expect(resource.isPresent()).toBe(true);
    });

    // TODO: Possibly re-enable if Auto-read is required, but it might not be
    // it("Auto reads a resource", async () => {
    //   const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI, {
    //     autoLoad: true,
    //   });
    //   // Wait until the resource is auto-loaded
    //   await new Promise<void>((resolve) => {
    //     const interval = setInterval(() => {
    //       if (!resource.isReading()) {
    //         clearInterval(interval);
    //         resolve();
    //       }
    //     }, 250);
    //   });
    //   expect(
    //     solidLdoDataset.match(
    //       namedNode("http://example.org/#spiderman"),
    //       namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
    //       namedNode("http://example.org/#green-goblin"),
    //     ).size,
    //   ).toBe(1);
    // });

    it("Reads a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.type).toBe("containerReadSuccess");
      expect(resource.children().length).toBe(3);
    });

    it("Reads a binary leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.type).toBe("binaryReadSuccess");
      expect(resource.isBinary()).toBe(true);
      expect(await resource.getBlob()?.text()).toBe("some text.");
    });

    it("Returns an absent result if the document doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.type).toBe("absentReadSuccess");
      if (result.type !== "absentReadSuccess") return;
      expect(result.resource.isAbsent()).toBe(true);
    });

    it("Returns an ServerError when an 500 error is returned", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("Returns an Unauthorized error if a 403 error is returned", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 403 }));
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unauthorizedError");
    });

    it("Returns an UnauthenticatedError on an 401 error is returned", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 401 }));
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unauthenticatedError");
    });

    it("Returns an UnexpectedHttpError on a strange number error is returned", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 399 }));
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unexpectedHttpError");
    });

    it("Returns a NoncompliantPod error when no content type is returned", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(undefined, { status: 200, headers: {} }),
      );
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("noncompliantPodError");
      expect(result.message).toMatch(
        /\Response from .* is not compliant with the Solid Specification: Resource requests must return a content-type header\./,
      );
    });

    it("Returns a NoncompliantPod error if invalid turtle is provided", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response("Error", {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle" }),
        }),
      );
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("noncompliantPodError");
      expect(result.message).toMatch(
        /\Response from .* is not compliant with the Solid Specification: Request returned noncompliant turtle: Unexpected "Error" on line 1\./,
      );
    });

    it("Parses Turtle even when the content type contains parameters", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(SPIDER_MAN_TTL, {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle;charset=utf-8" }),
        }),
      );
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(false);
      if (result.isError) return;
      expect(result.type).toBe("dataReadSuccess");
    });

    it("Returns an UnexpectedResourceError if an unknown error is triggered", async () => {
      s.fetchMock.mockRejectedValueOnce(new Error("Something happened."));
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("unexpectedResourceError");
      expect(result.message).toBe("Something happened.");
    });

    it("Does not return an error if there is no link header for a container request", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle" }),
        }),
      );
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(() => resource.read(), resource, {
        isLoading: true,
        isReading: true,
        isDoingInitialFetch: true,
      });
      expect(result.isError).toBe(false);
      if (result.isError) return;
      expect(result.resource.isRootContainer()).toBe(false);
    });

    it("knows nothing about a leaf resource if it is not fetched", () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      expect(resource.isBinary()).toBe(undefined);
      expect(resource.isDataResource()).toBe(undefined);
      expect(resource.isUnfetched()).toBe(true);
      expect(resource.isPresent()).toBe(undefined);
    });

    it("batches the read request when a read request is currently happening", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const [result, result1] = await Promise.all([
        resource.read(),
        resource.read(),
      ]);

      expect(s.fetchMock).toHaveBeenCalledTimes(1);
      expect(result.type).toBe("dataReadSuccess");
      expect(result1.type).toBe("dataReadSuccess");
    });

    it("batches the read request when a read request is in queue", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const [, result, result1] = await Promise.all([
        resource.createAndOverwrite(),
        resource.read(),
        resource.read(),
      ]);

      expect(s.fetchMock).toHaveBeenCalledTimes(3);
      expect(result.type).toBe("dataReadSuccess");
      expect(result1.type).toBe("dataReadSuccess");
    });
  });

  /**
   * readIfUnfetched
   */
  describe("readIfUnfetched", () => {
    it("reads an unfetched container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.readIfUnfetched(),
        resource,
        {
          isLoading: true,
          isReading: true,
          isDoingInitialFetch: true,
        },
      );
      expect(result.type).toBe("containerReadSuccess");
      expect(resource.children().length).toBe(3);
    });

    it("reads an unfetched leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await testRequestLoads(
        () => resource.readIfUnfetched(),
        resource,
        {
          isLoading: true,
          isReading: true,
          isDoingInitialFetch: true,
        },
      );
      expect(result.type).toBe("dataReadSuccess");
      expect(
        solidLdoDataset.match(
          namedNode("http://example.org/#spiderman"),
          namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
          namedNode("http://example.org/#green-goblin"),
        ).size,
      ).toBe(1);
    });

    it("returns a cached existing container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      await resource.read();
      s.fetchMock.mockClear();
      const result = await resource.readIfUnfetched();
      expect(s.fetchMock).not.toHaveBeenCalled();
      expect(result.type).toBe("containerReadSuccess");
      expect(resource.children().length).toBe(3);
    });

    it("returns a cached existing data leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      await resource.read();
      s.fetchMock.mockClear();
      const result = await resource.readIfUnfetched();
      expect(result.type).toBe("dataReadSuccess");
      expect(
        solidLdoDataset.match(
          namedNode("http://example.org/#spiderman"),
          namedNode("http://www.perceive.net/schemas/relationship/enemyOf"),
          namedNode("http://example.org/#green-goblin"),
        ).size,
      ).toBe(1);
    });

    it("returns a cached existing binary leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      await resource.read();
      s.fetchMock.mockClear();
      const result = await resource.readIfUnfetched();
      expect(result.type).toBe("binaryReadSuccess");
    });

    it("returns a cached absent container", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_CONTAINER_URI);
      await resource.read();
      s.fetchMock.mockClear();
      const result = await resource.readIfUnfetched();
      expect(s.fetchMock).not.toHaveBeenCalled();
      expect(result.type).toBe("absentReadSuccess");
    });

    it("returns a cached absent leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      await resource.read();
      s.fetchMock.mockClear();
      const result = await resource.readIfUnfetched();
      expect(s.fetchMock).not.toHaveBeenCalled();
      expect(result.type).toBe("absentReadSuccess");
    });
  });

  /**
   * Get Root Container
   */
  describe("rootContainer", () => {
    it("Finds the root container", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_BINARY_URI);
      const result = await resource.getRootContainer();
      expect(result.type).toBe("SolidContainer");
      if (result.type !== "SolidContainer") return;
      expect(result.uri).toBe(ROOT_CONTAINER);
      expect(result.isRootContainer()).toBe(true);
    });

    it("Returns an error if there is no root container", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle" }),
        }),
      );
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle" }),
        }),
      );
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 200,
          headers: new Headers({ "content-type": "text/turtle" }),
        }),
      );
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.getRootContainer();
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("noRootContainerError");
      expect(result.message).toMatch(/\.* has not root container\./);
    });

    it("An error to be returned if a common http error is encountered", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.getRootContainer();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("Returns an UnexpectedResourceError if an unknown error is triggered", async () => {
      s.fetchMock.mockRejectedValueOnce(new Error("Something happened."));
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.getRootContainer();
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("unexpectedResourceError");
      expect(result.message).toBe("Something happened.");
    });

    it("returns a NonCompliantPodError when there is no root", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 200,
          headers: new Headers({
            "content-type": "text/turtle",
            link: '<http://www.w3.org/ns/ldp#Resource>; rel="type"',
          }),
        }),
      );
      const resource = solidLdoDataset.getResource(ROOT_CONTAINER);
      const result = await resource.getRootContainer();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("noRootContainerError");
    });
  });

  /**
   * Get Storage From WebId
   */
  describe("getStorageFromWebId", () => {
    it("Gets storage when a pim:storage field isn't present", async () => {
      const result = await getStorageFromWebId(
        SAMPLE_DATA_URI,
        solidLdoDataset,
      );
      expect(result.type).toBe("getStorageContainerFromWebIdSuccess");
      const realResult = result as GetStorageContainerFromWebIdSuccess;
      expect(realResult.storageContainers.length).toBe(1);
      expect(realResult.storageContainers[0].uri).toBe(ROOT_CONTAINER);
    });

    it("Gets storage when a pim:storage field is present", async () => {
      const result = await getStorageFromWebId(
        SAMPLE_PROFILE_URI,
        solidLdoDataset,
      );
      expect(result.type).toBe("getStorageContainerFromWebIdSuccess");
      const realResult = result as GetStorageContainerFromWebIdSuccess;
      expect(realResult.storageContainers.length).toBe(2);
      expect(realResult.storageContainers[0].uri).toBe(
        "https://example.com/A/",
      );
      expect(realResult.storageContainers[1].uri).toBe(
        "https://example.com/B/",
      );
    });

    it("Passes any errors returned from the read method", async () => {
      s.fetchMock.mockRejectedValueOnce(new Error("Something happened."));
      const result = await getStorageFromWebId(
        SAMPLE_DATA_URI,
        solidLdoDataset,
      );
      expect(result.isError).toBe(true);
    });

    it("Passes any errors returned from the getRootContainer method", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response(""));
      s.fetchMock.mockRejectedValueOnce(new Error("Something happened."));
      const result = await getStorageFromWebId(
        SAMPLE_DATA_URI,
        solidLdoDataset,
      );
      expect(result.isError).toBe(true);
    });
  });

  /**
   * ===========================================================================
   * Create
   * ===========================================================================
   */
  describe("createAndOverwrite", () => {
    it("creates a document that doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createAndOverwrite(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE2_DATA_URI),
      ).toBe(true);
    });

    it("creates a data resource that doesn't exist while overwriting", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createAndOverwrite(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );
      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(true);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE_DATA_URI),
      ).toBe(true);
    });

    it("creates a container", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_CONTAINER_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createAndOverwrite(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );
      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidContainer>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_CONTAINER_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container
          .children()
          .some((child) => child.uri === SAMPLE_CONTAINER_URI),
      ).toBe(true);
    });

    it("returns and error if creating a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const result = await resource.createAndOverwrite();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns a delete error if delete failed", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const result = await resource.createAndOverwrite();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns an error if the create fetch fails", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockImplementationOnce(async (...args) => {
        return s.authFetch(...args);
      });
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const result = await resource.createAndOverwrite();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns an unexpected error if some unknown error is triggered", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockImplementationOnce(async (...args) => {
        return s.authFetch(...args);
      });
      s.fetchMock.mockImplementationOnce(async () => {
        throw new Error("Some Unknown");
      });
      const result = await resource.createAndOverwrite();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unexpectedResourceError");
    });

    it("batches the create request while waiting on another request", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const [, result1, result2] = await Promise.all([
        resource.read(),
        resource.createAndOverwrite(),
        resource.createAndOverwrite(),
      ]);

      expect(result1.type).toBe("createSuccess");
      expect(result2.type).toBe("createSuccess");
      // 1 for read, 1 for delete in createAndOverwrite, 1 for create
      expect(s.fetchMock).toHaveBeenCalledTimes(3);
    });

    it("batches the create request while waiting on a similar request", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const [result1, result2] = await Promise.all([
        resource.createAndOverwrite(),
        resource.createAndOverwrite(),
      ]);

      expect(result1.type).toBe("createSuccess");
      expect(result2.type).toBe("createSuccess");
      // 1 for delete in createAndOverwrite, 1 for create
      expect(s.fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("createIfAbsent", () => {
    it("creates a data resource that doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createIfAbsent(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE2_DATA_URI),
      ).toBe(true);
    });

    it("doesn't overwrite a resources that does exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createIfAbsent(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );

      expect(result.type).toBe("dataReadSuccess");
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE_DATA_URI),
      ).toBe(true);
    });

    it("creates a container that doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_CONTAINER_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () => resource.createIfAbsent(),
        resource,
        {
          isLoading: true,
          isCreating: true,
        },
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidContainer>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_CONTAINER_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container
          .children()
          .some((child) => child.uri === SAMPLE_CONTAINER_URI),
      ).toBe(true);
    });

    it("returns an error if creating a container", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_CONTAINER_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(SAMPLE_CONTAINER_URI, {
          status: 500,
        }),
      );
      const result = await resource.createIfAbsent();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns an error if creating a leaf", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(SAMPLE2_DATA_URI, {
          status: 500,
        }),
      );
      const result = await resource.createIfAbsent();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });
  });

  /**
   * Delete
   */
  describe("deleteResource", () => {
    it("returns an unexpected http error if an unexpected value is returned", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 214,
        }),
      );
      const result = await resource.delete();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unexpectedHttpError");
    });

    it("returns an unexpected resource error if an unknown error is triggered", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockImplementationOnce(async () => {
        throw new Error("Some unknwon");
      });
      const result = await resource.delete();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unexpectedResourceError");
    });

    it("deletes a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.delete();
      expect(result.type === "deleteSuccess");
    });

    it("returns an error on container read when deleting a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockImplementation(async (input, init) => {
        if (
          (init?.method === "get" || !init?.method) &&
          input === TEST_CONTAINER_URI
        ) {
          return new Response(SAMPLE_DATA_URI, {
            status: 500,
          });
        }
        return s.authFetch(input, init);
      });
      const result = await resource.delete();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("aggregateError");
      const aggregateError = result as AggregateError<
        | ServerHttpError<SolidLeaf | SolidContainer>
        | UnexpectedHttpError<SolidLeaf | SolidContainer>
        | UnauthenticatedHttpError<SolidLeaf | SolidContainer>
        | UnexpectedResourceError<SolidLeaf | SolidContainer>
        | NoncompliantPodError<SolidLeaf | SolidContainer>
      >;
      expect(aggregateError.errors[0].type).toBe("serverError");
    });

    it("returns an error on child delete when deleting a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockImplementation(async (input, init) => {
        if (init?.method === "delete" && input === SAMPLE_DATA_URI) {
          return new Response(SAMPLE_DATA_URI, {
            status: 500,
          });
        }
        return s.authFetch(input, init);
      });
      const result = await resource.delete();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("aggregateError");
      const aggregateError = result as AggregateError<
        | ServerHttpError<SolidLeaf | SolidContainer>
        | UnexpectedHttpError<SolidLeaf | SolidContainer>
        | UnauthenticatedHttpError<SolidLeaf | SolidContainer>
        | UnexpectedResourceError<SolidLeaf | SolidContainer>
        | NoncompliantPodError<SolidLeaf | SolidContainer>
      >;
      expect(aggregateError.errors[0].type).toBe("serverError");
    });

    it("returns an error on container delete when deleting a container", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockImplementation(async (input, init) => {
        if (init?.method === "delete" && input === TEST_CONTAINER_URI) {
          return new Response(SAMPLE_DATA_URI, {
            status: 500,
          });
        }
        return s.authFetch(input, init);
      });
      const result = await resource.delete();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });
  });

  /**
   * Update
   */
  describe("updateDataResource", () => {
    const normanQuad = createQuad(
      namedNode("http://example.org/#green-goblin"),
      namedNode("http://xmlns.com/foaf/0.1/name"),
      literal("Norman Osborn"),
      namedNode(SAMPLE_DATA_URI),
    );

    const goblinQuad = createQuad(
      namedNode("http://example.org/#green-goblin"),
      namedNode("http://xmlns.com/foaf/0.1/name"),
      literal("Green Goblin"),
      namedNode(SAMPLE_DATA_URI),
    );

    it("applies changes to a Pod", async () => {
      const result = await testRequestLoads(
        () => {
          const transaction = solidLdoDataset.startTransaction();
          transaction.add(normanQuad);
          transaction.delete(goblinQuad);
          return transaction.commitToRemote();
        },
        solidLdoDataset.getResource(SAMPLE_DATA_URI),
        {
          isLoading: true,
          isUpdating: true,
        },
      );
      expect(result.type).toBe("aggregateSuccess");
      const aggregateSuccess = result as AggregateSuccess<
        UpdateSuccess<SolidLeaf>
      >;
      expect(aggregateSuccess.results.length).toBe(1);
      expect(aggregateSuccess.results[0].type === "updateSuccess").toBe(true);
      expect(solidLdoDataset.has(normanQuad)).toBe(true);
      expect(solidLdoDataset.has(goblinQuad)).toBe(false);
    });

    it("applies only remove changes to the Pod", async () => {
      const result = await testRequestLoads(
        () => {
          const transaction = solidLdoDataset.startTransaction();
          transaction.delete(goblinQuad);
          return transaction.commitToRemote();
        },
        solidLdoDataset.getResource(SAMPLE_DATA_URI),
        {
          isLoading: true,
          isUpdating: true,
        },
      );
      expect(result.type).toBe("aggregateSuccess");
      const aggregateSuccess = result as AggregateSuccess<
        UpdateSuccess<SolidLeaf>
      >;
      expect(aggregateSuccess.results.length).toBe(1);
      expect(aggregateSuccess.results[0].type === "updateSuccess").toBe(true);
      expect(solidLdoDataset.has(goblinQuad)).toBe(false);
    });

    it("handles an HTTP error", async () => {
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 500 }));

      const transaction = solidLdoDataset.startTransaction();
      transaction.add(normanQuad);
      transaction.delete(goblinQuad);
      const result = await transaction.commitToRemote();

      expect(result.isError).toBe(true);
      expect(result.type).toBe("aggregateError");
      const aggregateError = result as AggregateError<
        | UpdateResultError<SolidLeaf | SolidContainer>
        | InvalidUriError<SolidLeaf | SolidContainer>
      >;
      expect(aggregateError.errors.length).toBe(1);
      expect(aggregateError.errors[0].type).toBe("serverError");
    });

    it("handles an unknown request", async () => {
      s.fetchMock.mockImplementationOnce(() => {
        throw new Error("Some Error");
      });
      const transaction = solidLdoDataset.startTransaction();
      transaction.add(normanQuad);
      transaction.delete(goblinQuad);
      const result = await transaction.commitToRemote();
      expect(result.isError).toBe(true);
      expect(result.type).toBe("aggregateError");
      const aggregateError = result as AggregateError<
        | UpdateResultError<SolidLeaf | SolidContainer>
        | InvalidUriError<SolidLeaf | SolidContainer>
      >;
      expect(aggregateError.errors.length).toBe(1);
      expect(aggregateError.errors[0].type).toBe("unexpectedResourceError");
    });

    it("ignores update when trying to update a container", async () => {
      const badContainerQuad = createQuad(
        namedNode("http://example.org/#green-goblin"),
        namedNode("http://xmlns.com/foaf/0.1/name"),
        literal("Norman Osborn"),
        namedNode(SAMPLE_CONTAINER_URI),
      );
      const transaction = solidLdoDataset.startTransaction();
      transaction.add(badContainerQuad);
      const result = await transaction.commitToRemote();
      expect(result.isError).toBe(false);
      expect(result.type).toBe("aggregateSuccess");
      const aggregateSuccess = result as AggregateSuccess<
        | UpdateSuccess<SolidLeaf | SolidContainer>
        | IgnoredInvalidUpdateSuccess<SolidLeaf | SolidContainer>
      >;
      expect(aggregateSuccess.results.length).toBe(1);
      expect(aggregateSuccess.results[0].type).toBe(
        "ignoredInvalidUpdateSuccess",
      );
    });

    it("writes to the default graph without fetching", async () => {
      const defaultGraphQuad = createQuad(
        namedNode("http://example.org/#green-goblin"),
        namedNode("http://xmlns.com/foaf/0.1/name"),
        literal("Norman Osborn"),
        defaultGraph(),
      );
      const transaction = solidLdoDataset.startTransaction();
      transaction.add(defaultGraphQuad);
      const result = await transaction.commitToRemote();
      expect(result.type).toBe("aggregateSuccess");
      const aggregateSuccess = result as AggregateSuccess<
        UpdateSuccess<SolidLeaf | SolidContainer> | UpdateDefaultGraphSuccess
      >;
      expect(aggregateSuccess.results.length).toBe(1);
      expect(aggregateSuccess.results[0].type).toBe(
        "updateDefaultGraphSuccess",
      );
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode("http://example.org/#green-goblin"),
            namedNode("http://xmlns.com/foaf/0.1/name"),
            literal("Norman Osborn"),
            defaultGraph(),
          ),
        ),
      ).toBe(true);
    });

    it("batches data update changes", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);

      const transaction1 = solidLdoDataset.startTransaction();
      transaction1.delete(goblinQuad);
      const transaction2 = solidLdoDataset.startTransaction();
      transaction2.add(normanQuad);

      const [, updateResult1, updateResult2] = await Promise.all([
        resource.read(),
        transaction1.commitToRemote(),
        transaction2.commitToRemote(),
      ]);
      expect(updateResult1.type).toBe("aggregateSuccess");
      expect(updateResult2.type).toBe("aggregateSuccess");
      expect(s.fetchMock).toHaveBeenCalledTimes(2);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode("http://example.org/#green-goblin"),
            namedNode("http://xmlns.com/foaf/0.1/name"),
            literal("Norman Osborn"),
            namedNode(SAMPLE_DATA_URI),
          ),
        ),
      ).toBe(true);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode("http://example.org/#green-goblin"),
            namedNode("http://xmlns.com/foaf/0.1/name"),
            literal("Green Goblin"),
            namedNode(SAMPLE_DATA_URI),
          ),
        ),
      ).toBe(false);
    });
  });

  it("allows a transaction on a transaction", () => {
    const transaction = solidLdoDataset.startTransaction();
    const transaction2 = transaction.startTransaction();
    expect(transaction2).toBeInstanceOf(ConnectedLdoTransactionDataset);
  });

  /**
   * ===========================================================================
   * Upload
   * ===========================================================================
   */
  describe("uploadAndOverwrite", () => {
    it("uploads a document that doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_BINARY_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () =>
          resource.uploadAndOverwrite(
            Buffer.from("some text.") as unknown as Blob,
            "text/plain",
          ),
        resource,
        {
          isLoading: true,
          isUploading: true,
        },
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE2_BINARY_URI),
      ).toBe(true);
      expect(resource.getMimeType()).toBe("text/plain");
      expect(resource.isBinary()).toBe(true);
      expect(resource.isDataResource()).toBe(false);
    });

    it("creates a binary resource that doesn't exist while overwriting", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () =>
          resource.uploadAndOverwrite(
            Buffer.from("some text.") as unknown as Blob,
            "text/plain",
          ),
        resource,
        {
          isLoading: true,
          isUploading: true,
        },
      );
      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(true);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE_BINARY_URI),
      ).toBe(true);
    });

    it("returns a delete error if delete failed", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const result = await resource.uploadAndOverwrite(
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns an error if the create fetch fails", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      s.fetchMock.mockImplementationOnce(async (...args) => {
        return s.authFetch(...args);
      });
      s.fetchMock.mockResolvedValueOnce(
        new Response(TEST_CONTAINER_TTL, {
          status: 500,
        }),
      );
      const result = await resource.uploadAndOverwrite(
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });

    it("returns an unexpected error if some unknown error is triggered", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      s.fetchMock.mockImplementationOnce(async (...args) => {
        return s.authFetch(...args);
      });
      s.fetchMock.mockImplementationOnce(async () => {
        throw new Error("Some Unknown");
      });
      const result = await resource.uploadAndOverwrite(
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );
      expect(result.isError).toBe(true);
      expect(result.type).toBe("unexpectedResourceError");
    });

    it("batches the upload request while waiting on another request", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const [, result1, result2] = await Promise.all([
        resource.read(),
        resource.uploadAndOverwrite(
          Buffer.from("some text.") as unknown as Blob,
          "text/plain",
        ),
        resource.uploadAndOverwrite(
          Buffer.from("some text 2.") as unknown as Blob,
          "text/plain",
        ),
      ]);

      expect(result1.type).toBe("createSuccess");
      expect(result2.type).toBe("createSuccess");
      // 1 for read, 1 for delete in createAndOverwrite, 1 for create
      expect(s.fetchMock).toHaveBeenCalledTimes(3);
      expect(resource.getBlob()?.toString()).toBe("some text 2.");
    });

    it("batches the upload request while waiting on a similar request", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const [result1, result2] = await Promise.all([
        resource.uploadAndOverwrite(
          Buffer.from("some text.") as unknown as Blob,
          "text/plain",
        ),
        resource.uploadAndOverwrite(
          Buffer.from("some text 2.") as unknown as Blob,
          "text/plain",
        ),
      ]);

      expect(result1.type).toBe("createSuccess");
      expect(result2.type).toBe("createSuccess");
      // 1 for delete in createAndOverwrite, 1 for create
      expect(s.fetchMock).toHaveBeenCalledTimes(2);
      expect(resource.getBlob()?.toString()).toBe("some text 2.");
    });
  });

  describe("uploadIfAbsent", () => {
    it("creates a binary resource that doesn't exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_BINARY_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () =>
          resource.uploadIfAbsent(
            Buffer.from("some text.") as unknown as Blob,
            "text/plain",
          ),
        resource,
        {
          isLoading: true,
          isUploading: true,
        },
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE2_BINARY_URI),
      ).toBe(true);
    });

    it("doesn't overwrite a binary resource that does exist", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_BINARY_URI);
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await testRequestLoads(
        () =>
          resource.uploadIfAbsent(
            Buffer.from("some text.") as unknown as Blob,
            "text/plain",
          ),
        resource,
        {
          isLoading: true,
          isUploading: true,
        },
      );

      expect(result.type).toBe("binaryReadSuccess");
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        container.children().some((child) => child.uri === SAMPLE_BINARY_URI),
      ).toBe(true);
    });

    it("returns an error if an error is encountered", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_BINARY_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response(SAMPLE2_BINARY_URI, {
          status: 500,
        }),
      );
      const result = await resource.uploadIfAbsent(
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );
      expect(result.isError).toBe(true);
      expect(result.type).toBe("serverError");
    });
  });

  /**
   * ===========================================================================
   * Methods
   * ===========================================================================
   */
  describe("methods", () => {
    it("creates a data object for a specific subject", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const post = solidLdoDataset.createData(
        PostShShapeType,
        "https://example.com/subject",
        resource,
      );
      post.type = { "@id": "CreativeWork" };
      expect(post.type["@id"]).toBe("CreativeWork");
      const result = await commitData(post);
      expect(result.type).toBe("aggregateSuccess");
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode("https://example.com/subject"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://schema.org/CreativeWork"),
            namedNode(SAMPLE_DATA_URI),
          ),
        ),
      ).toBe(true);
    });

    it("handles an error when committing data", async () => {
      s.fetchMock.mockResolvedValueOnce(
        new Response(SAMPLE_DATA_URI, {
          status: 500,
        }),
      );
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const post = solidLdoDataset.createData(
        PostShShapeType,
        "https://example.com/subject",
        resource,
      );
      post.type = { "@id": "CreativeWork" };
      expect(post.type["@id"]).toBe("CreativeWork");
      const result = await commitData(post);
      expect(result.isError).toBe(true);
    });

    it("uses changeData to start a transaction", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      solidLdoDataset.add(
        createQuad(
          namedNode("https://example.com/subject"),
          namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
          namedNode("http://schema.org/CreativeWork"),
          namedNode(SAMPLE_DATA_URI),
        ),
      );
      const post = solidLdoDataset
        .usingType(PostShShapeType)
        .fromSubject("https://example.com/subject");
      const cPost = changeData(post, resource);
      cPost.type = { "@id": "SocialMediaPosting" };
      expect(cPost.type["@id"]).toBe("SocialMediaPosting");
      const result = await commitData(cPost);
      expect(result.isError).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode("https://example.com/subject"),
            namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
            namedNode("http://schema.org/SocialMediaPosting"),
            namedNode(SAMPLE_DATA_URI),
          ),
        ),
      ).toBe(true);
    });
  });

  /**
   * ===========================================================================
   * Container-Specific Methods
   * ===========================================================================
   */
  describe("container specific", () => {
    it("returns the child with the child method", () => {
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const child = container.child(SAMPLE2_DATA_SLUG);
      expect(child.uri).toBe(SAMPLE2_DATA_URI);
    });

    it("runs createAndOverwrite for a child via the createChildAndOverwrite method", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.createChildAndOverwrite(SAMPLE2_DATA_SLUG);

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.resource.uri).toBe(SAMPLE2_DATA_URI);
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        resource.children().some((child) => child.uri === SAMPLE2_DATA_URI),
      ).toBe(true);
    });

    it("runs createIfAbsent for a child via the createChildIfAbsent method", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.createChildIfAbsent(SAMPLE2_DATA_SLUG);

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.resource.uri).toBe(SAMPLE2_DATA_URI);
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_DATA_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        resource.children().some((child) => child.uri === SAMPLE2_DATA_URI),
      ).toBe(true);
    });

    it("runs uploadAndOverwrite for a child via the uploadChildAndOverwrite method", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.uploadChildAndOverwrite(
        SAMPLE2_BINARY_SLUG,
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.resource.uri).toBe(SAMPLE2_BINARY_URI);
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        resource.children().some((child) => child.uri === SAMPLE2_BINARY_URI),
      ).toBe(true);
    });

    it("runs uploadIfAbsent for a child via the uploadChildIfAbsent method", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.uploadChildIfAbsent(
        SAMPLE2_BINARY_SLUG,
        Buffer.from("some text.") as unknown as Blob,
        "text/plain",
      );

      expect(result.type).toBe("createSuccess");
      const createSuccess = result as CreateSuccess<SolidLeaf>;
      expect(createSuccess.resource.uri).toBe(SAMPLE2_BINARY_URI);
      expect(createSuccess.didOverwrite).toBe(false);
      expect(
        solidLdoDataset.has(
          createQuad(
            namedNode(TEST_CONTAINER_URI),
            namedNode("http://www.w3.org/ns/ldp#contains"),
            namedNode(SAMPLE2_BINARY_URI),
            namedNode(TEST_CONTAINER_URI),
          ),
        ),
      ).toBe(true);
      expect(
        resource.children().some((child) => child.uri === SAMPLE2_BINARY_URI),
      ).toBe(true);
    });
  });

  /**
   * ===========================================================================
   * ACCESS CONTROL
   * ===========================================================================
   */
  describe("getWacRule", () => {
    it("Fetches a wac rules for a container that has a corresponding acl", async () => {
      const container = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const wacResult = await container.getWac();
      expect(wacResult.isError).toBe(false);
      const wacSuccess = wacResult as GetWacRuleSuccess<
        SolidLeaf | SolidContainer
      >;
      expect(wacSuccess.wacRule.public).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.authenticated).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.agent[WEB_ID]).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
    });

    it("Gets wac rules of a parent resource for a resource that does not have a corresponding acl", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(false);
      const wacSuccess = wacResult as GetWacRuleSuccess<
        SolidLeaf | SolidContainer
      >;
      expect(wacSuccess.wacRule.public).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.authenticated).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.agent[WEB_ID]).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
    });

    it("uses cached values for a retrieved resource", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      await resource.getWac();
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(false);
      const wacSuccess = wacResult as GetWacRuleSuccess<
        SolidLeaf | SolidContainer
      >;
      expect(wacSuccess.wacRule.public).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.authenticated).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
      expect(wacSuccess.wacRule.agent[WEB_ID]).toEqual({
        read: true,
        write: true,
        append: true,
        control: true,
      });
    });

    it("returns an error when an error is encountered fetching the aclUri", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("serverError");
    });

    it("returns an error when a document is not found", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("notFoundError");
    });

    it("returns a non-compliant error if a response is returned without a link header", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("Error", {
          status: 200,
        }),
      );
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("noncompliantPodError");
      expect(
        (wacResult as NoncompliantPodError<SolidLeaf | SolidContainer>).message,
      ).toBe(
        `Response from ${SAMPLE_DATA_URI} is not compliant with the Solid Specification: No link header present in request.`,
      );
    });

    it("returns a non-compliant error if a response is returned without an ACL link", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("Error", {
          status: 200,
          headers: { link: `<card.meta>; rel="describedBy"` },
        }),
      );
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("noncompliantPodError");
      expect(
        (wacResult as NoncompliantPodError<SolidLeaf | SolidContainer>).message,
      ).toBe(
        `Response from ${SAMPLE_DATA_URI} is not compliant with the Solid Specification: There must be one link with a rel="acl"`,
      );
    });

    it("Returns an UnexpectedResourceError if an unknown error is triggered while getting the wac URI", async () => {
      s.fetchMock.mockRejectedValueOnce(new Error("Something happened."));
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await resource.getWac();
      expect(result.isError).toBe(true);
      if (!result.isError) return;
      expect(result.type).toBe("unexpectedResourceError");
      expect(result.message).toBe("Something happened.");
    });

    it("Returns an error if the request to get the ACL fails", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { link: `<card.acl>; rel="acl"` },
        }),
      );
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("serverError");
    });

    it("Returns a non-compliant error if the root uri has no ACL", () => {});

    it("Returns an error if the request to the ACL resource returns invalid turtle", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { link: `<card.acl>; rel="acl"` },
        }),
      );
      s.fetchMock.mockResolvedValueOnce(
        new Response("BAD TURTLE", { status: 200 }),
      );
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("noncompliantPodError");
      expect(
        (wacResult as NoncompliantPodError<SolidLeaf | SolidContainer>).message,
      ).toBe(
        `Response from http://localhost:3001/test_ldo/sample.ttl is not compliant with the Solid Specification: Request returned noncompliant turtle: Unexpected "BAD" on line 1.\nBAD TURTLE`,
      );
    });

    it("Returns an error if there was a problem getting the parent resource", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { link: `<card.acl>; rel="acl"` },
        }),
      );
      s.fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
      s.fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("serverError");
    });

    it("returns a NonCompliantPodError when this is the root resource and it doesn't have an ACL", async () => {
      const resource = solidLdoDataset.getResource(ROOT_CONTAINER);
      s.fetchMock.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { link: `<card.acl>; rel="acl"` },
        }),
      );
      s.fetchMock.mockResolvedValueOnce(new Response("", { status: 404 }));
      const wacResult = await resource.getWac();
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("noncompliantPodError");
      expect(
        (wacResult as NoncompliantPodError<SolidLeaf | SolidContainer>).message,
      ).toBe(
        `Response from ${ROOT_CONTAINER} is not compliant with the Solid Specification: Resource "${ROOT_CONTAINER}" has no Effective ACL resource`,
      );
    });
  });

  describe("setWacRule", () => {
    const newRules: WacRule = {
      public: { read: true, write: false, append: false, control: false },
      authenticated: {
        read: true,
        write: false,
        append: true,
        control: false,
      },
      agent: {
        [WEB_ID]: { read: true, write: true, append: true, control: true },
      },
    };

    it("sets wac rules for a resource that didn't have one before", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await resource.setWac(newRules);
      expect(result.isError).toBe(false);
      expect(result.type).toBe("setWacRuleSuccess");
      const readResult = await resource.getWac({ ignoreCache: true });
      expect(readResult.isError).toBe(false);
      expect(readResult.type).toBe("getWacRuleSuccess");
      const rules = (
        readResult as GetWacRuleSuccess<SolidLeaf | SolidContainer>
      ).wacRule;
      expect(rules).toEqual(newRules);
    });

    it("overwrites an existing access control rule", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      const result = await resource.setWac(newRules);
      expect(result.isError).toBe(false);
      expect(result.type).toBe("setWacRuleSuccess");
      const readResult = await resource.getWac({ ignoreCache: true });
      expect(readResult.isError).toBe(false);
      expect(readResult.type).toBe("getWacRuleSuccess");
      const rules = (
        readResult as GetWacRuleSuccess<SolidLeaf | SolidContainer>
      ).wacRule;
      expect(rules).toEqual(newRules);
    });

    it("Does not write a rule when access is not granted to an agent", async () => {
      const moreRules = {
        ...newRules,
        public: { read: false, write: false, append: false, control: false },
      };
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const result = await resource.setWac(moreRules);
      expect(result.isError).toBe(false);
      expect(result.type).toBe("setWacRuleSuccess");
      const readResult = await resource.getWac({ ignoreCache: true });
      expect(readResult.isError).toBe(false);
      expect(readResult.type).toBe("getWacRuleSuccess");
      const rules = (
        readResult as GetWacRuleSuccess<SolidLeaf | SolidContainer>
      ).wacRule;
      expect(rules).toEqual(moreRules);
    });

    it("returns an error when an error is encountered fetching the aclUri", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      s.fetchMock.mockResolvedValueOnce(new Response("Error", { status: 500 }));
      const wacResult = await resource.setWac(newRules);
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("serverError");
    });

    it("Returns an error when the request to write the access rules throws an error", async () => {
      const resource = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      s.fetchMock.mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: { link: `<card.acl>; rel="acl"` },
        }),
      );
      s.fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));
      const wacResult = await resource.setWac(newRules);
      expect(wacResult.isError).toBe(true);
      expect(wacResult.type).toBe("serverError");
    });
  });

  /**
   * ===========================================================================
   * NOTIFICATION SUBSCRIPTIONS
   * ===========================================================================
   */
  describe("Notification Subscriptions", () => {
    const spidermanNode = namedNode("http://example.org/#spiderman");
    const foafNameNode = namedNode("http://xmlns.com/foaf/0.1/name");

    afterEach(async () => {
      await Promise.all(
        solidLdoDataset.getResources().map(async (resource) => {
          await resource.unsubscribeFromAllNotifications();
        }),
      );
    });

    it("handles notification when a resource is updated", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      await resource.read();

      const spidermanCallback = vi.fn();
      solidLdoDataset.addListener(
        [spidermanNode, null, null, null],
        spidermanCallback,
      );

      const subscriptionId = await resource.subscribeToNotifications();

      expect(resource.isSubscribedToNotifications()).toBe(true);

      await s.authFetch(SAMPLE_DATA_URI, {
        method: "PATCH",
        body: 'INSERT DATA { <http://example.org/#spiderman> <http://xmlns.com/foaf/0.1/name> "Peter Parker" . }',
        headers: {
          "Content-Type": "application/sparql-update",
        },
      });
      await wait(1000);

      expect(
        solidLdoDataset.match(
          spidermanNode,
          foafNameNode,
          literal("Peter Parker"),
        ).size,
      ).toBe(1);
      expect(spidermanCallback).toHaveBeenCalledTimes(1);

      // Notification is not propogated after unsubscribe
      spidermanCallback.mockClear();
      await resource.unsubscribeFromNotifications(subscriptionId);
      expect(resource.isSubscribedToNotifications()).toBe(false);
      await s.authFetch(SAMPLE_DATA_URI, {
        method: "PATCH",
        body: 'INSERT DATA { <http://example.org/#spiderman> <http://xmlns.com/foaf/0.1/name> "Miles Morales" . }',
        headers: {
          "Content-Type": "application/sparql-update",
        },
      });
      await wait(50);

      expect(spidermanCallback).not.toHaveBeenCalled();
      expect(
        solidLdoDataset.match(
          spidermanNode,
          foafNameNode,
          literal("Miles Morales"),
        ).size,
      ).toBe(0);
    });

    it("handles notification when subscribed to a child that is deleted", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const testContainer = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      await resource.read();

      const spidermanCallback = vi.fn();
      solidLdoDataset.addListener(
        [spidermanNode, null, null, null],
        spidermanCallback,
      );

      const containerCallback = vi.fn();
      solidLdoDataset.addListener(
        [namedNode(TEST_CONTAINER_URI), null, null, null],
        containerCallback,
      );

      await resource.subscribeToNotifications();

      await s.authFetch(SAMPLE_DATA_URI, {
        method: "DELETE",
      });
      await wait(1000);

      expect(solidLdoDataset.match(spidermanNode, null, null).size).toBe(0);
      expect(
        testContainer.children().some((child) => child.uri === SAMPLE_DATA_URI),
      ).toBe(false);
      expect(spidermanCallback).toHaveBeenCalledTimes(1);
      expect(containerCallback).toHaveBeenCalledTimes(1);

      await resource.unsubscribeFromAllNotifications();
    });

    it("handles notification when subscribed to a parent with a deleted child", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const testContainer = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      await resource.read();

      const spidermanCallback = vi.fn();
      solidLdoDataset.addListener(
        [spidermanNode, null, null, null],
        spidermanCallback,
      );

      const containerCallback = vi.fn();
      solidLdoDataset.addListener(
        [namedNode(TEST_CONTAINER_URI), null, null, null],
        containerCallback,
      );

      await testContainer.subscribeToNotifications();

      await s.authFetch(SAMPLE_DATA_URI, {
        method: "DELETE",
      });
      await wait(1000);

      expect(solidLdoDataset.match(spidermanNode, null, null).size).toBe(0);
      expect(
        testContainer.children().some((child) => child.uri === SAMPLE_DATA_URI),
      ).toBe(false);
      expect(spidermanCallback).toHaveBeenCalledTimes(1);
      expect(containerCallback).toHaveBeenCalledTimes(1);

      await testContainer.unsubscribeFromAllNotifications();
    });

    it("handles notification when subscribed to a parent with an added child", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE2_DATA_URI);
      const testContainer = solidLdoDataset.getResource(TEST_CONTAINER_URI);
      await resource.read();

      const spidermanCallback = vi.fn();
      solidLdoDataset.addListener(
        [spidermanNode, null, null, null],
        spidermanCallback,
      );

      const containerCallback = vi.fn();
      solidLdoDataset.addListener(
        [namedNode(TEST_CONTAINER_URI), null, null, null],
        containerCallback,
      );

      await testContainer.subscribeToNotifications();

      await s.authFetch(TEST_CONTAINER_URI, {
        method: "POST",
        headers: { "content-type": "text/turtle", slug: "sample2.ttl" },
        body: SPIDER_MAN_TTL,
      });
      await wait(1000);

      expect(solidLdoDataset.match(spidermanNode, null, null).size).toBe(4);
      expect(
        testContainer
          .children()
          .some((child) => child.uri === SAMPLE2_DATA_URI),
      ).toBe(true);
      expect(spidermanCallback).toHaveBeenCalledTimes(1);
      expect(containerCallback).toHaveBeenCalledTimes(1);

      await testContainer.unsubscribeFromAllNotifications();
    });

    it.skip("returns an error when it cannot subscribe to a notification", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const onError = vi.fn();

      await s.app.stop();
      await resource.subscribeToNotifications({
        onNotificationError: onError,
      });
      expect(onError).toHaveBeenCalledTimes(2);
      await s.app.start();
    });

    it.skip("returns an error when the server doesnt support websockets", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const onError = vi.fn();

      await s.app.stop();
      const disabledWebsocketsApp = await createApp(
        3001,
        path.join(__dirname, "./configs/server-config-without-websocket.json"),
      );
      await disabledWebsocketsApp.start();

      await resource.subscribeToNotifications({ onNotificationError: onError });
      expect(onError).toHaveBeenCalledTimes(2);

      await disabledWebsocketsApp.stop();
      await s.app.start();
    });

    it.skip("attempts to reconnect multiple times before giving up.", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      const onError = vi.fn();

      await s.app.stop();
      const disabledWebsocketsApp = await createApp(
        3001,
        path.join(__dirname, "./configs/server-config-without-websocket.json"),
      );
      await disabledWebsocketsApp.start();

      await resource.subscribeToNotifications({ onNotificationError: onError });

      // TODO: This is a bad test because of the wait. Instead inject better
      // numbers into the websocket class.
      await wait(35000);

      expect(onError).toHaveBeenCalledTimes(14);
      expect(onError.mock.calls[1][0].type).toBe(
        "disconnectedAttemptingReconnectError",
      );
      expect(onError.mock.calls[13][0].type).toBe(
        "disconnectedNotAttemptingReconnectError",
      );

      await disabledWebsocketsApp.stop();
      await s.app.start();
    });

    it("causes no problems when unsubscribing when not subscribed", async () => {
      const resource = solidLdoDataset.getResource(SAMPLE_DATA_URI);
      await resource.unsubscribeFromAllNotifications();
      expect(resource.isSubscribedToNotifications()).toBe(false);
    });
  });
});
