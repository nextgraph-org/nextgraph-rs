import {UilPlus, UilTimes} from "@iconscout/react-unicons";
import {Box, Chip, Autocomplete, TextField, Popper, useTheme, useMediaQuery} from "@mui/material";
import {camelCaseToWords, wordsToCamelCase} from "@/utils/stringHelpers.ts";
import {useCallback, useState} from "react";

export interface TagsProps {
  existingTags: string[];
  availableTags?: string[];
  disabled?: boolean;
  handleTagAdd?: (tag: string) => void;
  handleTagRemove?: (tag: string) => void;
  useCamelCase?: boolean;
}

export const Tags = (
  {existingTags, availableTags = [], useCamelCase = true,disabled = false, handleTagAdd, handleTagRemove}: TagsProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  const availableOptions = availableTags.filter(tag => !existingTags.includes(tag));

  const closeTagEditor = useCallback(() => {
    setInputValue("");
    setIsAddingTag(false);
    setAutocompleteOpen(false);
  }, []);

  const addTag = useCallback((value: string) => {
    const tag = value.trim();
    const tagId = useCamelCase ? wordsToCamelCase(value) : tag;
    if (handleTagAdd && tag && !existingTags.includes(tagId) && (!availableOptions.length || availableOptions.includes(tagId))) {
      handleTagAdd(tagId);
      closeTagEditor();
    }
  }, [availableOptions, closeTagEditor, existingTags, handleTagAdd, useCamelCase]);

  handleTagRemove ??= () => {};

  return (
    <Box sx={{
      display: 'flex',
      gap: 1,
      flexWrap: 'wrap',
      mb: 2,
      justifyContent: 'flex-start'
    }}>
      {existingTags?.map((tag) => (
        <Chip
          key={tag}
          label={useCamelCase ? camelCaseToWords(tag) : tag}
          size="small"
          onDelete={!disabled ? () => handleTagRemove!(tag) : undefined}
          deleteIcon={<UilTimes size="20"/>}
          sx={{
            height: {xs: 36, md: 32},
            fontSize: {xs: '0.9375rem', md: '0.8125rem'}
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
          options={useCamelCase ? availableOptions.map(camelCaseToWords) : availableOptions}
          inputValue={inputValue}
          onInputChange={(_, newInputValue) => {
            setInputValue(newInputValue);
            setAutocompleteOpen(newInputValue.length > 0);
          }}
          onChange={(_, value) => {
            addTag(value ?? "");
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
                minWidth: {xs: 180, md: 150},
                '& .MuiOutlinedInput-root': {
                  fontSize: {xs: '0.9375rem', md: '0.875rem'},
                  height: {xs: '36px', md: '25px'},
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
                  closeTagEditor();
                }
              }}
              onBlur={() => {
                // Small delay to allow click events to fire first
                setTimeout(() => {
                  addTag(inputValue);
                }, 200);
              }}
            />
          )}
          sx={{display: 'inline-block'}}
        />
      )}
      {!disabled && <Chip
        variant="outlined"
        icon={<UilPlus size={isMobile ? "24" : "20"}/>}
        label="Add tag"
        size="small"
        clickable
        disabled={isAddingTag}
        onClick={() => setIsAddingTag(true)}
        sx={{
          height: {xs: 36, md: 32},
          fontSize: {xs: '0.9375rem', md: '0.8125rem'},
          borderStyle: 'dashed',
          color: 'text.secondary',
          borderColor: 'text.secondary',
          '&:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
          },
          '& .MuiChip-icon': {
            fontSize: {xs: '1.25rem', md: '1rem'}
          }
        }}
      />}
    </Box>
  );
}