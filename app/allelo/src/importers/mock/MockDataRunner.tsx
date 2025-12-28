import {SourceRunnerProps} from "@/types/importSource.ts";
import {useCallback, useEffect, useMemo} from "react";
import {dataService} from "@/services/dataService.ts";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";

export function MockDataRunner({open, onGetResult}: SourceRunnerProps) {
  const isNextGraph = useMemo(() => isNextGraphEnabled(), []);
  const getContacts = useCallback(async () => {
    if (!isNextGraph) {
      return [];
    }

    return await dataService.getContactsOrm();
  }, [isNextGraph])

  useEffect(() => {
    if (open) {
      getContacts().then((contacts) => {
        onGetResult(contacts, () => {
          console.log("Mock data saved to nextgraph: " + contacts.length);
        })
      });
    }
  }, [open, onGetResult, getContacts]);

  return null;
}