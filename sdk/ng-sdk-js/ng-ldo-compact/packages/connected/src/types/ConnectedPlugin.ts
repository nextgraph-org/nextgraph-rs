/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ConnectedContext } from "./ConnectedContext.js";
import type { Resource } from "../Resource.js";
import type { ErrorResult } from "../results/error/ErrorResult.js";

/**
 * A ConnectedPlugin can be passed to a ConnectedDataset to allow it to connect
 * to a remote platform.
 */
export interface ConnectedPlugin<
  Name extends string = any,
  UriType extends string = any,
  ResourceType extends Resource<UriType> = any,
  ContextType = any,
  CreateResourceOptions = any,
> {
  /**
   * The name of the plugin ("solid" for example).
   */
  name: Name;
  /**
   * A function that returns a newly minted resource on this platform. This
   * function does not fetch the resource or interface with a cache.
   * @param uri - The uri of the resource
   * @param context - The context for the plugin
   */
  getResource(uri: UriType, context: ConnectedContext<this[]>): ResourceType;
  /**
   * A function that will create a resource on the remote at a random URI.
   * @param context - the context for the plugin
   * @param createResourceOptions - special options for creating a resource that
   * varies based on the plugin
   */
  createResource(
    context: ConnectedContext<this[]>,
    createResourceOptions?: CreateResourceOptions,
  ): Promise<ResourceType | ErrorResult>;
  /**
   * Checks if a specific uri is valid for this plugin
   * @param uri - the URI to check
   * @returns true if this is a valid URI
   */
  isUriValid(uri: string): uri is UriType;
  /**
   * Optional function that takes in a URI and returns a normalized uri. For
   * example `https://example.com/profile#me` becomes
   * `https://example.com/profile`.
   * @param uri - The uri to normalize
   * @returns - The normalized uri
   */
  normalizeUri?: (uri: UriType) => UriType;
  /**
   * A starting context
   */
  initialContext: ContextType;
  /**
   * This object exists to transfer typescript types. It does not need to be
   * filled out in an actual instance.
   */
  types: {
    uri: UriType;
    context: ContextType;
    resource: ResourceType;
    createResourceOptions: CreateResourceOptions;
  };
}
