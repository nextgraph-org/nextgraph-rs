import {useShape} from "@ng-org/orm/react";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";
import {useCallback, useMemo} from "react";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";

export const useGroupData = (nuri: string | null | undefined) => {
  const ormGroups = useShape(SocialGroupShapeType, nuri ? nuri : undefined);
  const objects = [...(ormGroups || [])];
  const group = objects[0];
  const {ormContact} = useContactOrm(undefined, true);

  const isAdmin = useMemo(() => {
    if (ormContact && ormContact['@id'])
      return [...group?.hasAdmin ?? []].includes(ormContact['@id']);
    return false;
  }, [group?.hasAdmin, ormContact]);

  const addMembers = useCallback((contactsNuris: string[]) => {
    if (contactsNuris.length === 0 || !group) return;
    if (!isAdmin) return;

    try {
      contactsNuris.forEach((el) => {
        group?.hasMember?.add(el);
      });

    } catch (error) {
      console.error('Failed to add members:', error);
    }
  }, [group, isAdmin]);

  const removeMember = useCallback((nuri: string) => {
    if (!nuri || !group || !group?.hasMember) return;
    if (!isAdmin) return;

    try {
      group.hasMember.delete(nuri);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }, [group, isAdmin]);


  return {group, addMembers, isAdmin, removeMember};
};
