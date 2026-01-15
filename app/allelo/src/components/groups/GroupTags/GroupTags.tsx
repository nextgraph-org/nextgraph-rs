import {Tags} from "@/components/ui/Tags";
import {SocialGroup} from "@/.orm/shapes/group.typings.ts";
import {useCallback, useEffect, useState} from "react";
import {contactDictMapper} from "@/utils/dictMappers.ts";

interface GroupTagsProps {
  group: SocialGroup;
  disabled?: boolean;
}

export const GroupTags = ({group, disabled}: GroupTagsProps) => {
  const [tags, setTags] = useState<string[]>([]);

  const initTags = useCallback(() => {
    const groupTags = [...group?.tag ?? []].map(contactDictMapper.removePrefix);
    setTags(groupTags);
  }, [group]);

  const handleTagAdd = useCallback((tag: string) => {
    if (!group) return;
    tag = contactDictMapper.getPrefix("tag", "valueIRI") + tag;
    group.tag?.add(tag);
    initTags();
  }, [group, initTags]);

  const handleTagRemove = useCallback((tag: string) => {
    if (!group) return;
    tag = contactDictMapper.getPrefix("tag", "valueIRI") + tag;
    group.tag?.delete(tag);
    initTags();
  }, [group, initTags]);

  useEffect(initTags, [initTags]);

  return <Tags
    existingTags={tags}
    handleTagAdd={handleTagAdd}
    handleTagRemove={handleTagRemove}
    disabled={disabled}
  />
};