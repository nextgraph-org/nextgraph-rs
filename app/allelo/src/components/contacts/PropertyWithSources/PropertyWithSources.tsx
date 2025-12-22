import {useState, useCallback, useEffect, useMemo} from 'react';
import {
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  TextField,
} from '@mui/material';
import {
  UilEllipsisV as MoreVert,
} from '@iconscout/react-unicons';
import {
  ContactKeysWithSelected,
  ContactLdSetProperties,
  setUpdatedTime,
  updatePropertyFlag,
  resolveFrom
} from '@/utils/socialContact/contactUtilsOrm';
import {getSourceIcon, getSourceLabel} from "@/components/contacts/sourcesHelper";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {useFieldValidation, ValidationType} from "@/hooks/useFieldValidation";
import {renderTemplate} from "@/utils/templateRenderer";
import {useUpdatePermission} from "@/hooks/rCards/useUpdatePermission.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

type ResolvableKey = ContactKeysWithSelected;

// Extract keys of the Set element type for a given property key
type SubKeyOf<K extends ResolvableKey> = K extends keyof ContactLdSetProperties
  ? NonNullable<ContactLdSetProperties[K]> extends Set<infer U>
    ? keyof U & string
    : never
  : never;

interface PropertyWithSourcesProps<K extends ResolvableKey> {
  label?: string;
  icon?: React.ReactNode;
  contact: SocialContact | undefined;
  propertyKey: K;
  subKey?: SubKeyOf<K>;
  // Display customization
  variant?: 'default' | 'header' | 'inline';
  textVariant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
  hideLabel?: boolean;
  hideIcon?: boolean;
  // Edit mode
  isEditing?: boolean;
  placeholder?: string;
  validateType?: ValidationType;
  required?: boolean;
  validateParent?: (valid: boolean) => void;
  template?: string;
  templateProperty?: ResolvableKey;
  isMultiline?: boolean;
  currentItem?: Record<string, string>;
  hideSources?: boolean;
  isMultipleField?: boolean;
}

