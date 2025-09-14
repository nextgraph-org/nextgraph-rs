/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 } from "uuid";
import { FOR_CLASS, RDF_TYPE, TYPE_REGISTRATION } from "./constants.js";
import { guaranteeOptions, type Options } from "./util/Options.js";
import { namedNode, quad } from "@ldo/rdf-utils";
import type { TypeRegistration } from "./.ldo/typeIndex.typings.js";
import { getProfile } from "./getTypeIndex.js";
import { TypeIndexProfileShapeType } from "./.ldo/profile.shapeTypes.js";
import type { NamedNode } from "@rdfjs/types";
import { set } from "@ldo/ldo";
import type {
  SolidConnectedPlugin,
  SolidContainer,
  SolidContainerUri,
  SolidLeafUri,
} from "@ldo/connected-solid";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import {
  TypeIndexDocumentShapeType,
  TypeRegistrationShapeType,
} from "./.ldo/typeIndex.shapeTypes.js";

/**
 * =============================================================================
 * INITIALIZERS
 * =============================================================================
 */
export async function initTypeIndex(
  webId: string,
  options?: Options,
): Promise<void> {
  const { dataset } = guaranteeOptions(options);
  const profile = await getProfile(webId, options);
  if (!profile.privateTypeIndex?.size || !profile.publicTypeIndex?.size) {
    const profileFolder = await dataset
      .getResource(webId as SolidLeafUri | SolidContainerUri)
      .getParentContainer();
    if (profileFolder?.isError) throw profileFolder;
    if (!profileFolder)
      throw new Error("No folder to save the type indexes to.");
    if (!profile.privateTypeIndex?.size) {
      await createIndex(webId, profileFolder, dataset, true);
    }
    if (!profile.publicTypeIndex?.size) {
      await createIndex(webId, profileFolder, dataset, false);
    }
  }
}

/**
 * @internal
 * @param webId
 * @param profileFolder
 * @param dataset
 */
export async function createIndex(
  webId,
  profileFolder: SolidContainer,
  dataset: ConnectedLdoDataset<
    (SolidConnectedPlugin | ConnectedPlugin<any, any, any, any>)[]
  >,
  isPrivate: boolean,
) {
  // Create a private type index
  const createResult = await profileFolder.createChildAndOverwrite(
    `${isPrivate ? "private" : "public"}_index_${v4()}`,
  );
  if (createResult.isError) throw createResult;
  const indexResource = createResult.resource;
  const wacResult = await indexResource.setWac({
    agent: {
      [webId]: { read: true, write: true, append: true, control: true },
    },
    public: {
      read: isPrivate ? false : true,
      write: true,
      append: true,
      control: true,
    },
    authenticated: {
      read: isPrivate ? false : true,
      write: true,
      append: true,
      control: true,
    },
  });
  if (wacResult.isError) throw wacResult;
  const transaction = dataset.startTransaction();
  const cProfile = transaction
    .usingType(TypeIndexProfileShapeType)
    .write(dataset.getResource(webId).uri)
    .fromSubject(webId);
  if (isPrivate) {
    cProfile.privateTypeIndex?.add({ "@id": indexResource.uri });
  } else {
    cProfile.publicTypeIndex?.add({ "@id": indexResource.uri });
  }
  const cTypeIndex = transaction
    .usingType(TypeIndexDocumentShapeType)
    .write(indexResource.uri)
    .fromSubject(indexResource.uri);

  cTypeIndex.type = set({ "@id": "ListedDocument" }, { "@id": "TypeIndex" });
  const commitResult = await transaction.commitToRemote();
  if (commitResult.isError) throw commitResult;
}

/**
 * =============================================================================
 * DATASET MODIFIERS
 * =============================================================================
 */
interface Instances {
  instance?: string[];
  instanceContainer?: string[];
}

/**
 * Adds an instance to a TypeRegistration
 * @param indexUri The URI of the TypeIndex
 * @param classUri The URI for the class the instance should be added to
 * @param instances Objects representing the instances to add
 * @param options Options
 */
export function addRegistration(
  indexUri: string,
  classUri: string,
  instances: Instances,
  options?: Options,
): void {
  // Check to see if its already in the index
  const typeRegistration = findAppropriateTypeRegistration(
    indexUri,
    classUri,
    options,
  );

  // Add instances to type registration
  instances.instance?.forEach((instance) => {
    typeRegistration.instance?.add({ "@id": instance });
  });
  instances.instanceContainer?.forEach((instanceContainer) => {
    typeRegistration.instanceContainer?.add({ "@id": instanceContainer });
  });
}

/**
 * Removes instances from a TypeRegistration
 * @param indexUri The URI of the TypeIndex
 * @param classUri The URI for the class the instance should be removed from
 * @param instances Objects representing the instances to remove
 * @param options Options
 */
export async function removeRegistration(
  indexUri: string,
  classUri: string,
  instances: Instances,
  options?: Options,
) {
  // Check to see if its already in the index
  const typeRegistration = findAppropriateTypeRegistration(
    indexUri,
    classUri,
    options,
  );

  // Add instances to type registration
  instances.instance?.forEach((instanceUri) => {
    typeRegistration.instance?.delete({ "@id": instanceUri });
  });
  instances.instanceContainer?.forEach((instanceContainerUri) => {
    typeRegistration.instanceContainer?.delete({ "@id": instanceContainerUri });
  });
}

/**
 * Finds a TypeRegistration inside of a type index. If it doesn't exist, it
 * creates one.
 * @param indexUri The URI of the typeIndex
 * @param classUri The URI of the class in question for the TypeRegistration
 * @param options
 * @returns The Type Index
 */
export function findAppropriateTypeRegistration(
  indexUri: string,
  classUri: string,
  options?: Options,
): TypeRegistration {
  const { dataset } = guaranteeOptions(options);
  // Check to see if its already in the index
  const existingRegistrationsUris: NamedNode[] = dataset
    .match(
      null,
      namedNode(RDF_TYPE),
      namedNode(TYPE_REGISTRATION),
      namedNode(indexUri),
    )
    .toArray()
    .map((quad) => quad.subject) as NamedNode[];

  const existingRegistrationForClassUri = existingRegistrationsUris.find(
    (registrationUri) => {
      return dataset.has(
        quad(
          registrationUri,
          namedNode(FOR_CLASS),
          namedNode(classUri),
          namedNode(indexUri),
        ),
      );
    },
  )?.value;

  let typeRegistration: TypeRegistration;
  if (existingRegistrationForClassUri) {
    typeRegistration = dataset
      .usingType(TypeRegistrationShapeType)
      .write(indexUri)
      .fromSubject(existingRegistrationForClassUri);
  } else {
    typeRegistration = dataset
      .usingType(TypeRegistrationShapeType)
      .write(indexUri)
      .fromSubject(`${indexUri}#${v4()}`);
    typeRegistration.type = { "@id": "TypeRegistration" };
    typeRegistration.forClass = { "@id": classUri };
  }
  return typeRegistration;
}
