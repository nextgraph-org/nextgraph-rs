import {useCallback, useEffect, useState} from "react";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {RCard, RCardPermission} from "@/.ldo/rcard.typings.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {rCardService} from "@/services/rCardService.ts";

interface GetRCardsReturn {
  getRCardIDs: () => Promise<string[]>;
  rCardsExist:  () => Promise<boolean>;
  getRCards: () => Promise<RCard[]>;
  rCards: RCard[];
  loading: boolean;
  error: unknown;
  getRCardById: (rCardId: string) => RCard | undefined;
  getMenuItems: () => Array<{ value: string; label: string }>;
}

export const useGetRCards = (): GetRCardsReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const [rCards, setRCards] = useState<RCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  
  const {getCategoryDisplayName} = useRCardsConfigs();

  const getRCardIDs = useCallback(async () => {
    return await rCardService.getRCardsIDs(session);
  }, [session]);

  const rCardsExist = useCallback(async () => {
    const rCards = await getRCardIDs();
    return rCards.length > 0;
  }, [getRCardIDs]);

  const getRCards = useCallback(async () => {
    if (!session) return [];

    const rCardIDs = await getRCardIDs();
    const rCards: RCard[] = [];

    for (const rcardUri of rCardIDs) {
      const sparql = `
PREFIX ngrcard: <did:ng:x:social:rcard#>
PREFIX ngpermission: <did:ng:x:social:rcard:permission#>

SELECT ?cardId ?order ?permId ?node ?firstLevel ?secondLevel ?zone ?permOrder ?isPermissionGiven ?isMultiple ?selector
WHERE {
  <${rcardUri}> ngrcard:cardId ?cardId .
  OPTIONAL { <${rcardUri}> ngrcard:order ?order . }

  OPTIONAL {
    <${rcardUri}> ngpermission:permission ?permId .
    OPTIONAL { ?permId ngpermission:node ?node . }
    ?permId ngpermission:firstLevel ?firstLevel .
    OPTIONAL { ?permId ngpermission:secondLevel ?secondLevel . }
    ?permId ngpermission:zone ?zone .
    OPTIONAL { ?permId ngrcard:order ?permOrder . }
    OPTIONAL { ?permId ngpermission:isPermissionGiven ?isPermissionGiven . }
    OPTIONAL { ?permId ngpermission:isMultiple ?isMultiple . }
    OPTIONAL { ?permId ngpermission:selector ?selector . }
  }
}
`;

      const result = await session.ng!.sparql_query(session.sessionId, sparql);

      if (!result?.results?.bindings?.length) continue;

      const firstBinding = result.results.bindings[0];
      const rCard: RCard = {
        "@id": rcardUri,
        cardId: firstBinding.cardId.value,
        order: firstBinding.order?.value ? parseInt(firstBinding.order.value) : undefined,
      } as RCard;

      // Collect all permissions
      const permissions: RCardPermission[] = [];
      for (const binding of result.results.bindings) {
        if (binding.permId?.value) {
          const permission: RCardPermission = {
            "@id": binding.permId.value,
            firstLevel: binding.firstLevel.value,
            zone: {["@id"]: binding.zone.value.split('#').pop()} as any
          };

          if (binding.node?.value) permission.node = {["@id"]: binding.node.value};
          if (binding.secondLevel?.value) permission.secondLevel = binding.secondLevel.value;
          if (binding.permOrder?.value) permission.order = parseInt(binding.permOrder.value);
          if (binding.isPermissionGiven?.value) permission.isPermissionGiven = binding.isPermissionGiven.value === "true";
          if (binding.isMultiple?.value) permission.isMultiple = binding.isMultiple.value === "true";
          if (binding.selector?.value) permission.selector = binding.selector.value;

          permissions.push(permission);
        }
      }

      if (permissions.length > 0) {
        rCard.permission = permissions as any;
      }

      rCards.push(rCard);
    }

    return rCards;
  }, [session, getRCardIDs]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await getRCards();
        if (!cancelled) {
          setRCards(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getRCards]);

  const getRCardById = useCallback((rCardId: string): RCard | undefined =>
    rCards?.find(rCard => rCard["@id"] === rCardId) ?? rCards?.find(rCard => rCard.cardId === "default"), [rCards]);

  const getMenuItems = useCallback(() => [
    {value: 'all', label: 'All Relationships'},
    ...(rCards ?? [])
      .map(rCard => ({
        value: rCard["@id"]!,
        label: getCategoryDisplayName(rCard.cardId)
      }))
  ], [getCategoryDisplayName, rCards]);

  return {
    getRCardIDs,
    rCardsExist,
    getRCards,
    rCards,
    loading,
    error,
    getRCardById,
    getMenuItems,
  }
}