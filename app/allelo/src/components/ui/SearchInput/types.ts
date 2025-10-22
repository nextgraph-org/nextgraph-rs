import { TextFieldProps } from '@mui/material/TextField';

export interface SearchInputProps extends Omit<TextFieldProps, 'variant'> {
  onClear?: () => void;
  loading?: boolean;
  showClearButton?: boolean;
  debounceMs?: number;
}

export type SearchInputSize = 'small' | 'medium';