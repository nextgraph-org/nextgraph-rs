import { useCallback, useMemo, useState, useEffect } from "react";
import type {
  ConnectedLdoDataset,
  ConnectedLdoTransactionDataset,
  ConnectedPlugin,
  IConnectedLdoDataset,
} from "@ldo/connected";
import type { useChangeCommitData } from "./types.js";

export type useChangeDatasetReturn<Plugins extends ConnectedPlugin[]> = [
  ConnectedLdoTransactionDataset<Plugins>,
  useChangeSetDataset<Plugins>,
  useChangeCommitData<Plugins>,
];

export type useChangeSetDataset<Plugins extends ConnectedPlugin[]> = (
  changer: (toChange: ConnectedLdoTransactionDataset<Plugins>) => void,
) => void;

/**
 * @internal
 *
 * Creates a useChangeDataset function
 */
export function createUseChangeDataset<Plugins extends ConnectedPlugin[]>(
  dataset: ConnectedLdoDataset<Plugins>,
) {
  /**
   * Returns a transaction on the dataset that can be modified and committed
   */
  return function useChangeDataset(
    specificDataset?: IConnectedLdoDataset<Plugins>,
  ): useChangeDatasetReturn<Plugins> {
    const [transactionDataset, setTransactionDataset] = useState<
      ConnectedLdoTransactionDataset<Plugins>
    >(() => {
      return (
        specificDataset ?? dataset
      ).startTransaction() as ConnectedLdoTransactionDataset<Plugins>;
    });

    // Update transaction dataset when specificDataset changes
    useEffect(() => {
      setTransactionDataset(
        (
          specificDataset ?? dataset
        ).startTransaction() as ConnectedLdoTransactionDataset<Plugins>,
      );
    }, [specificDataset]);

    const setData = useCallback<useChangeSetDataset<Plugins>>(
      (changer) => {
        const subTransaction = transactionDataset.startTransaction();
        changer(subTransaction);
        subTransaction.commit();
      },
      [transactionDataset],
    );

    const commitData = useCallback<useChangeCommitData<Plugins>>(async () => {
      const result = await transactionDataset.commitToRemote();
      if (!result.isError) {
        // Replace with a new transaction from the dataset or specificDataset
        setTransactionDataset(
          (
            specificDataset ?? dataset
          ).startTransaction() as ConnectedLdoTransactionDataset<Plugins>,
        );
      }
      return result;
    }, [transactionDataset, specificDataset]);

    return useMemo(
      () => [transactionDataset, setData, commitData],
      [transactionDataset, setData, commitData],
    );
  };
}
