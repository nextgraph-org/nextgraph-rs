import {useState, useCallback, useEffect} from 'react';
import {
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Switch,
} from '@mui/material';
import {
  UilEllipsisV,
  UilEye,
  UilEyeSlash,
} from '@iconscout/react-unicons';

import {
  Star,
  StarBorder,
} from '@mui/icons-material';
import type {Contact} from '@/types/contact';
import {
  ContactKeysWithHidden,
  setUpdatedTime,
  updateProperty,
  updatePropertyFlag,
  getVisibleItems
} from '@/utils/socialContact/contactUtils.ts';
import {getSourceIcon, getSourceLabel} from "@/components/contacts/sourcesHelper";
import {useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {ChipsVariant, AccountsVariant} from './variants';
import {ValidationType} from "@/hooks/useFieldValidation";
import {AddressVariant} from "@/components/contacts/MultiPropertyWithVisibility/variants/AddressVariant.tsx";
import {NextGraphResource} from "@ldo/connected-nextgraph";
import {useUpdatePermission} from "@/hooks/rCards/useUpdatePermission.ts";

type ResolvableKey = ContactKeysWithHidden;

interface MultiPropertyWithVisibilityProps<K extends ResolvableKey> {
  label?: string;
  icon?: React.ReactNode;
  contact: Contact | undefined;
  propertyKey: K;
  subKey?: string;
  hideLabel?: boolean;
  hideIcon?: boolean;
  showManageButton?: boolean;
  isEditing?: boolean;
  placeholder?: string;
  variant?: "chips" | "accounts" | "url" | "addresses";
  validateType?: ValidationType;
  hasPreferred?: boolean;
  resource?: NextGraphResource;
  required?: boolean;
}

export const MultiPropertyWithVisibility = <K extends ResolvableKey>({
                                                                       label,
                                                                       icon,
                                                                       contact,
                                                                       propertyKey,
                                                                       subKey = 'value',
                                                                       hideLabel = false,
                                                                       hideIcon = false,
                                                                       showManageButton = true,
                                                                       isEditing = false,
                                                                       variant = "chips",
                                                                       placeholder,
                                                                       validateType = "text",
                                                                       hasPreferred = true,
                                                                       resource,
                                                                       required = true
                                                                     }: MultiPropertyWithVisibilityProps<K>) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setUpdateTrigger] = useState(0);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const open = Boolean(anchorEl);

  const {commitData, changeData} = useLdo();
  const {isProfile, updatePermissionsNode} = useUpdatePermission(contact);

  const isNextgraph = isNextGraphEnabled() && !contact?.isDraft;

  const [allItems, setAllItems] = useState<any[]>([]);

  const loadAllItems = useCallback(() => {
    const items = contact && contact[propertyKey]
      ? contact[propertyKey]?.toArray().filter(el => el["@id"])
      : [];
    setAllItems(items);
  }, [contact, propertyKey])

  useEffect(() => {
    loadAllItems();
  }, [loadAllItems]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleVisibilityToggle = (item: any) => {
    if (!contact) {
      return;
    }
    let changedContactObj = contact;
    if (isNextgraph) {
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        changedContactObj = changeData(contact, resource);
        updatePropertyFlag(changedContactObj, propertyKey, item["@id"], "hidden", "toggle");
        updateProperty(changedContactObj, propertyKey, item["@id"], "preferred", false);
        commitData(changedContactObj);
      }
    } else {
      updatePropertyFlag(changedContactObj, propertyKey, item["@id"], "hidden", "toggle");
      updateProperty(changedContactObj, propertyKey, item["@id"], "preferred", false);
      setUpdateTrigger(prev => prev + 1);
    }
  };

  const handlePreferredToggle = (item: any) => {
    if (!contact) {
      return;
    }
    let changedContactObj = contact;
    if (isNextgraph) {
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        changedContactObj = changeData(contact, resource);
        updatePropertyFlag(changedContactObj, propertyKey, item["@id"], "preferred");
        commitData(changedContactObj);
      }
    } else {
      updatePropertyFlag(changedContactObj, propertyKey, item["@id"], "preferred");
      setUpdateTrigger(prev => prev + 1);
    }
  };

  const persistFieldChange = useCallback((itemId: string, newValue: string) => {
    if (!contact) return;

    const editPropertyWithUserSource = (contactObj: Contact, addId?: boolean) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      let targetItem = fieldSet.toArray().find((item: any) => item["@id"] === itemId);
      for (const item of fieldSet) {
        if (item["@id"] === itemId) {
          targetItem = item;
          break;
        }
      }

      if (targetItem) {
        if (targetItem.source === "user") {
          // @ts-expect-error TODO: narrow later
          targetItem[subKey] = newValue;
        } else {
          // Create copy with user source for non-user sources
          const newEntry = {
            [subKey]: newValue,
            source: "user",
            hidden: false
          };
          if (addId) {
            newEntry["@id"] = Math.random().toExponential(32);
          }
          // @ts-expect-error TODO: we will need more field types handlers later
          fieldSet.add(newEntry);
        }
      }

      setUpdatedTime(contactObj);

      return contactObj;
    };

    if (isNextgraph) {
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        const changedContactObj = changeData(contact, resource);
        editPropertyWithUserSource(changedContactObj);
        commitData(changedContactObj);
      }
    } else {
      editPropertyWithUserSource(contact, true);
    }
  }, [changeData, commitData, contact, isNextgraph, propertyKey, subKey, resource]);

  const addNewItem = useCallback((updates?: Record<K, any>, force?: boolean) => {
    if (!contact) return;
    if (!force && !newItemValue.trim()) return;

    const addNewPropertyWithUserSource = (contactObj: Contact, addId?: boolean) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      const newEntry = {
        [subKey]: newItemValue.trim(),
        source: "user",
        hidden: false,
        ...updates
      };

      if (addId) {
        // @ts-expect-error whatever
        newEntry["@id"] = Math.random().toExponential(32);
      }
      // @ts-expect-error TODO: we will need more field types handlers later
      fieldSet.add(newEntry);

      setUpdatedTime(contactObj);

      return newEntry;
    };
    let newItem;
    if (isNextgraph) {
      // @ts-expect-error this is expected
      if (resource && !resource.isError && resource.type !== "InvalidIdentifierResource") {
        const changedContactObj = changeData(contact, resource);
        newItem = addNewPropertyWithUserSource(changedContactObj);
        commitData(changedContactObj).then(() => {
          if (isProfile) updatePermissionsNode(propertyKey);
        });
      }
    } else {
      newItem = addNewPropertyWithUserSource(contact, true);
    }

    setNewItemValue('');
    setIsAddingNew(false);
    loadAllItems();
    return newItem;
  }, [contact, newItemValue, isNextgraph, loadAllItems, propertyKey, subKey, resource, changeData, commitData, isProfile, updatePermissionsNode]);

  const handleInputChange = useCallback((itemId: string, newValue: string) => {
    setEditingValues(prev => ({...prev, [itemId]: newValue}));
  }, []);

  const handleBlur = useCallback((itemId: string) => {
    const newValue = editingValues[itemId];
    if (newValue !== undefined) {
      // Find the original item to compare values
      const originalItem = allItems.find(item => item["@id"] === itemId);
      const originalValue = originalItem ? (originalItem[subKey] || '') : '';

      // Only persist if the value actually changed
      if (newValue !== originalValue) {
        persistFieldChange(itemId, newValue);
      }

      setEditingValues(prev => {
        const updated = {...prev};
        delete updated[itemId];
        return updated;
      });
    }
  }, [editingValues, persistFieldChange, allItems, subKey]);

  useEffect(() => {
    if (isEditing && contact) {
      const initialValues: Record<string, string> = {};
      allItems.forEach(item => {
        if (item["@id"]) {
          initialValues[item["@id"]] = item[subKey] || '';
        }
      });
      setEditingValues(initialValues);
    }
  }, [isEditing, contact, allItems, subKey]);

  // Handle page navigation/unload to persist any unsaved changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isEditing && Object.keys(editingValues).length > 0) {
        Object.entries(editingValues).forEach(([itemId, value]) => {
          persistFieldChange(itemId, value);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editingValues, isEditing, persistFieldChange]);

  if (!contact) {
    return null;
  }

  const visibleItems = getVisibleItems(contact, propertyKey);

  const renderManageMenu = () => {
    if (!showManageButton || allItems.length === 0 && !isEditing) return null;

    return (
      <>
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{ml: 1}}
        >
          <UilEllipsisV size="20" color="rgba(0,0,0,0.19)"/>
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
          transformOrigin={{vertical: 'top', horizontal: 'right'}}

        >
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              Manage Items
            </Typography>
          </MenuItem>
          {allItems.filter(el => el["@id"]).map((item: any, index: number) => {
            const itemId = item['@id'] || `${propertyKey}_${index}`;
            const isHidden = item.hidden || false;

            const isPreferred = item.preferred || false;

            return (
              <MenuItem
                key={itemId}
                sx={{
                  display: 'block',
                  width: '100%',
                  padding: 0,
                  touchAction: "none"
                }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  width: '100%',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  '&:hover': {backgroundColor: 'rgba(0, 0, 0, 0.04)'}
                }}>
                  {/* Visibility toggle row */}
                  {hasPreferred && <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0}}
                                        onClick={() => handlePreferredToggle(item)}>
                    {isPreferred ? <Star fontSize="small"/> : <StarBorder fontSize="small"/>}
                  </Box>}
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0}}>

                    {item.source && getSourceIcon(item.source)}
                    <Box sx={{flex: 1, minWidth: 0}}>
                      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block'
                          }}
                          title={item[subKey] || 'No value'}
                        >
                          {item[subKey] || 'No value'}
                        </Typography>
                      </Box>
                      {item.source && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block'
                          }}
                          title={getSourceLabel(item.source)}
                        >
                          {getSourceLabel(item.source)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0
                  }}>
                    {isHidden ? <UilEyeSlash size="20"/> : <UilEye size="20"/>}
                    <Switch
                      checked={!isHidden}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleVisibilityToggle(item);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      size="small"
                    />
                  </Box>
                </Box>
              </MenuItem>
            );
          })}
        </Menu>
      </>
    );
  };

  const renderVariant = () => {
    const commonProps = {
      visibleItems,
      isEditing,
      editingValues,
      isAddingNew,
      newItemValue,
      placeholder,
      label,
      subKey,
      propertyKey,
      onInputChange: handleInputChange,
      onBlur: handleBlur,
      onAddNewItem: addNewItem,
      onNewItemValueChange: setNewItemValue,
      setIsAddingNew,
      setNewItemValue,
      contact,
      validateType,
      resource,
      required
    };

    switch (variant) {
      case "chips":
        return <ChipsVariant {...commonProps} />;
      case "url":
        return <ChipsVariant {...commonProps} variant={variant}/>;
      case "accounts":
        return <AccountsVariant {...commonProps} />;
      case "addresses":
        return <AddressVariant {...commonProps} />;
      default:
        return <ChipsVariant {...commonProps} />;
    }
  };

  return (
    <Box sx={{mb: 2}}>
      <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
        <Box sx={{display: 'flex', width: '100%', gap: 2, justifyItems: 'start'}}>
          {!hideIcon && icon && (
            <Box sx={{color: 'text.secondary'}}>
              {icon}
            </Box>
          )}
          {!hideLabel && label && (
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          )}
        </Box>
        {renderManageMenu()}
      </Box>

      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        alignItems: 'flex-start',
        ml: !hideIcon && !hideLabel ? 5 : 0
      }}>
        {renderVariant()}
      </Box>
    </Box>
  );
};