import type { LdoBase, ShapeType } from "@ldo/ldo";
import type {
  ExpandDeep,
  ILinkQuery,
  LQInput,
  LQReturn,
} from "../types/ILinkQuery.js";
import type { ConnectedPlugin } from "../types/ConnectedPlugin.js";
import type { SubjectNode } from "@ldo/rdf-utils";
import { exploreLinks } from "./exploreLinks.js";
import type { IConnectedLdoDataset } from "../types/IConnectedLdoDataset.js";
import type { IConnectedLdoBuilder } from "../types/IConnectedLdoBuilder.js";
import { v4 } from "uuid";
import type { nodeEventListener } from "@ldo/subscribable-dataset";
import type { Quad } from "@rdfjs/types";

/**
 * Represents a query over multiple datasources and constituting muliple
 * resources.
 *
 * @example
 * ```typescript
 * import { ProfileShapeType } from "./.ldo/Profile.shapeType.ts";
 *
 * // Create a link query
 * const linkQuery = ldoDataset
 *   .usingType(ProfileShapeType)
 *   .startLinkQuery(
 *     "http://example.com/profile/card",
 *     "http://example.com/profile/card#me",
 *     {
 *       name: true,
 *         knows: {
 *           name: true,
 *         },
 *       },
 *     }
 *   );
 * // Susbscribe to this link query, automaticically updating the dataset when
 * // something from the link query is changed.
 * await linkQuery.subscribe();
 * ```
 */
export class ResourceLinkQuery<
  Type extends LdoBase,
  QueryInput extends LQInput<Type>,
  Plugins extends ConnectedPlugin[],
