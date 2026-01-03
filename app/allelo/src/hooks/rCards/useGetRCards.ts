import {useCallback} from "react";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {RCard} from "@/.orm/shapes/rcard.typings.ts";
import {useRCardsConfigs} from "@/hooks/rCards/useRCardsConfigs.ts";
import {rCardService} from "@/services/rCardService.ts";
import {getRCardsGraph} from "@/utils/rCardsUtils.ts";
import {useShape} from "@ng-org/orm/react";
import {RCardShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";

interface GetRCardsReturn {
  getRCardIDs: () => Promise<string[]>;
  rCardsExist: () => Promise<boolean>;
  rCards: Set<RCard>;
  getRCardById: (rCardId: string) => RCard | undefined;
  getMenuItems: () => Array<{ value: string; label: string }>;
}

export const useGetRCards = (): GetRCardsReturn => {
  const {session} = useNextGraphAuth() || {} as NextGraphAuth;

  const rCards = useShape(RCardShapeType, "did:ng:i") as Set<RCard>;

  const {getCategoryDisplayName} = useRCardsConfigs();

  const getRCardIDs = useCallback(async () => {
    return rCardService.getRCardsIDs(session).then((rCards) => rCards.map((rCard) => getRCardsGraph(rCard, session)));
  }, [session]);

  const rCardsExist = useCallback(async () => {
    const rCards = await getRCardIDs();
    return rCards.length > 0;
  }, [getRCardIDs]);

  const getRCardById = useCallback((rCardId: string): RCard | undefined =>
    [...rCards]?.find(rCard => rCard["@id"] === rCardId) ?? [...rCards]?.find(rCard => rCard.cardId === "default"), [rCards]);

  const getMenuItems = useCallback(() => [
    {value: 'all', label: 'All Relationships'},
    ...[...rCards]
      .map(rCard => ({
        value: rCard["@id"]!,
        label: getCategoryDisplayName(rCard.cardId)
      }))
  ], [getCategoryDisplayName, rCards]);

  return {
    getRCardIDs,
    rCardsExist,
    rCards,
    getRCardById,
    getMenuItems,
  }
}