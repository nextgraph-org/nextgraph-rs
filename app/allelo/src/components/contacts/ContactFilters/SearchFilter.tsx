import {TextField, InputAdornment, SxProps, Theme} from '@mui/material';
import {UilSearch} from '@iconscout/react-unicons';
import {useState, useCallback, useRef, useEffect} from 'react';

interface SearchFilterProps {
  value: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sx?: SxProps<Theme>;
}

export const SearchFilter = ({
                               value,
                               onSearchChange,
                               placeholder = "Search contacts...",
                               debounceMs = 300,
                               autoFocus = false,
                               onBlur,
                               onKeyDown,
                               sx = {mb: 2}
                             }: SearchFilterProps) => {
  const [searchValue, setSearchValue] = useState(value || '');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearchChange = useCallback((newValue: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      onSearchChange(newValue);
    }, debounceMs);
  }, [onSearchChange, debounceMs]);

  const handleSearchChange = (newValue: string) => {
    setSearchValue(newValue);
    debouncedSearchChange(newValue);
  };

  useEffect(() => {
    setSearchValue(value || '');
  }, [value]);

  return (
    <TextField
      fullWidth
      placeholder={placeholder}
      value={searchValue}
      onChange={(e) => handleSearchChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      size={"small"}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <UilSearch size="20"/>
            </InputAdornment>
          ),
        }
      }}
      sx={sx}
    />
  );
};