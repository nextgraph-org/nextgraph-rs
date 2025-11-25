import {
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {UilPlus as Add} from '@iconscout/react-unicons';
import {AccountRegistry} from "@/utils/accountRegistry";
import React, {useCallback, useState} from 'react';
import type {Contact} from "@/types/contact";
import {ContactKeysWithHidden, setUpdatedTime} from "@/utils/socialContact/contactUtils.ts";
import {useLdo} from "@/lib/nextgraph";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {MultiPropertyItem} from "@/components/contacts/MultiPropertyWithVisibility/MultiPropertyItem.tsx";
import {NextGraphResource} from "@ldo/connected-nextgraph";


type ResolvableKey = ContactKeysWithHidden;

interface AccountsVariantProps<K extends ResolvableKey> {
  visibleItems: any[];
  isEditing: boolean;
  editingValues: Record<string, string>;
  isAddingNew: boolean;
  newItemValue: string;
  placeholder?: string;
  label?: string;
  subKey: string;
  propertyKey: K;
  onInputChange: (itemId: string, value: string) => void;
  onBlur: (itemId: string) => void;
  onAddNewItem: (updates?: Record<any, any>) => void;
  onNewItemValueChange: (value: string) => void;
  setIsAddingNew: (adding: boolean) => void;
  setNewItemValue: (value: string) => void;
  contact?: Contact;
  resource?: NextGraphResource;
}

export const AccountsVariant = <K extends ResolvableKey>({
                                                           visibleItems,
                                                           isEditing,
                                                           editingValues,
                                                           isAddingNew,
                                                           newItemValue,
                                                           placeholder,
                                                           label,
                                                           subKey,
                                                           propertyKey,
                                                           onInputChange,
                                                           onBlur,
                                                           onAddNewItem,
                                                           onNewItemValueChange,
                                                           setIsAddingNew,
                                                           setNewItemValue,
                                                           contact,
                                                           resource
                                                         }: AccountsVariantProps<K>) => {
  const [newItemProtocol, setNewItemProtocol] = useState('linkedin');
  const availableAccountTypes = AccountRegistry.getAllAccountTypes();
  const {commitData, changeData} = useLdo();
  const isNextgraph = isNextGraphEnabled();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setUpdateTrigger] = useState(0);

  const persistProtocolChange = useCallback((itemId: string, protocol: string) => {
    if (!contact) return;

    const updateProtocolWithUserSource = (contactObj: Contact) => {
      const fieldSet = contactObj[propertyKey];
      if (!fieldSet) return;

      let targetItem = null;
      for (const item of fieldSet) {
        if (item["@id"] === itemId) {
          targetItem = item;
          break;
        }
      }

      if (targetItem) {
        if (targetItem.source === "user") {
          // @ts-expect-error TODO: narrow later
          targetItem.protocol = protocol;
        } else {
          // Create copy with user source for non-user sources
          const newEntry = {
            //@ts-expect-error whatever
            [subKey]: targetItem[subKey] || '',
            protocol: protocol,
            source: "user",
            hidden: false,
          };
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
        updateProtocolWithUserSource(changedContactObj);
        commitData(changedContactObj);
      }
    } else {
      updateProtocolWithUserSource(contact);
      setUpdateTrigger(prev => prev + 1);
    }
  }, [changeData, commitData, contact, isNextgraph, propertyKey, subKey, setUpdateTrigger, resource]);

  const renderEditingItem = (item: any, index: number) => {
    const itemId = item['@id'] || `${propertyKey}_${index}`;
    const currentValue = editingValues[itemId] !== undefined ? editingValues[itemId] : (item[subKey] || '');

    return (
      <Box key={itemId} sx={{display: 'flex', alignItems: 'start', gap: 1, width: '100%', mb: 1}}>
        <FormControl size="small" sx={{width: {xs: 110, md: 170}}}>
          <Select
            value={item.protocol || 'linkedin'}
            disabled={item.source !== "user"}
            onChange={(e) => persistProtocolChange(itemId, e.target.value)}
            variant="outlined"
          >
            {availableAccountTypes.map(accountType => (
              <MenuItem key={accountType.protocol} value={accountType.protocol}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                  {accountType.icon && React.cloneElement(accountType.icon, {fontSize: 'small'})}
                  <Typography sx={{overflow: 'hidden', textOverflow: 'ellipsis'}} variant="body2">{accountType.label}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <MultiPropertyItem
          itemId={itemId}
          value={currentValue}
          source={item.source}
          onChange={(e) => onInputChange(itemId, e.target.value)}
          onBlur={() => onBlur(itemId)}
          placeholder={placeholder ?? ""}
        />
      </Box>
    );
  };

  const renderDisplayItem = (item: any, index: number) => {
    return (
      <Box key={item['@id'] || index} sx={{display: 'flex', alignItems: 'center', mb: 2}}>
        {AccountRegistry.getIcon(item.protocol)}
        <Box>
          <Typography variant="body2" color="text.secondary">
            {AccountRegistry.getLabel(item.protocol)}
          </Typography>
          {AccountRegistry.getLink(item.protocol, item.value) ? <Typography
              variant="body1"
              component="a"
              href={AccountRegistry.getLink(item.protocol, item.value)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: '#0077b5',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              View Profile
            </Typography> :
            <Typography
              variant="body1"
            >
              {item.value}
            </Typography>}
        </Box>
      </Box>
    );
  };

  const renderNewItemForm = () => {
    const handleProtocolChange = (protocol: string) => {
      setNewItemProtocol(protocol);
    };

    return (
      <>
        {isAddingNew && <Box sx={{display: 'flex', alignItems: 'start', gap: 1, width: '100%', mb: 1}}>
          <FormControl size="small" sx={{minWidth: 140}}>
            <Select
              value={newItemProtocol}
              onChange={(e) => handleProtocolChange(e.target.value)}
              variant="outlined"
            >
              {availableAccountTypes.map(accountType => (
                <MenuItem key={accountType.protocol} value={accountType.protocol}>
                  <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                    {accountType.icon && React.cloneElement(accountType.icon, {fontSize: 'small'})}
                    <Typography variant="body2">{accountType.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
              </Select>
          </FormControl>

          <MultiPropertyItem
            itemId={visibleItems.length.toString()}
            value={newItemValue}
            source={"user"}
            onChange={(e) => onNewItemValueChange(e.target.value)}
            onBlur={() => {
              if (newItemValue.trim()) {
                onAddNewItem({protocol: newItemProtocol});
              } else {
                setIsAddingNew(false);
                setNewItemValue('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAddNewItem({protocol: newItemProtocol});
              } else if (e.key === 'Escape') {
                setIsAddingNew(false);
                setNewItemValue('');
              }
            }}
            autoFocus={true}
            placeholder={placeholder || `Add new ${label?.toLowerCase() || 'item'}`}
          />
        </Box>}
        <Button
          disabled={isAddingNew && !newItemValue.trim()}
          startIcon={<Add/>}
          onClick={() => setIsAddingNew(true)}
          variant="text"
          size="small"
          sx={{alignSelf: 'flex-end', mt: 2}}
        >
          Add {label?.toLowerCase() || 'item'}
        </Button>
      </>
    );
  };

  return (
    <>
      {isEditing ? (
        <>
          {visibleItems.map(renderEditingItem)}
          {renderNewItemForm()}
        </>
      ) : (
        visibleItems.map(renderDisplayItem)
      )}
    </>
  );
};