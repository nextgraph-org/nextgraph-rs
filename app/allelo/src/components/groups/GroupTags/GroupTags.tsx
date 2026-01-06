import {Tags} from "@/components/ui/Tags";
import {SocialGroup} from "@/.orm/shapes/group.typings.ts";
import {useCallback, useEffect, useState} from "react";

interface GroupTagsProps {
  group: SocialGroup;
  disabled?: boolean;
}

export const GroupTags = ({group, disabled}: GroupTagsProps) => {
  const [tags, setTags] = useState<string[]>([]);

  const initTags = useCallback(() => {
    const groupTags = [...group?.tag ?? []].map(tag => tag.startsWith("did:") ? tag.substring(4) : tag);
    setTags(groupTags);
  }, [group]);

  const handleTagAdd = useCallback((tag: string) => {
    if (!group) return;
    group.tag?.add(tag);
    initTags();
  }, [group, initTags]);

  const handleTagRemove = useCallback((tag: string) => {
    if (!group) return;
    group.tag?.delete(tag);
    initTags();
  }, [group, initTags]);

  useEffect(initTags, [initTags]);

  return <Tags
    existingTags={tags}
    handleTagAdd={handleTagAdd}
    handleTagRemove={handleTagRemove}
    useCamelCase={false}
    disabled={disabled}
  />
};