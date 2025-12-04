import {useCallback, useState} from 'react';
import {dataset, useLdo, useNextGraphAuth} from '@/lib/nextgraph';
import {NextGraphAuth} from "@/types/nextgraph";
import {groupService} from "@/services/groupService";
import {SocialGroup} from "@/.ldo/group.typings";
import { SocialGroupShapeType } from '@/.ldo/group.shapeTypes';
import {LdSet} from "@ldo/ldo";

interface UseSaveGroupsReturn {
  createGroup: (group: Partial<SocialGroup>) => Promise<string | undefined>;
  updateGroup: (group: SocialGroup, updates: Partial<SocialGroup>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useSaveGroups(): UseSaveGroupsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextGraphAuth = useNextGraphAuth();
  const {session} = nextGraphAuth || {} as NextGraphAuth;
  const {commitData, createData, changeData} = useLdo();

  const saveGroup = useCallback(async (group: Partial<SocialGroup>): Promise<string | undefined> => {
    const resource = await dataset.createResource("nextgraph");
    if (resource.isError) {
      throw new Error(`Failed to create resource`);
    }
    // @ts-expect-error InvalidIdentifierResouce
    if (resource.isError || resource.type === "InvalidIdentifierResouce" || resource.type === "InvalidIdentifierResource") {
      throw new Error(`Failed to create resource`);
    }

    let groupObj = createData(
      SocialGroupShapeType,
      resource.uri.substring(0, 53),
      resource
    );
    await commitData(groupObj);

    groupObj = changeData(groupObj, resource);
    // @ts-expect-error ldo
    groupObj.type = {"@id": "Group"};

    for (const propertyKey in group) {
      if (["@id", "@context", "type"].includes(propertyKey)) {
        continue;
      }

      const importValue = group[propertyKey as keyof SocialGroup];
      if (importValue !== undefined) {
        if (["tag", "hasMember", "hasAdmin", "post"].includes(propertyKey)) {
          const importLdSet = importValue as LdSet<any>;

          importLdSet.forEach((el: any) => {
            //@ts-expect-error dynamic property assignment
            groupObj[propertyKey]?.add(el);
          });
        } else {
          //@ts-expect-error dynamic property assignment
          groupObj[propertyKey] = importValue;
        }
      }
    }

    await commitData(groupObj);

    const groupTitle = group.title ?? 'Untitled Group';
    await session!.ng!.update_header(session.sessionId, resource.uri.substring(0, 53), groupTitle);

    return resource.uri;
  }, [changeData, commitData, createData, session]);

  const createGroup = useCallback(async (group: Partial<SocialGroup>): Promise<string | undefined> => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      return saveGroup(group);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, saveGroup]);

  const updateGroup = useCallback(async (group: SocialGroup, updates: Partial<SocialGroup>) => {
    if (!session || !session.ng) {
      const errorMsg = 'No active session available';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setIsLoading(true);
    setError(null);

    try {
      await groupService.updateGroup(session, group, updates, commitData, changeData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update group';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session, commitData, changeData]);

  return {
    createGroup,
    updateGroup,
    isLoading,
    error
  };
}
