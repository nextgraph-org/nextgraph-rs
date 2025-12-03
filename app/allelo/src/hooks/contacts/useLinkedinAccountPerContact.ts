import {useEffect, useState} from "react";
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";

export const useLinkedinAccountPerContact = () => {
  const [linkedinAccounts, setLinkedinAccounts] = useState<Record<string, string>>({});
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  useEffect(() => {
    if (!session) return;

    nextgraphDataService.getAllLinkedinAccountsByContact(session).then(accounts => {
      setLinkedinAccounts(accounts);
    });
  }, [session]);

  return linkedinAccounts;
}
