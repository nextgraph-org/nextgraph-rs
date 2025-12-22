import {useState, useCallback, useEffect, useMemo} from 'react';
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
import {
  ContactKeysWithHidden,
  setUpdatedTime,
  updatePropertyFlag,
  getVisibleItems
} from '@/utils/socialContact/contactUtilsOrm';
import {getSourceIcon, getSourceLabel} from "@/components/contacts/sourcesHelper";
import {ChipsVariant, AccountsVariant} from './variants';
import {ValidationType} from "@/hooks/useFieldValidation";
import {AddressVariant} from "@/components/contacts/MultiPropertyWithVisibility/variants/AddressVariant.tsx";
import {useUpdatePermission} from "@/hooks/rCards/useUpdatePermission.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";

type ResolvableKey = ContactKeysWithHidden;

interface MultiPropertyWithVisibilityProps<K extends ResolvableKey> {
  label?: string;
  icon?: React.ReactNode;
  contact: SocialContact | undefined;
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
                                                                       required = true
                                                                     }: MultiPropertyWithVisibilityProps<K>) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemValue, setNewItemValue] = useState('');
  const open = Boolean(anchorEl);

  //TODO: const {isProfile, updatePermissionsNode} = useUpdatePermission(contact);
  const updatePermissionsNode = (el: string) => {
  };

  const {session} = useNextGraphAuth() || {} as NextGraphAuth;
  const isProfile: boolean = useMemo<boolean>(() => nextgraphDataService.isContactProfile(session, contact),
    [session, contact]);

  const [allItems, setAllItems] = useState<any[]>([]);

  const loadAllItems = useCallback(() => {
    const items = contact && contact[propertyKey]
      ? [...contact[propertyKey]].filter(el => el["@id"])
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

  const handleVisibilityToggle = useCallback((item: any) => {
    if (!contact) {
      return;
    }
    updatePropertyFlag(contact, propertyKey, item["@id"], "hidden", "toggle");
    item.preferred = false;
  }, [contact, propertyKey]);

  const handlePreferredToggle = useCallback((item: any) => {
    if (!contact) {
      return;
    }
    updatePropertyFlag(contact, propertyKey, item["@id"], "preferred");
  }, [contact, propertyKey]);

  const persistFieldChange = useCallback((itemId: string, newValue: string) => {
    if (!contact) return;

    const editPropertyWithUserSource = (contactObj: SocialContact) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      let targetItem = [...fieldSet].find((item: any) => item["@id"] === itemId);
      for (const item of fieldSet) {
        if (item["@id"] === itemId) {
          targetItem = item;
          break;
        }
      }

      if (targetItem) {
        if (targetItem.source === "user") {
          targetItem[subKey] = newValue;
        } else {
          // Create copy with user source for non-user sources
          const newEntry = {
            "@graph": "",
            "@id": "",
            [subKey]: newValue,
            source: "user",
            hidden: false
          };
          fieldSet.add(newEntry);
        }
      }

      setUpdatedTime(contactObj);

      return contactObj;
    };

    editPropertyWithUserSource(contact);
  }, [contact, propertyKey, subKey]);

  const addNewItem = useCallback((updates?: Record<K, any>, force?: boolean) => {
    if (!contact) return;
    if (!force && !newItemValue.trim()) return;

    const addNewPropertyWithUserSource = (contactObj: SocialContact) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      const newEntry = {
        "@graph": "",
        "@id": "",
        [subKey]: newItemValue.trim(),
        source: "user",
        hidden: false,
        ...updates
      };

      fieldSet.add(newEntry);

      setUpdatedTime(contactObj);

      return newEntry;
    };
    const newItem = addNewPropertyWithUserSource(contact);
    
    if (isProfile) updatePermissionsNode(propertyKey);

    setNewItemValue('');
    setIsAddingNew(false);
    loadAllItems();
    return newItem;
  }, [contact, newItemValue, isProfile, propertyKey, loadAllItems, subKey]);

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