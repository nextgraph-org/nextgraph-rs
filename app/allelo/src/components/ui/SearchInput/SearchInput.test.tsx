import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchInput } from './SearchInput';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string): R;
    }
  }
}

describe('SearchInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with search icon', () => {
    render(<SearchInput />);
    
    expect(document.querySelector('[data-testid="SearchIcon"]')).toBeInTheDocument();
  });

  it('shows placeholder text by default', () => {
    render(<SearchInput />);
    
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<SearchInput ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('handles value changes with debouncing', async () => {
    const handleChange = jest.fn();
    render(<SearchInput onChange={handleChange} debounceMs={300} />);
    
    const input = screen.getByPlaceholderText('Search...');
    
    // Clear any initial calls
    jest.advanceTimersByTime(300);
    handleChange.mockClear();
    
    fireEvent.change(input, { target: { value: 'test search' } });
    
    // Should not call onChange immediately
    expect(handleChange).not.toHaveBeenCalled();
    
    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300);
    
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test search' })
        })
      );
    });
  });

  it('shows clear button when there is text', async () => {
    render(<SearchInput />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('does not show clear button when there is no text', () => {
    render(<SearchInput />);
    
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', async () => {
    const handleClear = jest.fn();
    render(<SearchInput onClear={handleClear} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);
    
    expect(handleClear).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('');
  });

  it('hides clear button when showClearButton is false', async () => {
    render(<SearchInput showClearButton={false} />);
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<SearchInput loading />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="SearchIcon"]')).not.toBeInTheDocument();
  });

  it('shows search icon when not loading', () => {
    render(<SearchInput loading={false} />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(document.querySelector('[data-testid="SearchIcon"]')).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    const { rerender } = render(<SearchInput value="initial" />);
    
    let input = screen.getByDisplayValue('initial');
    expect(input).toHaveValue('initial');

    rerender(<SearchInput value="updated" />);
    input = screen.getByDisplayValue('updated');
    expect(input).toHaveValue('updated');
  });

  it('supports custom placeholder', () => {
    render(<SearchInput placeholder="Find items..." />);
    
    expect(screen.getByPlaceholderText('Find items...')).toBeInTheDocument();
  });

  it('supports custom debounce timing', async () => {
    const handleChange = jest.fn();
    render(<SearchInput onChange={handleChange} debounceMs={500} />);
    
    // Clear initial call
    jest.advanceTimersByTime(500);
    handleChange.mockClear();
    
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    
    // Should not call onChange after default 300ms
    jest.advanceTimersByTime(300);
    expect(handleChange).not.toHaveBeenCalled();
    
    // Should call onChange after custom 500ms
    jest.advanceTimersByTime(200);
    
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it('handles rapid typing with debouncing', async () => {
    const handleChange = jest.fn();
    render(<SearchInput onChange={handleChange} debounceMs={300} />);
    
    // Clear initial call
    jest.advanceTimersByTime(300);
    handleChange.mockClear();
    
    const input = screen.getByPlaceholderText('Search...');
    
    // Type multiple characters rapidly
    fireEvent.change(input, { target: { value: 't' } });
    jest.advanceTimersByTime(100);
    
    fireEvent.change(input, { target: { value: 'te' } });
    jest.advanceTimersByTime(100);
    
    fireEvent.change(input, { target: { value: 'test' } });
    jest.advanceTimersByTime(100);
    
    // Should still not have called onChange
    expect(handleChange).not.toHaveBeenCalled();
    
    // Complete the debounce period
    jest.advanceTimersByTime(200);
    
    await waitFor(() => {
      // Should only be called once with the final value
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: 'test' })
        })
      );
    });
  });

  it('applies size prop correctly', () => {
    const { rerender } = render(<SearchInput size="small" />);
    expect(document.querySelector('.MuiInputBase-sizeSmall')).toBeInTheDocument();

    rerender(<SearchInput size="medium" />);
    // Medium is default, check that input exists
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('supports disabled state', () => {
    render(<SearchInput disabled />);
    
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeDisabled();
  });

  it('passes through other TextField props', () => {
    render(<SearchInput fullWidth data-testid="search-input" />);
    
    const container = screen.getByTestId('search-input');
    expect(container).toBeInTheDocument();
    expect(container.querySelector('.MuiInputBase-fullWidth')).toBeInTheDocument();
  });
});