> implements ILinkQuery<Type, QueryInput>
{
  protected previousTransactionId: string = "INIT";

  // Resource Subscriptions uri -> unsubscribeId
  protected activeResourceSubscriptions: Record<string, string> = {};
  // Unsubscribe IDs for this ResourceLinkQuery
  protected thisUnsubscribeIds = new Set<string>();

  protected curOnDataChanged: nodeEventListener<Quad> | undefined;

  protected resourcesWithSubscriptionInProgress: Record<
    string,
    Promise<void> | undefined
  > = {};

  /**
   * @internal
   * @param parentDataset The dataset for which this link query is a part
   * @param shapeType A ShapeType for the link query to follow
   * @param ldoBuilder An LdoBuilder associated with the dataset
   * @param startingResource The resource to explore first in the link query
   * @param startingSubject The starting point of the link query
   * @param linkQueryInput A definition of the link query
   */
  constructor(
    protected parentDataset: IConnectedLdoDataset<Plugins>,
    protected shapeType: ShapeType<Type>,
    protected ldoBuilder: IConnectedLdoBuilder<Type, Plugins>,
    protected startingResource: Plugins[number]["types"]["resource"],
    protected startingSubject: SubjectNode | string,
    protected linkQueryInput: QueryInput,
  ) {}

  /**
   * Runs this link query, returning the result
   * @param options Options for how to run the link query
   * @returns A subset of the ShapeType as defined by the LinkQuery
   *
   * @example
   * ```
   * import { ProfileShapeType } from "./.ldo/Profile.shapeType.ts";
   *
   * // Create a link query
   * const linkQuery = ldoDataset
   *   .usingType(ProfileShapeType)
   *   .startLinkQuery(
   *     "http://example.com/profile/card",
   *     "http://example.com/profile/card#me",
   *     {
   *       name: true,
   *         knows: {
   *           name: true,
   *         },
   *       },
   *     }
   *   );
   * // Susbscribe to this link query, automaticically updating the dataset when
   * // something from the link query is changed.
   * const result = await linkQuery.read();
   * console.log(result.name);
   * result.knows.forEach((person) => console.log(person.name));
   * // The following will type-error. Despite "phone" existing on a Profile,
   * // it was not covered by the link query.
   * console.log(result.phone);
   * ```
   */
  async run(options?: {
    reload?: boolean;
  }): Promise<ExpandDeep<LQReturn<Type, QueryInput>>> {
    await exploreLinks(
      this.parentDataset,
      this.shapeType,
      this.startingResource,
      this.startingSubject,
      this.linkQueryInput,
      { shouldRefreshResources: options?.reload },
    );
    return this.fromSubject();
  }

  /**
   * Subscribes to the data defined by the link query, updating the dataset if
   * any changes are made.
   * @returns An unsubscribeId
   *
   * @example
   * ```
   * import { ProfileShapeType } from "./.ldo/Profile.shapeType.ts";
   *
   * // Create a link query
   * const linkQuery = ldoDataset
   *   .usingType(ProfileShapeType)
   *   .startLinkQuery(
   *     "http://example.com/profile/card",
   *     "http://example.com/profile/card#me",
   *     {
   *       name: true,
   *         knows: {
   *           name: true,
   *         },
   *       },
   *     }
   *   );
   * // Susbscribe to this link query, automaticically updating the dataset when
   * // something from the link query is changed.
   * const unsubscribeId = await linkQuery.subscribe();
   *
   * // Now, let's imagine the following triple was added to
   * "http://example.com/profile/card":
   * <http://example.com/profile/card#me> <http://xmlns.com/foaf/0.1/knows> <http://example2.com/profile/card#me>
   * Because you're subscribed, the dataset will automatically be updated.
   *
   * // End subscription
   * linkQuery.unsubscribe(unsubscribeId);
   * ```
   */
  async subscribe(): Promise<string> {
    const subscriptionId = v4();
    this.thisUnsubscribeIds.add(subscriptionId);
    // If there's already a registered onDataChange, we don't need to make a new
    // on for this new subscription
    if (this.curOnDataChanged) {
      return subscriptionId;
    }
    this.curOnDataChanged = async (
      _changes,
      transactionId: string,
      _triggering,
    ) => {
      // Set a transaction Id, so that we only trigger one re-render
      if (transactionId === this.previousTransactionId) return;
      this.previousTransactionId = transactionId;
      // Remove previous registration
      this.parentDataset.removeListenerFromAllEvents(this.curOnDataChanged!);

      // Explore the links, with a subscription to re-explore the links if any
      // covered information changes
      const resourcesToUnsubscribeFrom = new Set(
        Object.keys(this.activeResourceSubscriptions),
      );

      // Only add the listeners if we're currently subscribed
      const exploreOptions = this.curOnDataChanged
        ? {
            onCoveredDataChanged: this.curOnDataChanged,
            onResourceEncountered: async (resource) => {
              // Wait for the the in progress registration to complete. Once it
              // is complete, you're subscribed, so we can remove this from the
              // resources to unsubscribe from.
              if (this.resourcesWithSubscriptionInProgress[resource.uri]) {
                await this.resourcesWithSubscriptionInProgress[resource.uri];
                resourcesToUnsubscribeFrom.delete(resource.uri);
                return;
              }
              // No need to do anything if we're already subscribed
              if (resourcesToUnsubscribeFrom.has(resource.uri)) {
                resourcesToUnsubscribeFrom.delete(resource.uri);
                return;
              }
              // Otherwise begin the subscription
              let resolve;
              this.resourcesWithSubscriptionInProgress[resource.uri] =
                new Promise<void>((res) => {
                  resolve = res;
                });
              const unsubscribeId = await resource.subscribeToNotifications();
              this.activeResourceSubscriptions[resource.uri] = unsubscribeId;
              // Unsubscribe in case unsubscribe call came in mid subscription
              if (!this.curOnDataChanged) {
                await this.unsubscribeFromResource(resource.uri);
              }
              resolve();
              this.resourcesWithSubscriptionInProgress[resource.uri] =
                undefined;
            },
          }
        : {};
      await exploreLinks(
        this.parentDataset,
        this.shapeType,
        this.startingResource,
        this.startingSubject,
        this.linkQueryInput,
        exploreOptions,
      );
      // Clean up unused subscriptions
      await Promise.all(
        Array.from(resourcesToUnsubscribeFrom).map(async (uri) =>
          this.unsubscribeFromResource(uri),
        ),
      );
    };
    await this.curOnDataChanged({}, "BEGIN_SUB", [null, null, null, null]);
    return subscriptionId;
  }

  private async unsubscribeFromResource(uri) {
    const resource = this.parentDataset.getResource(uri);
    const unsubscribeId = this.activeResourceSubscriptions[uri];
    delete this.activeResourceSubscriptions[uri];
    await resource.unsubscribeFromNotifications(unsubscribeId);
  }

  private async fullUnsubscribe(): Promise<void> {
    if (this.curOnDataChanged) {
      this.parentDataset.removeListenerFromAllEvents(this.curOnDataChanged);
      this.curOnDataChanged = undefined;
    }
    await Promise.all(
      Object.keys(this.activeResourceSubscriptions).map(async (uri) => {
        this.unsubscribeFromResource(uri);
      }),
    );
  }

  async unsubscribe(unsubscribeId: string): Promise<void> {
    this.thisUnsubscribeIds.delete(unsubscribeId);
    if (this.thisUnsubscribeIds.size === 0) {
      await this.fullUnsubscribe();
    }
  }

  async unsubscribeAll() {
    this.thisUnsubscribeIds.clear();
    await this.fullUnsubscribe();
  }

  fromSubject(): ExpandDeep<LQReturn<Type, QueryInput>> {
    return this.ldoBuilder.fromSubject(
      this.startingSubject,
    ) as unknown as ExpandDeep<LQReturn<Type, QueryInput>>;
  }

  getSubscribedResources(): Plugins[number]["types"]["resource"][] {
    return Object.keys(this.activeResourceSubscriptions).map((uri) =>
      this.parentDataset.getResource(uri),
    );
  }
}
