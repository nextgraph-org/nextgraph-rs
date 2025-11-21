import {Box, TextField, Typography} from "@mui/material";
import {getSourceIcon, getSourceLabel} from "@/components/contacts/sourcesHelper";
import {FormPhoneField} from "@/components/ui/FormPhoneField/FormPhoneField";
import {useFieldValidation, ValidationType} from "@/hooks/useFieldValidation";
import {useCallback, useEffect, useState} from "react";

interface MultiPropertyItemProps {
  itemId: string,
  value: string,
  source: string | null,
  onChange: (e: any) => void,
  onBlur: () => void,
  placeholder?: string,
  onKeyDown?: (e: any) => void,
  autoFocus?: boolean,
  validateType?: ValidationType,
  validateParent?: (isValid: boolean) => void,
  required?: boolean,
  label?: string,
}

export const MultiPropertyItem = ({
                                    itemId,
                                    value,
                                    onChange,
                                    onBlur,
                                    placeholder,
                                    source,
                                    onKeyDown,
                                    autoFocus,
                                    validateType = "text",
                                    validateParent,
                                    required = true,
                                    label
                                  }: MultiPropertyItemProps) => {
  const {
    setFieldValue,
    triggerField,
    error,
    errorMessage
  } = useFieldValidation(value, validateType, {validateOn: "blur", required: required});
  const [isValid, setIsValid] = useState(true);

  const validate = useCallback((valid: boolean) => {
    if (validateParent) validateParent(valid);
    setIsValid(valid);
  }, [validateParent]);

  const triggerValidation = useCallback((value: string) => {
    setFieldValue(value);
    triggerField().then((valid) => validate(valid));
  }, [setFieldValue, triggerField, validate]);

  const handleBlur = () => {
    if (isValid) onBlur();
  };

  useEffect(() => triggerValidation(value), [triggerValidation, value]);

  const renderTextField = () => {
    const fieldProps = {
      value,
      onChange: (e: any) => {
        onChange(e);
        triggerValidation(e.target.value);
      },
      onBlur: handleBlur,
      error: error,
      helperText: errorMessage,
      variant: "outlined" as const,
      size: "small" as const,
      placeholder,
      onKeyDown,
      autoFocus,
      sx: {
        flex: 1,
        width: {xs: '100%', md: 'auto'},
        '& .MuiOutlinedInput-input': {
          fontSize: '0.875rem',
          fontWeight: 'normal',
        }
      },
      label,
      slotProps: {inputLabel: {shrink: true}}
    };

    switch (validateType) {
      case "phone":
        return <FormPhoneField {...fieldProps} />;
      case "email":
      case "url":
      default:
        return <TextField {...fieldProps} />;
    }
  }

  return (
    <Box key={itemId} sx={{
      display: 'flex',
      flexDirection: {xs: 'column', md: 'row'},
      alignItems: {xs: 'flex-start', md: 'center'},
      gap: {xs: 0.5, md: 1},
      width: '100%'
    }}>
      {renderTextField()}
      {source && (
        <Box sx={{display: {xs: 'none', md: 'flex'}, alignItems: 'center', gap: 0.5, width: "135px"}}>
          {getSourceIcon(source)}
          <Typography variant="caption" color="text.secondary">
            {getSourceLabel(source)}
          </Typography>
        </Box>
      )}
    </Box>
  )
    ;
}