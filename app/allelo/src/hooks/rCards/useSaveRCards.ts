import {useCallback, useEffect, useRef, useState} from "react";
import {relationshipCategories} from "@/constants/relationshipCategories.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {
  NextGraphAuth,
} from "@/types/nextgraph.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {RCardShapeType} from "@/.orm/shapes/rcard.shapeTypes.ts";
import {RCardPermission} from "@/.orm/shapes/rcard.typings.ts";
import {RCard} from "@/.orm/shapes/rcard.typings.ts";
import {getShortId} from "@/utils/orm/ormUtils.ts";
import {useShape} from "@ng-org/orm/react";

interface SaveRCardsReturn {
  saveDefaultRCards: () => Promise<void>;
}

export const useSaveRCards = (): SaveRCardsReturn => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const {rCardsExist} = useGetRCards();
  const [currentDocId, setCurrentDocId] = useState<string | undefined>(undefined);
  const currentRcardRef = useRef<RCard | undefined>(undefined);

  const rCardsSet = useShape(RCardShapeType, currentDocId);

  const createRCard = useCallback(async (
    rCardName: string,
    order: number,
    permissions: RCardPermission[],
  ) => {
    const docId = await session.ng!.doc_create(
      session.sessionId,
      "Graph",
      "data:graph",
      "store"
    );

    await session!.ng!.update_header(session.sessionId, docId, rCardName);

    const rCardObj: RCard = {
      "@graph": docId,
      "@id": getShortId(docId),
      "@type": new Set(["did:ng:x:social:rcard#Card"]),
      "cardId": rCardName,
      order,
      permission: new Set()
    }

    permissions.forEach((el: any, index) => {
      el.order = index;
      rCardObj.permission?.add(el);
    });

    currentRcardRef.current = rCardObj;

    setCurrentDocId(docId);
  }, [session]);

  const saveDefaultRCards = useCallback(async () => {
    if (!session) return;
    const exists = await rCardsExist();
    if (exists) {
      return;
    }
    let i = 0;
    for (const category of relationshipCategories) {
      i++;
      try {
        const permissions = category.permissions;
        permissions.forEach((permission) => permission.isPermissionGiven = true);
        await createRCard(category.id, i, permissions);
      } catch (error) {
        console.log(error);
      }
    }
  }, [createRCard, rCardsExist, session]);

  useEffect(() => {
    if (currentDocId && rCardsSet && currentRcardRef.current) {
      rCardsSet.add(currentRcardRef.current);
      currentRcardRef.current = undefined;
    }
  }, [currentDocId, rCardsSet]);

  return {
    saveDefaultRCards
  }
}