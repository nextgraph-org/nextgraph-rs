import {
  changeData,
  // changeData,
  type ConnectedLdoDataset,
  type ConnectedLdoTransactionDataset,
  type ConnectedPlugin,
} from "@ldo/connected";
import { getDataset, type LdoBase, type ShapeType } from "@ldo/ldo";
import type { SubjectNode } from "@ldo/rdf-utils";

/**
 * The methods returned by useLdo
 */
export interface UseLdoMethods<Plugins extends ConnectedPlugin[]> {
  /**
   * A ConnectedLdoDataset
   */
  dataset: ConnectedLdoDataset<Plugins>;
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
   */
  getResource: ConnectedLdoDataset<Plugins>["getResource"];
  /**
   * Sets conetext for a specific plugin
   *
   * @param pluginName - the name of the plugin
   * @param context - the context for this specific plugin
   */
  setContext: ConnectedLdoDataset<Plugins>["setContext"];
  /**
   * Gets a linked data object based on the subject
   */
  getSubject<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
  ): Type;
  /**
   * Shorthand for connectedLdoDataset
   *   .usingType(shapeType)
   *   .write(...resources.map((r) => r.uri))
   *   .fromSubject(subject);
   * @param shapeType - The shapetype to represent the data
   * @param subject - A subject URI
   * @param resources - The resources changes to should written to
   */
  createData<Type extends LdoBase>(
    shapeType: ShapeType<Type>,
    subject: string | SubjectNode,
    resource: Plugins[number]["types"]["resource"],
    ...additionalResources: Plugins[number]["types"]["resource"][]
  ): Type;
  /**
   * Returns a writable LinkedDataObject given a linked data object
   */
  changeData<Type extends LdoBase>(
    input: Type,
    resource: Plugins[number]["types"]["resource"],
    ...additionalResources: Plugins[number]["types"]["resource"][]
  ): Type;
  /**
   * Commits the data of a writable Linke Data Object back to the remote.
   */
  commitData(
    input: LdoBase,
  ): ReturnType<ConnectedLdoTransactionDataset<Plugins>["commitToRemote"]>;
}

/**
 * @internal
 * Creates the useLdoHook
 */
export function createUseLdo<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  const toReturn = {
    dataset,
    /**
     * Gets a resource
     */
    getResource: dataset.getResource.bind(dataset),
    /**
     * Set the context
     */
    setContext: dataset.setContext.bind(dataset),
    /**
     * Returns a Linked Data Object for a subject
     * @param shapeType The shape type for the data
     * @param subject Subject Node
     * @returns A Linked Data Object
     */
    getSubject<Type extends LdoBase>(
      shapeType: ShapeType<Type>,
      subject: string | SubjectNode,
    ): Type {
      return dataset.usingType(shapeType).fromSubject(subject);
    },
    /**
     * Begins tracking changes to eventually commit for a new subject
     * @param shapeType The shape type that defines the created data
     * @param subject The RDF subject for a Linked Data Object
     * @param resources Any number of resources to which this data should be written
     * @returns A Linked Data Object to modify and commit
     */
    createData<Type extends LdoBase>(
      shapeType: ShapeType<Type>,
      subject: string | SubjectNode,
      resource: Plugins[number]["types"]["resource"],
      ...additionalResources: Plugins[number]["types"]["resource"][]
    ): Type {
      return dataset.createData(
        shapeType,
        subject,
        resource,
        ...additionalResources,
      );
    },
    /**
     * Begins tracking changes to eventually commit
     * @param input A linked data object to track changes on
     * @param resources
     */
    changeData: changeData,
    /**
     * Commits the transaction to the global dataset, syncing all subscribing
     * components and Solid Pods
     */
    commitData(
      input: LdoBase,
    ): ReturnType<ConnectedLdoTransactionDataset<Plugins>["commitToRemote"]> {
      const inputDataset = getDataset(
        input,
      ) as ConnectedLdoTransactionDataset<Plugins>;
      return inputDataset.commitToRemote();
    },
  };
  return function useLdo(): UseLdoMethods<Plugins> {
    return toReturn;
  };
}
