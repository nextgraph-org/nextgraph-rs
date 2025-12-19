import {useShape} from "@ng-org/orm/react";
import {SocialGroupShapeType} from "@/.orm/shapes/group.shapeTypes.ts";
import {useCallback, useMemo} from "react";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";
import {groupsOverlay} from "@/constants/overlays.ts";
import {GroupMembership} from "@/.orm/shapes/group.typings.ts";

export const useGroupData = (nuri: string | null | undefined) => {
  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;

  let fullNuri = nuri;
  if (nuri && nuri.length < 54) {
    fullNuri = nuri + groupsOverlay(session)
  }

  const ormGroups = useShape(SocialGroupShapeType, fullNuri ? fullNuri : undefined);
  const objects = [...(ormGroups || [])];
  const group = objects[0];
  const {ormContact} = useContactOrm(undefined, true);


  const isAdmin = useMemo(() => {
    if (ormContact && ormContact['@id'])
      return Boolean([...group?.hasMember ?? []].find((el => el.contactId === ormContact['@id'] && el.isAdmin)));
    return false;
  }, [group?.hasMember, ormContact]);

  const addMembers = useCallback(async (contactsNuris: string[]) => {
    if (contactsNuris.length === 0 || !group) return;
    if (!isAdmin) return;

    try {
      contactsNuris.forEach((el) => {
        const member: GroupMembership = {
          "@id": "",
          "@graph": "",
          contactId: el,
          memberStatus: "did:ng:k:contact:memberStatus#invited"
        }
        group?.hasMember?.add(member);
      });

    } catch (error) {
      console.error('Failed to add members:', error);
    }
  }, [group, isAdmin]);

  const removeMember = useCallback((nuri: string) => {
    if (!nuri || !group || !group?.hasMember) return;
    if (!isAdmin) return;

    try {
      const memberToRemove = [...group?.hasMember ?? []].find((el => el.contactId === nuri));
      if (memberToRemove) {
        group.hasMember.delete(memberToRemove);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  }, [group, isAdmin]);


  return {group, addMembers, isAdmin, removeMember};
};
