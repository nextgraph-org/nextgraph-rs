import {useShape} from "@ng-org/signals/react";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";

export const useGroupData = (nuri: string | null | undefined) => {
  const ormGroups = useShape(SocialGroupShapeType, nuri ? nuri : undefined);
  const objects = [...(ormGroups || [])];
  const group = objects[0];

  return {group};
};
