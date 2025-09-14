import type {
  ConnectedContext,
  NotificationSubscription,
  SubscriptionCallbacks,
} from "@ldo/connected";
import { UnexpectedResourceError, UpdateSuccess } from "@ldo/connected";
import {
  Unfetched,
  type ConnectedResult,
  type Resource,
  type ResourceEventEmitter,
} from "@ldo/connected";
import type { NextGraphUri } from "../types.js";
import EventEmitter from "events";
import type { NextGraphConnectedPlugin } from "../NextGraphConnectedPlugin.js";
import { changesToSparqlUpdate, type DatasetChanges } from "@ldo/rdf-utils";
import type { NextGraphNotificationMessage } from "../notifications/NextGraphNotificationMessage.js";
import type { Dataset, Quad } from "@rdfjs/types";
import { namedNode, quad as createQuad } from "@ldo/rdf-utils";
import { NextGraphReadSuccess } from "../results/NextGraphReadSuccess.js";
import { NextGraphNotificationSubscription } from "../notifications/NextGraphNotificationSubscription.js";
import { parseRdf } from "@ldo/ldo";
import type { LdoDataset } from "@ldo/ldo";
import { createDataset } from "@ldo/dataset";
export class NextGraphResource
  extends (EventEmitter as new () => ResourceEventEmitter)
  implements Resource<NextGraphUri>
{
  public readonly uri: NextGraphUri;
  public readonly type = "NextGraphResource" as const;
  public readonly isError = false as const;
  public status: ConnectedResult;
  protected context: ConnectedContext<NextGraphConnectedPlugin[]>;

  private fetched: boolean = false;
  private loading: boolean = false;
  private present: boolean | undefined = undefined;

  /**
   * @internal
   * Handles notification subscriptions
   */
  protected notificationSubscription: NotificationSubscription<
    NextGraphConnectedPlugin,
    NextGraphNotificationMessage
  >;

  constructor(
    uri: NextGraphUri,
    context: ConnectedContext<NextGraphConnectedPlugin[]>,
  ) {
    super();
    this.uri = uri;
    this.status = new Unfetched(this);
    this.context = context;
    this.notificationSubscription = new NextGraphNotificationSubscription(
      this,
      this.onNotification.bind(this),
      this.context,
    );
  }

  isLoading(): boolean {
    return this.loading;
  }

  isFetched(): boolean {
    return this.fetched;
  }

  isUnfetched(): boolean {
    return !this.fetched;
  }

  isDoingInitialFetch(): boolean {
    return this.loading && !this.fetched;
  }

  isPresent(): boolean | undefined {
    return this.present;
  }

  isAbsent(): boolean | undefined {
    return !this.present;
  }

  isSubscribedToNotifications(): boolean {
    return this.notificationSubscription.isSubscribedToNotifications();
  }

  private handleThrownError(
    err: unknown,
  ): UnexpectedResourceError<NextGraphResource> {
    const error = UnexpectedResourceError.fromThrown(this, err);
    this.loading = false;
    this.status = error;
    this.emit("update");
    return error;
  }

  private overwriteQuads(quads: Quad[] | Dataset<Quad>) {
    const dataset = this.context.dataset;
    const graphNode = namedNode(this.uri);
    dataset.deleteMatches(undefined, undefined, undefined, graphNode);
    dataset.addAll(
      quads.map((ngQuad) => {
        return createQuad(
          ngQuad.subject,
          ngQuad.predicate,
          ngQuad.object,
          graphNode,
        );
      }),
    );
  }

  async read(): Promise<
    NextGraphReadSuccess | UnexpectedResourceError<NextGraphResource>
  > {
    try {
      this.loading = true;
      this.emit("update");

      // Fetch the data once using construct
      const sparqlResult = await this.context.nextgraph.ng.sparql_query(
        this.context.nextgraph.sessionId,
        `CONSTRUCT { ?s ?p ?o } WHERE { GRAPH <${this.uri}> { ?s ?p ?o } }`,
        undefined,
        this.uri,
      );
      // Update the dataset
      this.overwriteQuads(sparqlResult);

      // Update statuses
      const result = new NextGraphReadSuccess(this, false);
      this.loading = false;
      this.fetched = true;
      this.present = true;
      this.status = result;
      this.emit("update");
      return result;
    } catch (err) {
      if (err === "RepoNotFound") {
        const result = new NextGraphReadSuccess(this, false);
        this.loading = false;
        this.fetched = true;
        this.present = false;
        this.status = result;
        this.emit("update");
        return result;
      }
      return this.handleThrownError(err);
    }
  }

  async readIfUnfetched(): Promise<
    NextGraphReadSuccess | UnexpectedResourceError<NextGraphResource>
  > {
    if (this.isFetched()) {
      return new NextGraphReadSuccess(this, true);
    }
    return this.read();
  }

  async update(
    datasetChanges: DatasetChanges<Quad>,
  ): Promise<
    | UpdateSuccess<NextGraphResource>
    | UnexpectedResourceError<NextGraphResource>
  > {
    this.loading = true;
    this.emit("update");

    // Optimistically apply updates
    this.context.dataset.bulk(datasetChanges);

    try {
      // Perform Update with remote
      await this.context.nextgraph.ng.sparql_update(
        this.context.nextgraph.sessionId,
        await changesToSparqlUpdate(datasetChanges),
        this.uri,
      );
      return new UpdateSuccess(this);
    } catch (err) {
      // Revert data on error
      this.context.dataset.bulk({
        added: datasetChanges.removed,
        removed: datasetChanges.added,
      });
      return this.handleThrownError(err);
    }
  }

  private async notificationToQuads(
    notificationString: string,
  ): Promise<Dataset<Quad>> {
    const rawTriples = JSON.parse(notificationString);
    const triples = (
      await Promise.all<LdoDataset>(
        rawTriples.map(async (rawTriple) =>
          parseRdf(`${rawTriple}.`, { baseIRI: this.uri }),
        ),
      )
    ).reduce((agg, ldoDataset) => {
      ldoDataset.forEach((quad) => {
        agg.add(
          createQuad(
            quad.subject,
            quad.predicate,
            quad.object,
            namedNode(this.uri),
          ),
        );
      });
      return agg;
    }, createDataset());
    return triples;
  }

  protected async onNotification(response: NextGraphNotificationMessage) {
    if (response.V0.State) {
      if (!response.V0.State.graph) {
        this.overwriteQuads([]);
        return;
      }
      const json_str = new TextDecoder().decode(
        response.V0.State.graph.triples,
      );
      const triples = await this.notificationToQuads(json_str);
      this.overwriteQuads(triples);
    } else if (response.V0.Patch?.graph) {
      const insertsString = new TextDecoder().decode(
        response.V0.Patch.graph.inserts,
      );
      const removesString = new TextDecoder().decode(
        response.V0.Patch.graph.removes,
      );

      const [added, removed] = await Promise.all(
        [insertsString, removesString].map(async (str) => {
          return this.notificationToQuads(str);
        }),
      );

      this.context.dataset.bulk({
        added,
        removed,
      });
    }
  }

  async subscribeToNotifications(
    callbacks?: SubscriptionCallbacks<NextGraphNotificationMessage>,
  ): Promise<string> {
    return await this.notificationSubscription.subscribeToNotifications(
      callbacks,
    );
  }

  unsubscribeFromNotifications(subscriptionId: string): Promise<void> {
    return this.notificationSubscription.unsubscribeFromNotification(
      subscriptionId,
    );
  }

  unsubscribeFromAllNotifications(): Promise<void> {
    return this.notificationSubscription.unsubscribeFromAllNotifications();
  }
}
