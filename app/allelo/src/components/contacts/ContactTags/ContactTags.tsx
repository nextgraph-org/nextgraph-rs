import {SocialContact, Tag} from "@/.ldo/contact.typings.ts";
import {Add, Close} from "@mui/icons-material";
import {Box, Chip, Autocomplete, TextField, Popper} from "@mui/material";
import {useCallback, useEffect, useMemo, useState} from "react";
import {dataset, useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {camelCaseToWords} from "@/utils/stringHelpers.ts";
import {getContactDictValues} from "@/utils/socialContact/dictMapper.ts";

const availableTags = getContactDictValues("tag").sort();

export interface ContactTagsProps {
  contact: SocialContact;
}

export const ContactTags = ({contact}: ContactTagsProps) => {
  const [tags, setTags] = useState<Tag[]>();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const {commitData, changeData} = useLdo();

  const initTags = useCallback(() => {
    const contactTags = contact.tag?.toArray().filter(tag => tag["@id"]).map(tag => {
      return {
        "@id": tag["@id"],
        source: "user",
        //@ts-expect-error ldo is messing the structure
        valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
      } as Tag;
    });
    setTags(contactTags);
  }, [contact]);

  useEffect(initTags, [initTags]);

  const isNextgraph = useMemo(() => isNextGraphEnabled(), []);

  const existingTagIds = tags?.map(tag => tag.valueIRI["@id"] as string) || [];
  const availableOptions = availableTags.filter(tag => !existingTagIds.includes(tag));

  const handleTagAdd = (tagLabel: string) => {
    const tagId = availableOptions.find(tagOption => camelCaseToWords(tagOption) === tagLabel);
    if (!tagId) return;

    contact.tag ??= new BasicLdSet<Tag>();
    const newTag = {
      source: "user",
      valueIRI: {"@id": tagId}
    } as Tag;

    if (!isNextgraph) {
      newTag["@id"] = Math.random().toExponential(32);
    }

    if (isNextgraph) {
      const resource = dataset.getResource(contact["@id"]!);
      if (!resource.isError && resource.type !== "InvalidIdentifierResouce") {
        const changedContactObj = changeData(contact, resource);
        changedContactObj.tag?.add(newTag);

        commitData(changedContactObj).then(initTags).catch(console.error);
      }
    } else {
      contact.tag.add(newTag);
      initTags();
    }
    setInputValue("");
    setIsAddingTag(false);
  };

  const handleTagRemove = (tagId: string) => {
    if (contact.tag) {
      const tagToRemove = Array.from(contact.tag).find(tag => tag["@id"] === tagId);
      if (tagToRemove) {
        if (isNextgraph) {
          const resource = dataset.getResource(contact["@id"]!);
          if (!resource.isError && resource.type !== "InvalidIdentifierResouce") {
            const changedContactObj = changeData(contact, resource);
            changedContactObj.tag?.delete(tagToRemove);

            commitData(changedContactObj).then(initTags).catch(console.error);
          }
        } else {
          contact.tag.delete(tagToRemove);
          initTags();
        }
      }
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      mb: 2,
      justifyContent: {xs: 'center', sm: 'flex-start'}
    }}>
      {tags?.map((tag) => (
        <Chip
          key={tag["@id"]}
          label={camelCaseToWords(tag.valueIRI["@id"])}
          size="small"
          onDelete={() => handleTagRemove(tag["@id"]!)}
          deleteIcon={<Close fontSize="small"/>}
        />
      ))}

      {isAddingTag && (
        <Autocomplete
          size="small"
          freeSolo
          options={availableOptions.map(camelCaseToWords)}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          onChange={(_, value) => {
            if (value) {
              handleTagAdd(value as string);
            }
          }}
          onBlur={() => {
            if (inputValue.trim()) {
              handleTagAdd(inputValue.trim());
            } else {
              setIsAddingTag(false);
              setInputValue("");
            }
          }}
          PopperComponent={(props) => (
            <Popper {...props} style={{zIndex: 1300}}/>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Type tag name..."
              variant="outlined"
              size="small"
              autoFocus
              sx={{
                minWidth: 150,
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem',
                  height: '25px',
                  '& fieldset': {
                    borderWidth: '1px',
                    borderColor: 'rgba(0, 0, 0, 0.23)'
                  },
                  '&:hover fieldset': {
                    borderWidth: '1px',
                    borderColor: 'rgba(0, 0, 0, 0.87)'
                  },
                  '&.Mui-focused fieldset': {
                    borderWidth: '1px'
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsAddingTag(false);
                  setInputValue("");
                }
              }}
            />
          )}
          sx={{display: 'inline-block'}}
        />
      )}
      <Chip
        variant="outlined"
        icon={<Add fontSize="small"/>}
        label="Add tag"
        size="small"
        clickable
        disabled={isAddingTag}
        onClick={() => setIsAddingTag(true)}
        sx={{
          borderStyle: 'dashed',
          color: 'text.secondary',
          borderColor: 'text.secondary',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          }
        }}
      />
    </Box>
  );
}