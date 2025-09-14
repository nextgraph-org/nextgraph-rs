/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LdoBase, ShapeType } from "@ldo/ldo";
import { LdoDataset, startTransaction } from "@ldo/ldo";
import type { ConnectedPlugin } from "./types/ConnectedPlugin.js";
import type { Dataset, DatasetFactory, Quad } from "@rdfjs/types";
import type { ITransactionDatasetFactory } from "@ldo/subscribable-dataset";
import { InvalidIdentifierResource } from "./InvalidIdentifierResource.js";
import type { ConnectedContext } from "./types/ConnectedContext.js";
import type {
  GetResourceReturnType,
  IConnectedLdoDataset,
} from "./types/IConnectedLdoDataset.js";
import { ConnectedLdoTransactionDataset } from "./ConnectedLdoTransactionDataset.js";
import type { SubjectNode } from "@ldo/rdf-utils";
import { ConnectedLdoBuilder } from "./ConnectedLdoBuilder.js";
import jsonldDatasetProxy from "@ldo/jsonld-dataset-proxy";

/**
 * A ConnectedLdoDataset has all the functionality of a LdoDataset with the
 * added functionality of keeping track of fetched remote Resources.
 *
 * It is recommended to use the { @link createConnectedLdoDataset } to
 * initialize this class.
 *
 * @example
 * ```typescript
 * import { createConnectedLdoDataset } from "@ldo/connected";
 * import { ProfileShapeType } from "./.ldo/profile.shapeTypes.ts"
 *
 * // At least one plugin needs to be provided to a ConnectedLdoDataset. In this
 * // example we'll use both the Solid and NextGraph plugins.
 * import { solidConnectedPlugin } from "@ldo/connected-solid";
 * import { nextGraphConnectedPlugin } from "@ldo/connected-nextgraph";
 *
 * // ...
 *
 * const connectedLdoDataset = createConnectedLdoDataset([
 *   solidConnectedPlugin,
 *   nextGraphConnectedPlugin
 * ]);
 *
 * const profileDocument = connectedLdoDataset
 *   .getResource("https://example.com/profile");
 * await profileDocument.read();
 *
 * const profile = connectedLdoDataset
 *   .using(ProfileShapeType)
 *   .fromSubject("https://example.com/profile#me");
 * ```
 */
