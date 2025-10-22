import React, {forwardRef} from "react";
import TextField, {TextFieldProps} from "@mui/material/TextField";
import {useFieldValidation} from "@/hooks/useFieldValidation";

export interface FormPhoneFieldProps extends Omit<TextFieldProps, "type"> {
  validateOn?: "change" | "blur";
  /** How to handle disallowed chars. Default "clean". */
  restrictMode?: "block" | "clean";
  /** Helper text when invalid. */
  invalidHelperText?: string;
  onChange?: (e: ChangeEventWithValid) => void;
}

type ChangeEventWithValid = React.ChangeEvent<HTMLInputElement> & { isValid: boolean };

export const FormPhoneField = forwardRef<HTMLDivElement, FormPhoneFieldProps>(
  (
    {
      validateOn = "change",
      restrictMode = "clean",
      invalidHelperText = "Invalid phone format, use E.164 format, e.g. +15551234567",
      value,
      onChange,
      onBlur,
      inputProps,
      error,
      helperText,
      ...rest
    },
    ref
  ) => {
    const phoneValidation = useFieldValidation(String(value ?? ""), "phone", {
      validateOn,
    });

    const sanitize = (raw: string) => raw.replace(/[^0-9+]/g, "");

    const emitChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      nextValue: string
    ) => {
      if (!onChange) return;
      phoneValidation.setFieldValue(nextValue);
      phoneValidation.triggerField().then(() => {
        const synthetic = {
          ...e,
          target: {...e.target, value: nextValue},
          currentTarget: {...e.currentTarget, value: nextValue},
          isValid: !phoneValidation.errors.field
        } as ChangeEventWithValid;
        onChange(synthetic);
      })
    };

    const handleChange = (
      e: ChangeEventWithValid
    ) => {
      const raw = e.target.value ?? "";
      if (restrictMode === "clean") {
        const cleaned = sanitize(raw);
        emitChange(e, cleaned);
      } else {
        emitChange(e, raw);
      }
    };

    return (
      <TextField
        ref={ref}
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        slotProps={{
          htmlInput: {
            ...inputProps,
          }
        }}
        error={phoneValidation.error || Boolean(error)}
        helperText={phoneValidation.error ? invalidHelperText : helperText}
        {...rest}
      />
    );
  }
);

FormPhoneField.displayName = "FormPhoneField";
