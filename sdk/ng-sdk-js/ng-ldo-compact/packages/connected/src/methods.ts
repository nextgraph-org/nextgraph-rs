import { startTransaction, type LdoBase, write, getDataset } from "@ldo/ldo";
import type { Quad } from "@rdfjs/types";
import { _proxyContext, getProxyFromObject } from "@ldo/jsonld-dataset-proxy";
import type { SubscribableDataset } from "@ldo/subscribable-dataset";
import type { Resource } from "./Resource.js";
import type { ConnectedLdoTransactionDataset } from "./ConnectedLdoTransactionDataset.js";
import type {
  AggregateSuccess,
  SuccessResult,
} from "./results/success/SuccessResult.js";
import type {
  AggregateError,
  ErrorResult,
} from "./results/error/ErrorResult.js";

/**
 * Begins tracking changes to eventually commit.
 *
 * @param input - A linked data object to track changes on
 * @param resource - A resource that all additions will eventually be committed to
 * @param additionalResources - Any additional resources that changes will eventually be committed to
 *
 * @returns A transactable Linked Data Object
 *
 * @example
 * ```typescript
 * import { changeData } from "@ldo/connected";
 *
 * // ...
 *
 * const profile = connectedLdoDataset
 *   .using(ProfileShapeType)
 *   .fromSubject("https://example.com/profile#me");
 * const resource = connectedLdoDataset.getResource("https://example.com/profile");
 *
 * const cProfile = changeData(profile, resource);
 * cProfile.name = "My New Name";
 * const result = await commitData(cProfile);
 * ```
 */
export function changeData<Type extends LdoBase>(
  input: Type,
  resource: Resource,
  ...additionalResources: Resource[]
): Type {
  const resources = [resource, ...additionalResources];
  // Clone the input and set a graph
  const [transactionLdo] = write(...resources.map((r) => r.uri)).usingCopy(
    input,
  );
  // Start a transaction with the input
  startTransaction(transactionLdo);
  // Return
  return transactionLdo;
}

/**
 * Commits the transaction to the global dataset, syncing all subscribing
 * components and connected Pods
 *
 * @param input - A transactable linked data object
 *
 * @example
 * ```typescript
 * import { changeData } from "@ldo/connected";
 *
 * // ...
 *
 * const profile = connectedLdoDataset
 *   .using(ProfileShapeType)
 *   .fromSubject("https://example.com/profile#me");
 * const resource = connectedLdoDataset.getResource("https://example.com/profile");
 *
 * const cProfile = changeData(profile, resource);
 * cProfile.name = "My New Name";
 * const result = await commitData(cProfile);
 * ```
 */
export async function commitData(
  input: LdoBase,
): Promise<AggregateSuccess<SuccessResult> | AggregateError<ErrorResult>> {
  const transactionDataset = getDataset(
    input,
  ) as ConnectedLdoTransactionDataset<[]>;
  const result = await transactionDataset.commitToRemote();
  if (result.isError) return result;
  // Take the LdoProxy out of commit mode. This uses hidden methods of JSONLD-DATASET-PROXY
  const proxy = getProxyFromObject(input);
  proxy[_proxyContext] = proxy[_proxyContext].duplicate({
    dataset: proxy[_proxyContext].state
      .parentDataset as SubscribableDataset<Quad>,
  });
  return result;
}