export const PropertyWithSources = <K extends ResolvableKey>({
                                                               label,
                                                               icon,
                                                               contact,
                                                               propertyKey,
                                                               subKey = "value",
                                                               variant = 'default',
                                                               textVariant = 'body1',
                                                               hideLabel = false,
                                                               hideIcon = false,
                                                               isEditing = false,
                                                               placeholder,
                                                               validateType = "text",
                                                               required,
                                                               validateParent,
                                                               template,
                                                               templateProperty,
                                                               isMultiline,
                                                               currentItem,
                                                               hideSources,
                                                               isMultipleField,
                                                             }: PropertyWithSourcesProps<K>) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isNextgraph = useMemo(() => isNextGraphEnabled(), []);
  //TODO: const {updatePermissionsNode} = useUpdatePermission(contact);
  const updatePermissionsNode = (el: string) => {};

  const [currentValue, setCurrentValue] = useState<string>();
  const [localValue, setLocalValue] = useState<string>("");
  const [currentItemId, setCurrentItemId] = useState<string>();
  const [displayValue, setDisplayValue] = useState<string>("");

  const handleChange = useCallback(() => {
    const currentItemRef = currentItem ?? ((contact && resolveFrom(contact, propertyKey)) ?? {});
    setCurrentItemId(currentItemRef["@id"]);
    const value = currentItemRef[subKey] ?? "";
    setCurrentValue(value);
    setLocalValue(value);

    if (!value && template) {
      const templateData = templateProperty && contact
        ? resolveFrom(contact, templateProperty)
        : currentItemRef;
      const rendered = renderTemplate(template, templateData);
      setDisplayValue(rendered);
    } else {
      setDisplayValue(value);
    }
  }, [contact, propertyKey, subKey, template, currentItem, templateProperty]);

  useEffect(() => {
    handleChange();
  }, [handleChange]);

  const fieldValidation = useFieldValidation(localValue, validateType, {validateOn: "change", required: required});

  const persistFieldChange = useCallback(() => {
    if (!contact || currentValue === localValue) return;
    setCurrentValue(localValue);

    const editPropertyWithUserSource = (contactObj: SocialContact, addId?: boolean) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      let existingUserEntry = null;
      if (currentItem) {
        if (currentItem.source === "user" && currentItem["@id"]) {
          existingUserEntry = currentItem;
          for (const item of fieldSet) {
            if (item["@id"] === currentItem["@id"]) {
              existingUserEntry = item;
              break;
            }
          }
        }
      } else {
        for (const item of fieldSet) {
          if (item.source === "user" && item["@id"]) {
            existingUserEntry = item;
            break;
          }
        }
      }

      if (existingUserEntry) {
        existingUserEntry[subKey] = localValue;
        if (!isMultipleField) {
          for (const item of fieldSet) {
            item.selected = item.source === "user";
          }
        }
      } else {
        if (!isMultipleField) {
          for (const item of fieldSet) {
            item.selected = false;
          }
        }

        const newEntry = {
          "@graph": "",
          "@id": "",
          [subKey]: localValue,
          source: "user",
          selected: isMultipleField ? undefined : true
        };
        if (addId) {
          newEntry["@id"] = Math.random().toExponential(32);
        }

        fieldSet.add(newEntry);
      }

      setUpdatedTime(contactObj);

      return contactObj;
    }

    if (isNextgraph && !contact.isDraft) {
      editPropertyWithUserSource(contact);
      updatePermissionsNode(propertyKey);
    } else {
      editPropertyWithUserSource(contact, true);
      handleChange();
    }
  }, [contact, currentValue, localValue, isNextgraph, propertyKey, currentItem, subKey, isMultipleField, updatePermissionsNode, handleChange]);

  // Handle page navigation/unload to persist any unsaved changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEditing && localValue !== currentValue && contact) {
        persistFieldChange();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [contact, currentValue, isEditing, localValue, persistFieldChange]);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSourceSelect = useCallback((item: any) => {
    if (!contact) {
      return;
    }

    if (isNextgraph) {
      if (!isMultipleField) {
        updatePropertyFlag(contact, propertyKey, item["@id"], "selected");
      }
      updatePermissionsNode(propertyKey, item["@id"]);
    } else {
      if (!isMultipleField) {
        updatePropertyFlag(contact, propertyKey, item["@id"], "selected");
      }
    }

    handleClose();
    handleChange();
  }, [contact, handleChange, isMultipleField, isNextgraph, propertyKey, updatePermissionsNode]);

  const [isValid, setIsValid] = useState(true);

  const validate = useCallback((valid: boolean) => {
    if (validateParent) validateParent(valid);
    setIsValid(valid);
  }, [validateParent]);

  const triggerValidation = useCallback((value: string) => {
    fieldValidation.setFieldValue(value);
    fieldValidation.triggerField().then((valid) => validate(valid));
  }, [fieldValidation, validate]);


  const handleInputChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    triggerValidation(newValue);
  }, [triggerValidation]);

  const handleBlur = useCallback(async () => {
    if (isValid) {
      persistFieldChange();
    }
  }, [persistFieldChange, isValid]);

  if (!contact) {
    return null;
  }

  // Get all available sources for the menu
  const allSources = [...contact[propertyKey] ?? []].filter(el => el["@id"]) ?? [];

  const getSourceSelectors = () => {
    //TODO: size is unreliable, use toArray().length
    const showSourceSelector = allSources.length > 1 && !hideSources;
    if (showSourceSelector) {
      return (
        <>
          <IconButton
            size="small"
            onClick={handleClick}
            sx={{ml: {md: 1, xs: 0}}}
          >
            <MoreVert size="16" style={{color: "rgba(0,0,0,0.19)"}}/>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            PaperProps={{
              sx: {minWidth: 150}
            }}
          >
            {allSources.map((item) => {
              const selected = currentItemId === item["@id"];
              return (
                <MenuItem
                  key={item["@id"]}
                  onClick={() => handleSourceSelect(item)}
                  selected={selected}
                >
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    {getSourceIcon(item.source!)}
                    <Box>
                      <Typography variant="body2">
                        {getSourceLabel(item.source!)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{textWrap: "wrap"}}>
                        {(item as any)[subKey] ?? renderTemplate(template, item)}
                      </Typography>
                    </Box>
                  </Box>
                </MenuItem>
              )
            })}
          </Menu>
        </>
      )
    }
    return <></>
  }

  if (isEditing) {
    return (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1}}>
        <TextField
          fullWidth
          value={localValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          variant="outlined"
          label={label}
          size="small"
          placeholder={placeholder}
          error={fieldValidation.error}
          helperText={fieldValidation.error ? fieldValidation.errorMessage : ''}
          slotProps={{inputLabel: {shrink: true}}}
          required={required}
          multiline={isMultiline}
          sx={{
            '& .MuiOutlinedInput-input': {
              fontSize: '1rem',
              fontWeight: 'normal',
            }
          }}
        />
      </Box>
    );
  }

  if (allSources.length === 0 && !displayValue) return null;

  // Different layouts based on variant
  if (variant === 'header') {
    return (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
        <Typography variant={textVariant} component="h1" gutterBottom={false}>
          {displayValue}
        </Typography>
        {getSourceSelectors()}
      </Box>
    );
  }

  if (variant === 'inline') {
    return (
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
        <Typography variant={textVariant}>
          {displayValue}
        </Typography>
        {getSourceSelectors()}
      </Box>
    );
  }

  if (hideSources && !displayValue) {
    return null
  }

  // Default layout
  return (
    <Box sx={{display: 'flex', alignItems: 'flex-start', mb: 2}}>
      {!hideIcon && icon && (
        <Box sx={{mr: 2, color: 'text.secondary'}}>
          {icon}
        </Box>
      )}
      <Box sx={{flex: 1}}>
        {!hideLabel && label && (
          <Box sx={{alignItems: 'center', gap: 1}}>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Box>
        )}
        <Box sx={{display: "flex", alignItems: 'center', gap: 1}}>
          <Typography variant={textVariant}>
            {displayValue}
          </Typography>
          {getSourceSelectors()}
        </Box>
      </Box>
    </Box>
  );
};