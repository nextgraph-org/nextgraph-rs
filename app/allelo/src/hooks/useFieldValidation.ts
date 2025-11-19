import {useForm} from "react-hook-form";
import {useCallback, useEffect} from "react";
import {isValidPhoneNumber} from "libphonenumber-js";

export type ValidationType = "email" | "phone" | "text" | "url" | "linkedin";

export interface UseFieldValidationOptions {
  validateOn?: "change" | "blur";
  required?: boolean;
}

export interface UseFieldValidationResult {
  triggerField: () => Promise<boolean>;
  setFieldValue: (value: string) => void;
  errors: any;
  error: boolean;
  errorMessage?: string;
}

const getValidationRules = (type: ValidationType, options: UseFieldValidationOptions = {}) => {
  const rules: any = {};

  if (options.required) {
    rules.required = "This field is required";
  }

  switch (type) {
    case 'phone':
      rules.validate = (el: any) => {
        // Allow empty values if not required
        if (!el || el.trim() === '') {
          return options.required ? "This field is required" : true;
        }
        return !isValidPhoneNumber(el) ? "Invalid phone format, use E.164 format, e.g. +15551234567" : true;
      }
      break;
    case 'email':
      rules.validate = (el: any) => {
        // Allow empty values if not required
        if (!el || el.trim() === '') {
          return options.required ? "This field is required" : true;
        }
        return /^\S+@\S+\.\S+$/.test(el) ? true : 'Invalid email format';
      };
      break;
    case 'url':
      rules.validate = (el: any) => {
        // Allow empty values if not required
        if (!el || el.trim() === '') {
          return options.required ? "This field is required" : true;
        }
        return /^https?:\/\/.+\..+/.test(el) ? true : 'Invalid URL format';
      };
      break;
    case 'linkedin':
      rules.minLength = 6;
      break;
    default:
      break;
  }

  return rules;
};

export const useFieldValidation = (
  initialValue: string,
  type: ValidationType,
  options: UseFieldValidationOptions = {}
): UseFieldValidationResult => {
  const {validateOn = "blur"} = options;

  const {register, trigger, formState: {errors}, setValue} = useForm({
    mode: validateOn === "blur" ? "onBlur" : "onChange",
    defaultValues: {field: initialValue}
  });

  const validationRules = getValidationRules(type, options);

  useEffect(() => {
    register('field', validationRules);
  }, [register, validationRules]);

  useEffect(() => {
    setValue('field', initialValue);
  }, [initialValue, setValue]);

  const triggerField = useCallback(() => trigger('field'), [trigger]);
  const setFieldValue = useCallback((value: string) => setValue('field', value), [setValue]);

  return {
    triggerField,
    setFieldValue,
    errors,
    error: !!errors.field,
    errorMessage: errors.field?.message
  };
};