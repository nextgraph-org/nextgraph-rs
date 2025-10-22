import { render, screen, fireEvent } from '@testing-library/react';
import { FormField } from './FormField';

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

describe('FormField', () => {
  it('renders with label correctly', () => {
    render(<FormField label="Test Label" />);
    
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<FormField label="Test" ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<FormField label="Test" onChange={handleChange} />);
    
    const input = screen.getByLabelText('Test');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading', () => {
    render(<FormField label="Test" loading />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not show loading spinner when not loading', () => {
    render(<FormField label="Test" loading={false} />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows error state when error prop is true', () => {
    render(<FormField label="Test" error />);
    
    const input = screen.getByLabelText('Test');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows helper text when provided', () => {
    render(<FormField label="Test" helperText="This is helper text" />);
    
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('shows error helper text', () => {
    render(<FormField label="Test" error helperText="This is an error" />);
    
    const helperText = screen.getByText('This is an error');
    expect(helperText).toBeInTheDocument();
    expect(helperText.closest('.MuiFormHelperText-root')).toHaveClass('Mui-error');
  });

  it('renders as required when required prop is true', () => {
    render(<FormField label="Required Field" required />);
    
    expect(screen.getByLabelText('Required Field *')).toBeInTheDocument();
  });

  it('applies variant correctly', () => {
    const { rerender } = render(<FormField label="Test" variant="outlined" />);
    expect(document.querySelector('.MuiOutlinedInput-root')).toBeInTheDocument();

    rerender(<FormField label="Test" variant="filled" />);
    expect(document.querySelector('.MuiFilledInput-root')).toBeInTheDocument();

    rerender(<FormField label="Test" variant="standard" />);
    expect(document.querySelector('.MuiInput-root')).toBeInTheDocument();
  });

  it('applies size correctly', () => {
    const { rerender } = render(<FormField label="Test" size="small" />);
    expect(document.querySelector('.MuiInputBase-sizeSmall')).toBeInTheDocument();

    rerender(<FormField label="Test" size="medium" />);
    // Medium is the default size, so it may not have a specific class
    const input = screen.getByLabelText('Test');
    expect(input).toBeInTheDocument();
  });

  it('supports controlled value', () => {
    const { rerender } = render(<FormField label="Test" value="initial" />);
    
    const input = screen.getByDisplayValue('initial');
    expect(input).toHaveValue('initial');

    rerender(<FormField label="Test" value="updated" />);
    expect(input).toHaveValue('updated');
  });

  it('supports multiline input', () => {
    render(<FormField label="Test" multiline rows={4} />);
    
    const textarea = screen.getByLabelText('Test');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('preserves existing InputProps endAdornment when not loading', () => {
    const customAdornment = <span>Custom</span>;
    render(
      <FormField 
        label="Test" 
        InputProps={{ endAdornment: customAdornment }}
        loading={false}
      />
    );
    
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('shows loading spinner instead of custom endAdornment when loading', () => {
    const customAdornment = <span data-testid="custom-adornment">Custom</span>;
    const { rerender } = render(
      <FormField 
        label="Test" 
        InputProps={{ endAdornment: customAdornment }}
        loading={false}
      />
    );
    
    // First check that custom adornment is shown when not loading
    expect(screen.getByTestId('custom-adornment')).toBeInTheDocument();
    
    // Then rerender with loading=true
    rerender(
      <FormField 
        label="Test" 
        InputProps={{ endAdornment: customAdornment }}
        loading
      />
    );
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-adornment')).not.toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<FormField label="Test" disabled />);
    
    const input = screen.getByLabelText('Test');
    expect(input).toBeDisabled();
  });

  it('supports placeholder text', () => {
    render(<FormField label="Test" placeholder="Enter text here" />);
    
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });
});