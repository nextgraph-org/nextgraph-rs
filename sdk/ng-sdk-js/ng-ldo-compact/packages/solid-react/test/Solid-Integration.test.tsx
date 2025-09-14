import React, { useCallback, useEffect, useState } from "react";
import type { FunctionComponent } from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
} from "@testing-library/react";
import {
  fileData,
  MAIN_PROFILE_SUBJECT,
  MAIN_PROFILE_URI,
  SAMPLE_BINARY_URI,
  SAMPLE_DATA_URI,
  SERVER_DOMAIN,
  setUpServerFiles,
  THIRD_PROFILE_SUBJECT,
} from "./fileData.js";
import { UnauthenticatedSolidLdoProvider } from "../src/UnauthenticatedSolidLdoProvider.js";
import {
  dataset,
  useLdo,
  useMatchObject,
  useMatchSubject,
  useResource,
  useRootContainerFor,
  useSubject,
  useSubscribeToResource,
  useLinkQuery,
} from "../src/index.js";
import { PostShShapeType } from "./.ldo/post.shapeTypes.js";
import type { PostSh } from "./.ldo/post.typings.js";
import { SolidProfileShapeShapeType } from "./.ldo/solidProfile.shapeTypes.js";
import { changeData, commitData } from "@ldo/connected";
import type { SolidProfileShape } from "./.ldo/solidProfile.typings.js";
import { describe, vi, afterEach, expect, it } from "vitest";
import { setupServer } from "@ldo/test-solid-server";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Integration Tests", () => {
  setupServer(
    3002,
    fileData,
    join(
      __dirname,
      "configs",
      "components-config",
      "unauthenticatedServer.json",
    ),
    true,
  );
  setUpServerFiles();

  afterEach(() => {
    dataset.forgetAllResources();
    dataset.deleteMatches(undefined, undefined, undefined, undefined);
    cleanup();
  });

  /**
   * ===========================================================================
   * useResource
   * ===========================================================================
   */
  describe("useResource", () => {
    it("Fetches a resource and indicates it is loading while doing so", async () => {
      const UseResourceTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        if (resource?.isLoading()) return <p>Loading</p>;
        return <p role="status">{resource.status.type}</p>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseResourceTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      await screen.findByText("Loading");
      const resourceStatus = await screen.findByRole("status");
      expect(resourceStatus.innerHTML).toBe("dataReadSuccess");
    });

    it("returns undefined when no uri is provided, then rerenders when one is", async () => {
      const UseResourceUndefinedTest: FunctionComponent = () => {
        const [uri, setUri] = useState<string | undefined>(undefined);
        const resource = useResource(uri, { suppressInitialRead: true });
        if (!resource)
          return (
            <div>
              <p>Undefined</p>
              <button onClick={() => setUri(SAMPLE_DATA_URI)}>Next</button>
            </div>
          );
        return <p role="status">{resource.status.type}</p>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseResourceUndefinedTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      await screen.findByText("Undefined");
      fireEvent.click(screen.getByText("Next"));
      const resourceStatus = await screen.findByRole("status");
      expect(resourceStatus.innerHTML).toBe("unfetched");
    });

    it("Reloads the data on mount", async () => {
      const ReloadTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI, { reloadOnMount: true });
        if (resource?.isLoading()) return <p>Loading</p>;
        return <p role="status">{resource.status.type}</p>;
      };
      const ReloadParent: FunctionComponent = () => {
        const [showComponent, setShowComponent] = useState(true);
        return (
          <div>
            <button onClick={() => setShowComponent(!showComponent)}>
              Show Component
            </button>
            {showComponent ? <ReloadTest /> : <p>Hidden</p>}
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <ReloadParent />
        </UnauthenticatedSolidLdoProvider>,
      );
      await screen.findByText("Loading");
      const resourceStatus1 = await screen.findByRole("status");
      expect(resourceStatus1.innerHTML).toBe("dataReadSuccess");
      fireEvent.click(screen.getByText("Show Component"));
      await screen.findByText("Hidden");
      fireEvent.click(screen.getByText("Show Component"));
      await screen.findByText("Loading");
      const resourceStatus2 = await screen.findByRole("status", undefined, {
        timeout: 5000,
      });
      expect(resourceStatus2.innerHTML).toBe("dataReadSuccess");
    });

    it("handles swapping to a new resource", async () => {
      const SwapResourceTest: FunctionComponent = () => {
        const [uri, setUri] = useState(SAMPLE_DATA_URI);
        const resource = useResource(uri);
        if (resource?.isLoading()) return <p>Loading</p>;
        return (
          <div>
            <p role="status">{resource.status.type}</p>
            <button onClick={() => setUri(SAMPLE_BINARY_URI)}>
              Update URI
            </button>
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <SwapResourceTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      await screen.findByText("Loading");
      const resourceStatus1 = await screen.findByRole("status");
      expect(resourceStatus1.innerHTML).toBe("dataReadSuccess");
      fireEvent.click(screen.getByText("Update URI"));
      await screen.findByText("Loading");
      const resourceStatus2 = await screen.findByRole("status");
      expect(resourceStatus2.innerHTML).toBe("binaryReadSuccess");
    });
  });

  /**
   * ===========================================================================
   * useRootContainer
   * ===========================================================================
   */
  describe("useRootContainer", () => {
    it("gets the root container for a sub-resource", async () => {
      const RootContainerTest: FunctionComponent = () => {
        const rootContainer = useRootContainerFor(SAMPLE_DATA_URI, {
          suppressInitialRead: true,
        });
        return rootContainer ? <p role="root">{rootContainer?.uri}</p> : <></>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <RootContainerTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      const container = await screen.findByRole("root");
      expect(container.innerHTML).toBe(SERVER_DOMAIN);
    });

    it("returns undefined when a URI is not provided", async () => {
      const RootContainerTest: FunctionComponent = () => {
        const rootContainer = useRootContainerFor(undefined, {
          suppressInitialRead: true,
        });
        return rootContainer ? (
          <p role="root">{rootContainer?.uri}</p>
        ) : (
          <p role="undefined">Undefined</p>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <RootContainerTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      const container = await screen.findByRole("undefined");
      expect(container.innerHTML).toBe("Undefined");
    });
  });

  /**
   * ===========================================================================
   * useLdoMethods
   * ===========================================================================
   */
  describe("useLdoMethods", () => {
    it("uses get subject to get a linked data object", async () => {
      const GetSubjectTest: FunctionComponent = () => {
        const [subject, setSubject] = useState<PostSh | undefined>();
        const { getSubject } = useLdo();
        useEffect(() => {
          const someSubject = getSubject(
            PostShShapeType,
            "https://example.com/subject",
          );
          setSubject(someSubject);
        }, []);
        return subject ? <p role="subject">{subject["@id"]}</p> : <></>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <GetSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      const container = await screen.findByRole("subject");
      expect(container.innerHTML).toBe("https://example.com/subject");
    });

    it("uses createData to create a new data object", async () => {
      const GetSubjectTest: FunctionComponent = () => {
        const [subject, setSubject] = useState<PostSh | undefined>();
        const { createData, getResource } = useLdo();
        useEffect(() => {
          const someSubject = createData(
            PostShShapeType,
            "https://example.com/subject",
            getResource("https://example.com/"),
          );
          someSubject.articleBody = "Cool Article";
          setSubject(someSubject);
        }, []);
        return subject ? <p role="subject">{subject.articleBody}</p> : <></>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <GetSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      const container = await screen.findByRole("subject");
      expect(container.innerHTML).toBe("Cool Article");
    });
  });

  /**
   * ===========================================================================
   * useSubject
   * ===========================================================================
   */
  describe("useSubject", () => {
    it("renders the article body from the useSubject value", async () => {
      const UseSubjectTest: FunctionComponent = () => {
        useResource(SAMPLE_DATA_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);

        return <p role="article">{post.articleBody}</p>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      await screen.findByText("test");
    });

    it("renders the set value from the useSubject value", async () => {
      const UseSubjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);
        if (resource.isLoading() || !post) return <p>loading</p>;

        return (
          <div>
            <p role="single">{post.publisher.toArray()[0]["@id"]}</p>
            <ul role="list">
              {post.publisher.map((publisher) => {
                return <li key={publisher["@id"]}>{publisher["@id"]}</li>;
              })}
            </ul>
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const single = await screen.findByRole("single");
      expect(single.innerHTML).toBe("https://example.com/Publisher1");
      const list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("https://example.com/Publisher1");
      expect(list.children[1].innerHTML).toBe("https://example.com/Publisher2");
    });

    it("returns undefined in the subject URI is undefined", async () => {
      const UseSubjectTest: FunctionComponent = () => {
        useResource(SAMPLE_DATA_URI, { suppressInitialRead: true });
        const post = useSubject(PostShShapeType, undefined);

        return (
          <p role="article">
            {post === undefined ? "Undefined" : "Not Undefined"}
          </p>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const article = await screen.findByRole("article");
      expect(article.innerHTML).toBe("Undefined");
    });

    it("returns nothing if a symbol key is provided", async () => {
      const UseSubjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);
        if (resource.isLoading() || !post) return <p>loading</p>;

        return <p role="value">{typeof post[Symbol.hasInstance]}</p>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const article = await screen.findByRole("value");
      expect(article.innerHTML).toBe("undefined");
    });

    it("returns an id if an id key is provided", async () => {
      const UseSubjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);
        if (resource.isLoading() || !post) return <p>loading</p>;

        return <p role="value">{post["@id"]}</p>;
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const article = await screen.findByRole("value");
      expect(article.innerHTML).toBe(`${SAMPLE_DATA_URI}#Post1`);
    });

    it("does not set a value if a value is attempted to be set", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const UseSubjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);
        if (resource.isLoading() || !post) return <p>loading</p>;

        return (
          <div>
            <p role="value">{post.articleBody}</p>
            <button
              onClick={() => {
                post.articleBody = "bad";
                post.publisher.add({ "@id": "example" });
              }}
            >
              Attempt Change
            </button>
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const article = await screen.findByRole("value");
      expect(article.innerHTML).toBe(`test`);
      fireEvent.click(screen.getByText("Attempt Change"));
      expect(article.innerHTML).not.toBe("bad");
      expect(warn).toHaveBeenCalledWith(
        "You've attempted to set a value on a Linked Data Object from the useSubject, useMatchingSubject, or useMatchingObject hooks. These linked data objects should only be used to render data, not modify it. To modify data, use the `changeData` function.",
      );
      expect(warn).toHaveBeenCalledWith(
        "You've attempted to modify a value on a Linked Data Object from the useSubject, useMatchingSubject, or useMatchingObject hooks. These linked data objects should only be used to render data, not modify it. To modify data, use the `changeData` function.",
      );
      warn.mockReset();
    });

    it("rerenders when asked to subscribe to a resource", async () => {
      const NotificationTest: FunctionComponent = () => {
        const [isSubscribed, setIsSubscribed] = useState(true);
        const resource = useResource(SAMPLE_DATA_URI, {
          subscribe: isSubscribed,
        });
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);

        const addPublisher = useCallback(async () => {
          await fetch(SAMPLE_DATA_URI, {
            method: "PATCH",
            body: `INSERT DATA { <${SAMPLE_DATA_URI}#Post1> <http://schema.org/publisher> <https://example.com/Publisher3> . }`,
            headers: {
              "Content-Type": "application/sparql-update",
            },
          });
        }, []);

        if (resource.isLoading() || !post) return <p>loading</p>;

        return (
          <div>
            <p role="resource">
              {resource.isSubscribedToNotifications().toString()}
            </p>
            <ul role="list">
              {post.publisher.map((publisher) => {
                return <li key={publisher["@id"]}>{publisher["@id"]}</li>;
              })}
            </ul>
            <button onClick={addPublisher}>Add Publisher</button>
            <button onClick={() => setIsSubscribed(false)}>Unsubscribe</button>
          </div>
        );
      };
      const { unmount } = render(
        <UnauthenticatedSolidLdoProvider>
          <NotificationTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      // Wait for subscription to connect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("https://example.com/Publisher1");
      expect(list.children[1].innerHTML).toBe("https://example.com/Publisher2");
      const resourceP = await screen.findByRole("resource");
      expect(resourceP.innerHTML).toBe("true");

      // Click button to add a publisher
      await fireEvent.click(screen.getByText("Add Publisher"));
      await screen.findByText("https://example.com/Publisher3");

      // Verify the new publisher is in the list
      const updatedList = await screen.findByRole("list");
      expect(updatedList.children[2].innerHTML).toBe(
        "https://example.com/Publisher3",
      );

      await fireEvent.click(screen.getByText("Unsubscribe"));
      const resourcePUpdated = await screen.findByRole("resource");
      expect(resourcePUpdated.innerHTML).toBe("false");

      unmount();
    });
  });

  /**
   * ===========================================================================
   * useMatchSubject
   * ===========================================================================
   */
  describe("useMatchSubject", () => {
    it("returns an array of matched subjects", async () => {
      const UseMatchSubjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const posts = useMatchSubject(
          PostShShapeType,
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
          "http://schema.org/CreativeWork",
        );
        if (resource.isLoading()) return <p>loading</p>;

        return (
          <div>
            <ul role="list">
              {posts.map((post) => {
                return <li key={post["@id"]}>{post["@id"]}</li>;
              })}
            </ul>
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseMatchSubjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe(
        "http://localhost:3002/example/test_ldo/sample.ttl#Post1",
      );
      expect(list.children[1].innerHTML).toBe(
        "http://localhost:3002/example/test_ldo/sample.ttl#Post2",
      );
    });
  });

  /**
   * ===========================================================================
   * useMatchObject
   * ===========================================================================
   */
  describe("useMatchObject", () => {
    it("returns an array of matched objects", async () => {
      const UseMatchObjectTest: FunctionComponent = () => {
        const resource = useResource(SAMPLE_DATA_URI);
        const publishers = useMatchObject(
          PostShShapeType,
          "http://localhost:3002/example/test_ldo/sample.ttl#Post1",
          "http://schema.org/publisher",
        );
        if (resource.isLoading()) return <p>loading</p>;

        return (
          <div>
            <ul role="list">
              {publishers.map((publisher) => {
                return <li key={publisher["@id"]}>{publisher["@id"]}</li>;
              })}
            </ul>
          </div>
        );
      };
      render(
        <UnauthenticatedSolidLdoProvider>
          <UseMatchObjectTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("https://example.com/Publisher1");
      expect(list.children[1].innerHTML).toBe("https://example.com/Publisher2");
    });
  });

  /**
   * ===========================================================================
   * useSubscribeToResource
   * ===========================================================================
   */
  describe("useSubscribeToResource", () => {
    it("handles useSubscribeToResource", async () => {
      const NotificationTest: FunctionComponent = () => {
        const [subscribedUris, setSubScribedUris] = useState<string[]>([
          SAMPLE_DATA_URI,
        ]);
        useSubscribeToResource(...subscribedUris);
        const resource1 = useResource(SAMPLE_DATA_URI);
        const resource2 = useResource(SAMPLE_BINARY_URI);
        const post = useSubject(PostShShapeType, `${SAMPLE_DATA_URI}#Post1`);

        const addPublisher = useCallback(async () => {
          await fetch(SAMPLE_DATA_URI, {
            method: "PATCH",
            body: `INSERT DATA { <${SAMPLE_DATA_URI}#Post1> <http://schema.org/publisher> <https://example.com/Publisher3> . }`,
            headers: {
              "Content-Type": "application/sparql-update",
            },
          });
        }, []);

        if (resource1.isLoading() || resource2.isLoading())
          return <p>Loading</p>;

        return (
          <div>
            <p role="resource1">
              {resource1.isSubscribedToNotifications().toString()}
            </p>
            <p role="resource2">
              {resource2.isSubscribedToNotifications().toString()}
            </p>
            <ul role="list">
              {post.publisher.map((publisher) => {
                return <li key={publisher["@id"]}>{publisher["@id"]}</li>;
              })}
            </ul>
            <button onClick={addPublisher}>Add Publisher</button>
            <button
              onClick={() =>
                setSubScribedUris([SAMPLE_DATA_URI, SAMPLE_BINARY_URI])
              }
            >
              Subscribe More
            </button>
            <button onClick={() => setSubScribedUris([SAMPLE_BINARY_URI])}>
              Subscribe Less
            </button>
          </div>
        );
      };
      const { unmount } = render(
        <UnauthenticatedSolidLdoProvider>
          <NotificationTest />
        </UnauthenticatedSolidLdoProvider>,
      );

      const preResource1P = await screen.findByRole("resource1");
      expect(preResource1P.innerHTML).toBe("false");

      // Wait for subscription to connect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("https://example.com/Publisher1");
      expect(list.children[1].innerHTML).toBe("https://example.com/Publisher2");
      const resource1P = await screen.findByRole("resource1");
      expect(resource1P.innerHTML).toBe("true");
      const resource2P = await screen.findByRole("resource2");
      expect(resource2P.innerHTML).toBe("false");

      // Click button to add a publisher
      await fireEvent.click(screen.getByText("Add Publisher"));
      await screen.findByText("https://example.com/Publisher3");

      // Verify the new publisher is in the list
      const updatedList = await screen.findByRole("list");
      expect(updatedList.children[2].innerHTML).toBe(
        "https://example.com/Publisher3",
      );

      await fireEvent.click(screen.getByText("Subscribe More"));
      // Wait for subscription to connect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const resource1PUpdated = await screen.findByRole("resource1");
      expect(resource1PUpdated.innerHTML).toBe("true");
      const resource2PUpdated = await screen.findByRole("resource2");
      expect(resource2PUpdated.innerHTML).toBe("true");

      await fireEvent.click(screen.getByText("Subscribe Less"));
      // Wait for subscription to connect
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      });

      const resource1PUpdatedAgain = await screen.findByRole("resource1");
      expect(resource1PUpdatedAgain.innerHTML).toBe("false");
      const resource2PUpdatedAgain = await screen.findByRole("resource2");
      expect(resource2PUpdatedAgain.innerHTML).toBe("true");

      unmount();
    });
  });

  /**
   * ===========================================================================
   * useLinkQuery
   * ===========================================================================
   */
  describe("useLinkQuery", () => {
    const linkQuery = {
      name: true,
      knows: {
        name: true,
      },
    } as const;

    it("Fetches a resource using useLinkQuery", async () => {
      const UseLinkQueryTest: FunctionComponent = () => {
        const profile = useLinkQuery(
          SolidProfileShapeShapeType,
          MAIN_PROFILE_URI,
          MAIN_PROFILE_SUBJECT,
          linkQuery,
        );
        const addProfile = useCallback(async () => {
          const cProfile = changeData(
            profile as SolidProfileShape,
            dataset.getResource(MAIN_PROFILE_URI),
          );
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          cProfile.knows?.add({ "@id": THIRD_PROFILE_SUBJECT });
          await commitData(cProfile);
        }, [profile]);
        if (!profile) return <p>Loading</p>;
        return (
          <div>
            <p role="profile-name">{profile.name}</p>
            <ul role="list">
              {profile.knows?.map((nestedProfile) => (
                <li key={nestedProfile["@id"]}>{nestedProfile.name}</li>
              ))}
            </ul>
            <button role="add-profile" onClick={addProfile}>
              Add Profile
            </button>
          </div>
        );
      };
      const { unmount } = render(
        <UnauthenticatedSolidLdoProvider>
          <UseLinkQueryTest />
        </UnauthenticatedSolidLdoProvider>,
      );
      await screen.findByText("Loading");

      let profileNameElement = await screen.findByRole("profile-name");

      expect(profileNameElement.textContent).toBe("Main User");

      let list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("Other User");
      expect(list.children.length).toBe(1);

      // Click button to add a publisher
      await fireEvent.click(screen.getByText("Add Profile"));

      // Give some time for notifications to propogate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      });

      profileNameElement = await screen.findByRole("profile-name");
      expect(profileNameElement.textContent).toBe("Main User");

      list = await screen.findByRole("list");
      expect(list.children[0].innerHTML).toBe("Other User");
      expect(list.children[1].innerHTML).toBe("Third User");

      expect(list.children.length).toBe(2);

      unmount();
    });
  });
});
