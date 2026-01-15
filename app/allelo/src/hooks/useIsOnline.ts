import {useEffect, useState} from "react";
import {LINKEDIN_API_URL} from "@/config/importers.ts";

export const useIsOnline = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${LINKEDIN_API_URL}/test/ping/`, {cache: "no-store"});
        const data = await res.json();
        if (!cancelled) setIsOnline(data?.pong === true);
      } catch {
        if (!cancelled) setIsOnline(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return isOnline;
}