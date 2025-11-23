import {SocialContact, Tag} from "@/.ldo/contact.typings.ts";
import {UilPlus, UilTimes} from "@iconscout/react-unicons";
import {Box, Chip, Autocomplete, TextField, Popper, useTheme, useMediaQuery} from "@mui/material";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags.ts";
import {BasicLdSet} from "@/lib/ldo/BasicLdSet.ts";
import {camelCaseToWords} from "@/utils/stringHelpers.ts";
import {getContactDictValues} from "@/utils/socialContact/dictMapper.ts";
import {NextGraphResource} from "@ldo/connected-nextgraph";

const availableTags = getContactDictValues("tag").sort();

export interface ContactTagsProps {
  contact?: SocialContact;
  resource?: NextGraphResource;
}

export const ContactTags = ({contact, resource}: ContactTagsProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tags, setTags] = useState<Tag[]>();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
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

  const existingTagIds = tags?.map(tag => tag.valueIRI["@id"] as string) || [];
  const availableOptions = availableTags.filter(tag => !existingTagIds.includes(tag));

  const handleTagAdd = (tagLabel: string) => {
    if (!contact) return;
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
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        const changedContactObj = changeData(contact, resource);
        changedContactObj.tag?.add(newTag);

        commitData(changedContactObj).then(() => {
          // Force state update after commit
          const updatedTags = changedContactObj.tag?.toArray().filter(tag => tag["@id"]).map(tag => ({
            "@id": tag["@id"],
            source: tag.source || "user",
            //@ts-expect-error ldo is messing the structure
            valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
          } as Tag)) ?? [];
          setTags(updatedTags);
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
    setInputValue("");
    setIsAddingTag(false);
    setAutocompleteOpen(false);
  };

  const handleTagRemove = (tagId: string) => {
    if (contact?.tag) {
      const tagToRemove = Array.from(contact.tag).find(tag => tag["@id"] === tagId);
      if (tagToRemove) {
        if (isNextgraph) {
          // @ts-expect-error this is expected
          if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
            const changedContactObj = changeData(contact, resource);
            changedContactObj.tag?.delete(tagToRemove);

            commitData(changedContactObj).then(() => {
              // Force state update after commit
              const updatedTags = changedContactObj.tag?.toArray().filter(tag => tag["@id"]).map(tag => ({
                "@id": tag["@id"],
                source: tag.source || "user",
                //@ts-expect-error ldo is messing the structure
                valueIRI: tag.valueIRI.toArray ? tag.valueIRI.toArray()[0] : tag.valueIRI
              } as Tag)) ?? [];
              setTags(updatedTags);
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
  };

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      mb: 2,
      justifyContent: 'flex-start'
    }}>
      {tags?.map((tag) => (
        <Chip
          key={tag["@id"]}
          label={camelCaseToWords(tag.valueIRI["@id"])}
          size="small"
          onDelete={() => handleTagRemove(tag["@id"]!)}
          deleteIcon={<UilTimes size="20"/>}
          sx={{
            height: { xs: 36, md: 32 },
            fontSize: { xs: '0.9375rem', md: '0.8125rem' }
          }}
        />
      ))}

      {isAddingTag && (
        <Autocomplete
          size="small"
          freeSolo
          open={autocompleteOpen}
          onOpen={() => setAutocompleteOpen(true)}
          onClose={() => setAutocompleteOpen(false)}
          options={availableOptions.map(camelCaseToWords)}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => {
            setInputValue(newInputValue);
            setAutocompleteOpen(newInputValue.length > 0);
          }}
          onChange={(_, value) => {
            if (value) {
              handleTagAdd(value as string);
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
                minWidth: { xs: 180, md: 150 },
                '& .MuiOutlinedInput-root': {
                  fontSize: { xs: '0.9375rem', md: '0.875rem' },
                  height: { xs: '36px', md: '25px' },
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
                if (e.key === 'Enter' && inputValue.trim()) {
                  e.preventDefault();
                  handleTagAdd(inputValue.trim());
                } else if (e.key === 'Escape') {
                  setIsAddingTag(false);
                  setInputValue("");
                  setAutocompleteOpen(false);
                }
              }}
              onBlur={() => {
                // Small delay to allow click events to fire first
                setTimeout(() => {
                  if (inputValue.trim()) {
                    handleTagAdd(inputValue.trim());
                  } else {
                    setIsAddingTag(false);
                    setInputValue("");
                    setAutocompleteOpen(false);
                  }
                }, 200);
              }}
            />
          )}
          sx={{display: 'inline-block'}}
        />
      )}
      <Chip
        variant="outlined"
        icon={<UilPlus size={isMobile ? "24" : "20"}/>}
        label="Add tag"
        size="small"
        clickable
        disabled={isAddingTag}
        onClick={() => setIsAddingTag(true)}
        sx={{
          height: { xs: 36, md: 32 },
          fontSize: { xs: '0.9375rem', md: '0.8125rem' },
          borderStyle: 'dashed',
          color: 'text.secondary',
          borderColor: 'text.secondary',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
          '& .MuiChip-icon': {
            fontSize: { xs: '1.25rem', md: '1rem' }
          }
        }}
      />
    </Box>
  );
}