export class ConnectedLdoDataset<
    Plugins extends ConnectedPlugin<any, any, any, any>[],
  >
  extends LdoDataset
  implements IConnectedLdoDataset<Plugins>
{
  /**
   * @internal
   *
   * A list of plugins used by this dataset
   */
  private plugins: Plugins;
  /**
   * @internal
   *
   * A mapping between a resource URI and a resource
   */
  protected resourceMap: Map<string, Plugins[number]["types"]["resource"]>;

  /**
   * @internal
   *
   * Context for each plugin (usually utilities for authentication)
   */
  protected context: ConnectedContext<Plugins>;

  /**
   * It is recommended to use the `createConnectedLdoDataset` function to
   * instantiate a ConnectedLdoDataset.
   *
   * @param plugins An array of plugins for each platform to connect to
   * @param datasetFactory Creates Datasets
   * @param transactionDatasetFactory Creates Transaction Datasets
   * @param initialDataset Initial quads
   */
  constructor(
    plugins: Plugins,
    datasetFactory: DatasetFactory<Quad, Quad>,
    transactionDatasetFactory: ITransactionDatasetFactory<Quad>,
    initialDataset?: Dataset<Quad, Quad>,
  ) {
    super(datasetFactory, transactionDatasetFactory, initialDataset);
    this.plugins = plugins;
    this.resourceMap = new Map();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore this is a builder. It will eventually match
    this.context = {
      dataset: this,
    };
    this.plugins.forEach(
      (plugin) => (this.context[plugin.name] = plugin.initialContext),
    );
  }

  /**
   * @internal
   *
   * A helper function to return a plugin based in the plugin name and uri.
   */
  private getValidPlugin(
    uri: string,
    pluginName?: string,
  ): Plugins[number] | undefined {
    // Check for which plugins this uri is valid
    const validPlugins = this.plugins
      .filter((plugin) => plugin.isUriValid(uri))
      .filter((plugin) => (pluginName ? pluginName === plugin.name : true));
    if (validPlugins.length === 0) {
      return undefined;
    } else if (validPlugins.length > 1) {
      // TODO: LDO is currently not architected to have an ID valid in multiple
      // protocols. This will need to be refactored if this is ever the case.
      throw new Error(
        "LDO Connect does not currently support two plugins with overlappng uris",
      );
    }
    return validPlugins[0];
  }

  /**
   * Retireves a representation of a Resource at the given URI. This resource
   * represents the current state of the resource: whether it is currently
   * fetched or in the process of fetching as well as some information about it.
   *
   * @param uri - the URI of the resource
   * @param pluginName - optionally, force this function to choose a specific
   * plugin to use rather than perform content negotiation.
   *
   * @returns a Resource
   *
   * @example
   * ```typescript
   * const profileDocument = connectedLdoDataset
   *   .getResource("https://example.com/profile");
   * ```
   */
  getResource<
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
    UriType extends string,
  >(uri: UriType, pluginName?: Name): GetResourceReturnType<Plugin, UriType> {
    const plugin = this.getValidPlugin(uri, pluginName);
    if (!plugin) return new InvalidIdentifierResource(uri) as any;
    const normalizedUri = plugin.normalizeUri?.(uri) ?? uri;

    let resource = this.resourceMap.get(normalizedUri);
    if (!resource) {
      resource = plugin.getResource(uri, this.context);
      this.resourceMap.set(normalizedUri, resource);
    }
    // HACK: cast to any
    return resource as any;
  }

  getResources(): GetResourceReturnType<Plugins[number], string>[] {
    return Array.from(this.resourceMap.values());
  }

  getFetchedResources(): GetResourceReturnType<Plugins[number], string>[] {
    return this.getResources().filter((resource) => resource.isFetched());
  }

  /**
   * Generates a random uri and creates a resource.
   *
   * @param pluginName - A string name for the platform you'd like to create
   * the resource on.
   * @param createResourceOptions - Some set of options specific to the plugin
   * you've selected.
   * @returns A created resource or an error
   *
   * @example
   * ```typescript
   * const profileDocument = await connectedLdoDataset
   *   .createResource("solid");
   * ```
   */
  async createResource<
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
  >(
    pluginName: Name,
    createResourceOptions?: Plugin["types"]["createResourceOptions"],
  ): Promise<ReturnType<Plugin["createResource"]>> {
    const validPlugin = this.plugins.find(
      (plugin) => pluginName === plugin.name,
    )!;
    const newResourceResult = await validPlugin.createResource(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore I have no idea why this doesn't work
      this.context,
      createResourceOptions,
    );
    // HACK: cast to any
    if (newResourceResult.isError) return newResourceResult as any;
    this.resourceMap.set(newResourceResult.uri, newResourceResult);
    // HACK: cast to any
    return newResourceResult as any;
  }

  /**
   * Removes a resource from local memory
   * @param uri - the URI of the resource to remove
   * @returns true if the resource was present before removal
   *
   * @example
   * ```typescript
   * connectedLdoDataset.forgetResource("https://example.com/resource.ttl");
   * ```
   */
  forgetResource(uri: string): boolean {
    const plugin = this.getValidPlugin(uri);
    const normalizedUri = plugin?.normalizeUri?.(uri) ?? uri;
    return this.resourceMap.delete(normalizedUri);
  }

  /**
   * Removes all resources from memory
   *
   * @example
   * ```typescript
   * connectedLdoDataset.forgetAllResources();
   * ```
   */
  forgetAllResources(): void {
    this.resourceMap.clear();
  }

  /**
   * Shorthand for connectedLdoDataset
   *   .usingType(shapeType)
   *   .write(...resources.map((r) => r.uri))
   *   .fromSubject(subject);
   * @param shapeType - The shapetype to represent the data
   * @param subject - A subject URI
   * @param resources - The resources changes to should written to
   *
   * @example
   * ```typescript
   * import { ProfielShapeType } from "./.ldo/foafProfile.shapeType.ts"
   *
   * const resource = connectedLdoDataset
   *   .getResource("https://example.com/profile");
   * const profile = connectedLdoDataset.createData(
   *   ProfileShapeType,
   *   "https://example.com/profile#me",
   *   resource
   * );
   * ```
   */
  createData<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
    resource: Plugins[number]["types"]["resource"],
    ...additionalResources: Plugins[number]["types"]["resource"][]
  ): Type {
    const resources = [resource, ...additionalResources];
    const linkedDataObject = this.usingType(shapeType)
      .write(...resources.map((r) => r.uri))
      .fromSubject(subject);
    startTransaction(linkedDataObject);
    return linkedDataObject;
  }

  /**
   * Sets conetext for a specific plugin
   *
   * @param pluginName - the name of the plugin
   * @param context - the context for this specific plugin
   */
  setContext<
    Name extends Plugins[number]["name"],
    Plugin extends Extract<Plugins[number], { name: Name }>,
  >(pluginName: Name, context: Plugin["types"]["context"]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.context[pluginName] = { ...this.context[pluginName], ...context };
  }

  public usingType<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
  ): ConnectedLdoBuilder<Type, Plugins> {
    const proxyBuilder = jsonldDatasetProxy(this, shapeType.context);
    return new ConnectedLdoBuilder(this, proxyBuilder, shapeType);
  }

  public startTransaction(): ConnectedLdoTransactionDataset<Plugins> {
    return new ConnectedLdoTransactionDataset(
      this,
      this.context,
      this.datasetFactory,
      this.transactionDatasetFactory,
    );
  }
}
