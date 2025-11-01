import { forwardRef, useState, useCallback, useEffect } from 'react';
import { TextField, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { UilSearch, UilTimes } from '@iconscout/react-unicons';
import type { SearchInputProps } from './types';

export const SearchInput = forwardRef<HTMLDivElement, SearchInputProps>(
  ({ 
    onClear, 
    loading = false, 
    showClearButton = true, 
    debounceMs = 300,
    onChange,
    value = '',
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(String(value));
    const [isControlled] = useState(value !== undefined);

    useEffect(() => {
      if (isControlled && value !== undefined) {
        setInternalValue(String(value));
      }
    }, [value, isControlled]);

    useEffect(() => {
      if (!onChange) return;

      const timer = setTimeout(() => {
        const syntheticEvent = {
          target: { value: internalValue }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }, debounceMs);

      return () => clearTimeout(timer);
    }, [internalValue, debounceMs, onChange]);

    const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(event.target.value);
    }, []);

    const handleClear = useCallback(() => {
      setInternalValue('');
      if (onClear) {
        onClear();
      }
    }, [onClear]);

    const showClear = showClearButton && String(internalValue).length > 0;

    return (
      <TextField
        ref={ref}
        variant="outlined"
        placeholder="Search..."
        value={internalValue}
        onChange={handleChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {loading ? <CircularProgress size={20} /> : <UilSearch size="20" />}
            </InputAdornment>
          ),
          endAdornment: showClear ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={handleClear}
                edge="end"
                size="small"
              >
                <UilTimes size="20" />
              </IconButton>
            </InputAdornment>
          ) : null,
          ...props.InputProps,
        }}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';