import {useCallback, useEffect, useState} from "react";
import {Tags} from "@/components/ui/Tags";
import {appendPrefixToDictValue, getContactDictValues, removePrefix} from "@/utils/socialContact/dictMapper.ts";
import {SocialContact, Tag} from "@/.orm/shapes/contact.typings.ts";

const allTags = [...getContactDictValues("tag", "valueIRI")].sort();

export interface ContactTagsProps {
  contact?: SocialContact;
}

function getTagValueIri(tag: string) {
  return appendPrefixToDictValue("tag", "valueIRI", tag);
}

export const ContactTags = ({contact}: ContactTagsProps) => {
  const [existingTags, setExistingTags] = useState<string[]>([]);

  const initTags = useCallback((tags: Set<Tag> | undefined) => {
    const tagValues = [...tags ?? []].map(tag => removePrefix(tag.valueIRI));
    setExistingTags(tagValues);
  }, []);

  useEffect(() => initTags(contact?.tag), [initTags, contact]);

  const handleTagAdd = useCallback((tag: string) => {
    if (!contact) return;

    const newTag: Tag = {
      "@graph": "",
      "@id": "",
      source: "user",
      valueIRI: getTagValueIri(tag)
    }

    contact.tag ??= new Set<Tag>();
    contact.tag.add(newTag);

    initTags(contact.tag);
  }, [contact, initTags]);

  const handleTagRemove = useCallback((tagValue: string) => {
    const tagToRemove = [...contact?.tag ?? []].find(tag => tag.valueIRI === getTagValueIri(tagValue));
    if (!contact?.tag || !tagToRemove) return;
    contact.tag.delete(tagToRemove);
    initTags(contact.tag);
  }, [contact, initTags]);

  return <Tags
    handleTagAdd={handleTagAdd}
    handleTagRemove={handleTagRemove}
    existingTags={existingTags}
    availableTags={allTags}
  />;
}