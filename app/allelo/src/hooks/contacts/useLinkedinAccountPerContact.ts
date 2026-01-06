import {useEffect, useState} from "react";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {contactService} from "@/services/contactService.ts";

export const useLinkedinAccountPerContact = () => {
  const [linkedinAccounts, setLinkedinAccounts] = useState<Record<string, string>>({});
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  useEffect(() => {
    if (!session) return;

    contactService.getAllLinkedinAccountsByContact(session).then(accounts => {
      setLinkedinAccounts(accounts);
    });
  }, [session]);

  return linkedinAccounts;
}
