import {SocialContact, Tag} from "@/.ldo/contact.typings.ts";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {getContactDictValues} from "@/utils/socialContact/dictMapper.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {Tags} from "@/components/ui/Tags";
import {LdSet} from "@ldo/ldo";

const allTags = getContactDictValues("tag").sort();

export interface ContactTagsProps {
  contact?: SocialContact;
  resource?: NextGraphResource;
}

export const ContactTags = ({contact, resource}: ContactTagsProps) => {
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const {commitData, changeData} = useLdo();

  const initTags = useCallback((tags: LdSet<Tag> | undefined) => {
    const contactTags = tags?.toArray().filter(tag => tag["@id"]).map(tag => {
      return {
        "@id": tag["@id"],
        source: "user",
        // @ts-expect-error ldo
        valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
      } as Tag;
    }) ?? [];
    const uniqueTags = new Set(contactTags?.map(tag => tag.valueIRI["@id"] as string));
    setExistingTags([...uniqueTags]);
  }, []);

  useEffect(() => initTags(contact?.tag), [initTags, contact]);

  const isNextgraph = useMemo(() => isNextGraphEnabled(), []);

  const onTagsChange = useCallback((changedContactObj: SocialContact) => {
    initTags(changedContactObj.tag);
  }, [initTags]);

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
      initTags(contact.tag);
    }
  }, [changeData, commitData, contact, isNextgraph, onTagsChange, resource, initTags]);

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
          initTags(contact.tag);
        }
      }
    }
  }, [changeData, commitData, contact, isNextgraph, onTagsChange, resource, initTags]);

  return <Tags
    handleTagAdd={handleTagAdd}
    handleTagRemove={handleTagRemove}
    existingTags={existingTags}
    availableTags={allTags}
  />;
}