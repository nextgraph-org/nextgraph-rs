import {SocialContact, Tag} from "@/.ldo/contact.typings.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {getContactDictValues} from "@/utils/socialContact/dictMapper.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {Tags} from "@/components/ui/Tags";

const allTags = getContactDictValues("tag").sort();

export interface ContactTagsProps {
  contact?: SocialContact;
  resource?: NextGraphResource;
}

export const ContactTags = ({contact, resource}: ContactTagsProps) => {
  const [tags, setTags] = useState<Tag[]>();
  const {commitData, changeData} = useLdo();

  const initTags = useCallback(() => {
    const contactTags = contact?.tag?.toArray().filter(tag => tag["@id"]).map(tag => {
      return {
        "@id": tag["@id"],
        source: "user",
        //@ts-expect-error ldo is messing the structure
        valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
      } as Tag;
    }) ?? [];
    setTags(contactTags);
  }, [contact]);

  useEffect(initTags, [initTags]);

  const isNextgraph = useMemo(() => isNextGraphEnabled(), []);

  const existingTags = useMemo(() => tags?.map(tag => tag.valueIRI["@id"] as string) || [], [tags]);
  const availableTags = useMemo(() => allTags.filter(tag => !existingTags.includes(tag)), [existingTags]);

  const onTagsChange = useCallback((changedContactObj: SocialContact) => {
    // Force state update after commit
    const updatedTags = changedContactObj.tag?.toArray().filter(tag => tag["@id"]).map(tag => ({
      "@id": tag["@id"],
      source: tag.source || "user",
      //@ts-expect-error ldo is messing the structure
      valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
    } as Tag)) ?? [];
    setTags(updatedTags);
  }, []);

  const handleTagAdd = useCallback((tag: string) => {
    if (!contact) return;

    contact.tag ??= new BasicLdSet<Tag>();
    const newTag = {
      source: "user",
      valueIRI: {"@id": tag}
    } as Tag;

    if (!isNextgraph) {
      newTag["@id"] = Math.random().toExponential(32);
    }

    if (isNextgraph) {
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        const changedContactObj = changeData(contact, resource);
        changedContactObj.tag?.add(newTag);

        commitData(changedContactObj).then(() => {
          onTagsChange(changedContactObj);
        }).catch(console.error);
      }
    } else {
      contact.tag.add(newTag);
      // Force immediate state update
      const updatedTags = contact.tag.toArray().filter(tag => tag["@id"]).map(tag => ({
        "@id": tag["@id"],
        source: "user",
        //@ts-expect-error ldo is messing the structure
        valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
      } as Tag));
      setTags(updatedTags);
    }
  }, [changeData, commitData, contact, isNextgraph, onTagsChange, resource]);

  const handleTagRemove = useCallback((tagId: string) => {
    if (contact?.tag) {
      //@ts-expect-error ldo is messing the structure
      const tagToRemove = Array.from(contact.tag).find(tag => tag["@id"] && tag.valueIRI.toArray()[0]["@id"] === tagId);
      if (tagToRemove) {
        if (isNextgraph) {
          // @ts-expect-error this is expected
          if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
            const changedContactObj = changeData(contact, resource);
            changedContactObj.tag?.delete(tagToRemove);

            commitData(changedContactObj).then(() => {
              onTagsChange(changedContactObj);
            }).catch(console.error);
          }
        } else {
          contact.tag.delete(tagToRemove);
          // Force immediate state update
          const updatedTags = contact.tag.toArray().filter(tag => tag["@id"]).map(tag => ({
            "@id": tag["@id"],
            source: "user",
            //@ts-expect-error ldo is messing the structure
            valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
          } as Tag));
          setTags(updatedTags);
        }
      }
    }
  }, [changeData, commitData, contact, isNextgraph, onTagsChange, resource]);

  return <Tags
    handleTagAdd={handleTagAdd}
    handleTagRemove={handleTagRemove}
    existingTags={existingTags}
    availableTags={availableTags}
  />;
}