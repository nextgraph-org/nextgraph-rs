import {Box, Button, Chip, IconButton} from '@mui/material';
import {UilPlus as Add, UilAngleUp as ExpandLess, UilAngleDown as ExpandMore, UilStar as Star} from '@iconscout/react-unicons';
import {MultiPropertyItem} from "@/components/contacts/MultiPropertyWithVisibility/MultiPropertyItem.tsx";
import {ValidationType} from "@/hooks/useFieldValidation";
import {useState} from "react";
import type {Contact} from "@/types/contact.ts";
import {AddressDetails} from "./AddressDetails.tsx";
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";
import React from 'react';

interface AddressVariantProps {
  visibleItems: any[];
  isEditing: boolean;
  editingValues: Record<string, string>;
  isAddingNew: boolean;
  newItemValue: string;
  placeholder?: string;
  label?: string;
  subKey: string;
  propertyKey: string;
  onInputChange: (itemId: string, value: string) => void;
  onBlur: (itemId: string) => void;
  onAddNewItem: (updates?: any, force?: boolean) => Record<string, any> | undefined;
  onNewItemValueChange: (value: string) => void;
  setIsAddingNew: (adding: boolean) => void;
  setNewItemValue: (value: string) => void;
  validateType?: ValidationType;
  contact?: Contact;
}

export const AddressVariant = ({
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
                                 validateType = "text",
                                 contact
                               }: AddressVariantProps) => {
  const [isValid, setIsValid] = useState(true);
  const [showAddressDetails, setShowAddressDetails] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState<Record<string, string> | undefined>(undefined);

  const toggleAddressDetails = (itemId: string) => {
    setShowAddressDetails(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderEditingItem = (item: any, index: number) => {
    const itemId = item['@id'] || `${propertyKey}_${index}`;
    const currentValue = editingValues[itemId] !== undefined ? editingValues[itemId] : (item[subKey] || '');
    const isExpanded = showAddressDetails[itemId] || false;

    return <>
      <Box sx={{display: "flex", flexDirection: "row", justifyContent: "start", alignItems: "start"}}>
        <MultiPropertyItem
          itemId={itemId}
          value={currentValue}
          source={item.source}
          onChange={(e) => onInputChange(itemId, e.target.value)}
          onBlur={() => onBlur(itemId)}
          validateType={validateType}
          required={false}
          label={"Unstructured address"}
        />
        <IconButton
          sx={{padding: 0, ml: 1}}
          onClick={() => toggleAddressDetails(itemId)}
        >{isExpanded ? <ExpandLess size="16"/> : <ExpandMore size="16"/>}
        </IconButton>
      </Box>
    </>
  };

  const renderDisplayItem = (item: Record<string, string>, index: number) => {
    let chipLabel = item[subKey];
    if (!chipLabel) {
      chipLabel = renderTemplate(defaultTemplates.address, item);
    }
    const itemId = item['@id'] || `${propertyKey}_${index}`;
    const isExpanded = showAddressDetails[itemId] || false;

    return (
      <Box sx={{display: "flex", flexDirection: "row", justifyContent: "start", alignItems: "start"}}>
        <Box key={item['@id'] || index} sx={{display: 'flex', alignItems: 'center', gap: 2}}>
          {
            <Chip
              label={chipLabel}
              size="small"
            />
          }
          {item.preferred && <Star size="16"/>}
        </Box>
        <IconButton
          sx={{padding: 0, ml: 1}}
          onClick={() => toggleAddressDetails(itemId)}
        >{isExpanded ? <ExpandLess size="16"/> : <ExpandMore size="16"/>}
        </IconButton>
      </Box>
    );
  };

  const renderNewItemForm = () => {
    return <>
      {isAddingNew && newItem && <><MultiPropertyItem
        itemId={newItem["@id"]}
        value={newItemValue}
        source={"user"}
        onChange={(e) => onNewItemValueChange(e.target.value)}
        onBlur={() => onBlur(newItem["@id"])}
        autoFocus={true}
        placeholder={placeholder || `Add new ${label?.toLowerCase() || 'item'}`}
        validateType={validateType}
        validateParent={setIsValid}
        required={false}
      /><AddressDetails
        showAddressDetails={true}
        contact={contact}
        isEditing={true}
        currentItem={newItem}
      /></>}
      <Button
        disabled={isAddingNew && !isValid}
        startIcon={<Add size="20"/>}
        onClick={() => {
          setIsAddingNew(true);
          const item = onAddNewItem(undefined, true);
          setNewItem(item);
        }}
        variant="text"
        size="small"
        sx={{alignSelf: 'flex-end', mt: 2}}
      >
        Add {label?.toLowerCase() || 'item'}
      </Button>
    </>
  };

  return (
    <>
      {isEditing ? (
        <>
          {visibleItems.map((item, index) => {
            const itemId = item['@id'] || `${propertyKey}_${index}`;
            const isExpanded = showAddressDetails[itemId] || true;

            return (
              <React.Fragment key={itemId}>
                {renderEditingItem(item, index)}
                <AddressDetails
                  showAddressDetails={isExpanded}
                  contact={contact}
                  isEditing={isEditing}
                  currentItem={item}
                />
              </React.Fragment>
            );
          })}
          {renderNewItemForm()}
        </>
      ) : (
        visibleItems.map((item, index) => {
          const itemId = item['@id'] || `${propertyKey}_${index}`;
          const isExpanded = showAddressDetails[itemId] || false;

          return (
            <React.Fragment key={itemId}>
              {renderDisplayItem(item, index)}
              <AddressDetails
                showAddressDetails={isExpanded}
                contact={contact}
                isEditing={false}
                currentItem={item}
              />
            </React.Fragment>
          );
        })
      )}
    </>
  );
};