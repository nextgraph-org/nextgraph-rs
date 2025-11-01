import {Box, Button, Chip, Typography} from '@mui/material';
import {UilPlus as Add, UilStar as Star} from '@iconscout/react-unicons';
import {MultiPropertyItem} from "@/components/contacts/MultiPropertyWithVisibility/MultiPropertyItem.tsx";
import {ValidationType} from "@/hooks/useFieldValidation";
import {formatPhone} from "@/utils/phoneHelper";
import {useState} from "react";
import {getIconForType} from "@/utils/typeIconMapper.ts";

interface ChipsVariantProps {
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
  onAddNewItem: () => void;
  onNewItemValueChange: (value: string) => void;
  setIsAddingNew: (adding: boolean) => void;
  setNewItemValue: (value: string) => void;
  validateType?: ValidationType;
  variant?: "default" | "url";
}

export const ChipsVariant = ({
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
                               validateType = "text",
                               variant = "default"
                             }: ChipsVariantProps) => {
  const [isValid, setIsValid] = useState(true);

  const renderEditingItem = (item: any, index: number) => {
    const itemId = item['@id'] || `${propertyKey}_${index}`;
    const currentValue = editingValues[itemId] !== undefined ? editingValues[itemId] : (item[subKey] || '');

    return <MultiPropertyItem
      key={itemId}
      itemId={itemId}
      value={currentValue}
      source={item.source}
      onChange={(e) => onInputChange(itemId, e.target.value)}
      onBlur={() => onBlur(itemId)}
      placeholder={placeholder ?? ""}
      validateType={validateType}
    />
  };

  const renderDisplayItem = (item: any, index: number) => {
    const label = validateType === "phone" ? formatPhone(item[subKey]) :
      item[subKey]

    return (
      <Box key={item['@id'] || index} sx={{display: 'flex', alignItems: 'center', gap: 2}}>
        {variant === "url" ? <Typography
            variant="body2"
            component="a"
            href={label}
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
            {label}
          </Typography> :
          <Chip
          label={getIconForType(item?.type2) + label}
            size="small"
          />
        }
        {item.preferred && <Star size="16"/>}
      </Box>
    );
  };

  const renderNewItemForm = () => {
    return <>
      {isAddingNew && <MultiPropertyItem
          itemId={visibleItems.length.toString()}
          value={newItemValue}
          source={"user"}
          onChange={(e) => onNewItemValueChange(e.target.value)}
          onBlur={() => {
            if (newItemValue.trim()) {
              onAddNewItem();
            } else {
              setIsAddingNew(false);
              setNewItemValue('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onAddNewItem();
            } else if (e.key === 'Escape') {
              setIsAddingNew(false);
              setNewItemValue('');
            }
          }}
          autoFocus={true}
          placeholder={placeholder || `Add new ${label?.toLowerCase() || 'item'}`}
          validateType={validateType}
          validateParent={setIsValid}
      />}
      <Button
        disabled={isAddingNew && !isValid}
        startIcon={<Add size="20"/>}
        onClick={() => setIsAddingNew(true)}
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
          {visibleItems.map(renderEditingItem)}
          {renderNewItemForm()}
        </>
      ) : (
        visibleItems.map(renderDisplayItem)
      )}
    </>
  );
};