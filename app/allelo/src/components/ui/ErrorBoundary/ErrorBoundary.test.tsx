import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

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
      toBeChecked(): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Working component</div>;
};

// Custom fallback component for testing
const CustomFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
  <div>
    <h2>Custom Error: {error.message}</h2>
    <button onClick={resetError}>Reset Custom</button>
  </div>
);

describe('ErrorBoundary', () => {
  // Suppress console errors for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders default error fallback when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom Error: Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset custom/i })).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('resets error state when resetError is called', () => {
    const TestComponent = ({ shouldThrow = false }) => (
      <ErrorBoundary key={shouldThrow ? 'error' : 'success'}>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestComponent shouldThrow />);
    
    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Click reset button
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    
    // Rerender with working component - this creates a new ErrorBoundary instance
    rerender(<TestComponent shouldThrow={false} />);
    
    // Should show normal content again
    expect(screen.getByText('Working component')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('resets error state with custom fallback', () => {
    const TestComponent = ({ shouldThrow = false }) => (
      <ErrorBoundary key={shouldThrow ? 'error' : 'success'} fallback={CustomFallback}>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestComponent shouldThrow />);
    
    // Error should be displayed
    expect(screen.getByText('Custom Error: Test error message')).toBeInTheDocument();
    
    // Click custom reset button
    fireEvent.click(screen.getByRole('button', { name: /reset custom/i }));
    
    // Rerender with working component - this creates a new ErrorBoundary instance
    rerender(<TestComponent shouldThrow={false} />);
    
    // Should show normal content again
    expect(screen.getByText('Working component')).toBeInTheDocument();
    expect(screen.queryByText('Custom Error: Test error message')).not.toBeInTheDocument();
  });

  it('handles error without message', () => {
    const ThrowEmptyError = () => {
      const error = new Error();
      error.message = '';
      throw error;
    };
    
    render(
      <ErrorBoundary>
        <ThrowEmptyError />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });

  it('maintains error state across rerenders until reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    
    // Rerender with same error component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow />
      </ErrorBoundary>
    );
    
    // Error should still be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not call onError callback when no error occurs', () => {
    const onError = jest.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <div>Normal content</div>
      </ErrorBoundary>
    );
    
    expect(onError).not.toHaveBeenCalled();
  });

  it('passes error object to custom fallback', () => {
    const testError = new Error('Specific test error');
    const ThrowSpecificError = () => {
      throw testError;
    };
    
    const TestFallback = ({ error }: { error: Error }) => (
      <div data-testid="error-details">{error.message}</div>
    );
    
    render(
      <ErrorBoundary fallback={TestFallback}>
        <ThrowSpecificError />
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('error-details')).toHaveTextContent('Specific test error');
  });

  it('handles multiple children correctly', () => {
    render(
      <ErrorBoundary>
        <div>First child</div>
        <div>Second child</div>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});