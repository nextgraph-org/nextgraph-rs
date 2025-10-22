import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Test</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading>Loading</Button>);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when loading', () => {
    render(<Button loading>Loading</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant prop correctly', () => {
    const { rerender } = render(<Button variant="contained">Contained</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-contained');

    rerender(<Button variant="outlined">Outlined</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-outlined');

    rerender(<Button variant="text">Text</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-text');
  });

  it('applies color prop correctly', () => {
    render(<Button color="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-colorPrimary');
  });

  it('applies size prop correctly', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeSmall');

    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeMedium');

    rerender(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeLarge');
  });

  it('applies fullWidth prop correctly', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-fullWidth');
  });

  it('shows both loading spinner and text when loading', () => {
    render(<Button loading>Loading Button</Button>);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading Button')).toBeInTheDocument();
  });

  it('does not trigger click when disabled by loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Loading</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not trigger click when explicitly disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
});