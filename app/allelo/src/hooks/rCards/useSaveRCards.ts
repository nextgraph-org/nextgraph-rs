import {useCallback} from "react";
import {relationshipCategories} from "@/constants/relationshipCategories.ts";
import {dataset, useLdo, useNextGraphAuth} from "@/lib/nextgraph.ts";
import {
  NextGraphAuth,
} from "@/types/nextgraph.ts";
import {useGetRCards} from "@/hooks/rCards/useGetRCards.ts";
import {RCardShapeType} from "@/.ldo/rcard.shapeTypes.ts";
import {RCardPermission} from "@/.ldo/rcard.typings.ts";

interface SaveRCardsReturn {
  saveDefaultRCards: () => void;
}

export const useSaveRCards = (): SaveRCardsReturn => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const {commitData, createData, changeData} = useLdo();
  const {rCardsExist} = useGetRCards();

  const createRCard = useCallback(async (
    id: string,
    order: number,
    permissions: RCardPermission[],
  ) => {
    const resource = await dataset.createResource("nextgraph");
    if (resource.isError) {
      throw new Error(`Failed to create resource`);
    }
    // @ts-expect-error InvalidIdentifierResouce
    if (resource.isError || resource.type === "InvalidIdentifierResouce" || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to create resource`);
    }

    await session!.ng!.update_header(session.sessionId, resource.uri.substring(0, 53), id);

    let rCardObj = createData(
      RCardShapeType,
      resource.uri.substring(0, 53),
      resource
    );
    await commitData(rCardObj);

    rCardObj = changeData(rCardObj, resource);
    // @ts-expect-error ldo issue
    rCardObj.type = {"@id": "Card"};
    rCardObj.order = order;
    rCardObj.cardId = id;
    permissions.forEach((el: any, index) => {
      el.order = index;
      rCardObj.permission?.add(el);
    });

    await commitData(rCardObj);

    return resource.uri;
  }, [changeData, commitData, createData, session]);

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

  return {
    saveDefaultRCards
  }
}