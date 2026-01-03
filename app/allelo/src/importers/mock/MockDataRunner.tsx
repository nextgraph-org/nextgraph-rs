import {SourceRunnerProps} from "@/types/importSource.ts";
import {useEffect} from "react";
import {dataService} from "@/services/dataService.ts";

export function MockDataRunner({open, onGetResult}: SourceRunnerProps) {
  useEffect(() => {
    if (open) {
      dataService.getContactsOrm().then((contacts) => {
        onGetResult(contacts, () => {
          console.log("Mock data saved to nextgraph: " + contacts.length);
        })
      });
    }
  }, [open, onGetResult]);

  return null;
}