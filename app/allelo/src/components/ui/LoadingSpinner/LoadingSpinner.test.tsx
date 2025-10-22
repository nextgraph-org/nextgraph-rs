import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('LoadingSpinner', () => {
  it('renders spinner correctly', () => {
    renderWithTheme(<LoadingSpinner />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with message when provided', () => {
    renderWithTheme(<LoadingSpinner message="Loading data..." />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not render message when not provided', () => {
    renderWithTheme(<LoadingSpinner />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('applies custom size correctly', () => {
    renderWithTheme(<LoadingSpinner size={60} />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle('width: 60px');
    expect(spinner).toHaveStyle('height: 60px');
  });

  it('applies default size when not specified', () => {
    renderWithTheme(<LoadingSpinner />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle('width: 40px');
    expect(spinner).toHaveStyle('height: 40px');
  });

  it('applies custom color correctly', () => {
    renderWithTheme(<LoadingSpinner color="secondary" />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveClass('MuiCircularProgress-colorSecondary');
  });

  it('applies primary color by default', () => {
    renderWithTheme(<LoadingSpinner />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveClass('MuiCircularProgress-colorPrimary');
  });

  it('centers content when centered prop is true', () => {
    renderWithTheme(<LoadingSpinner centered message="Centered loading" />);
    
    const container = screen.getByText('Centered loading').closest('div');
    expect(container?.parentElement).toHaveStyle('display: flex');
    expect(container?.parentElement).toHaveStyle('justify-content: center');
    expect(container?.parentElement).toHaveStyle('align-items: center');
    expect(container?.parentElement).toHaveStyle('min-height: 200px');
  });

  it('does not center content when centered prop is false', () => {
    renderWithTheme(<LoadingSpinner centered={false} message="Not centered" />);
    
    const container = screen.getByText('Not centered').closest('div');
    expect(container?.parentElement).not.toHaveStyle('justify-content: center');
  });

  it('applies custom sx prop correctly', () => {
    renderWithTheme(
      <LoadingSpinner 
        sx={{ backgroundColor: 'red', padding: '16px' }}
        message="Custom styles"
      />
    );
    
    const container = screen.getByText('Custom styles').closest('div');
    expect(container).toHaveStyle('background-color: red');
    expect(container).toHaveStyle('padding: 16px');
  });

  it('passes through CircularProgress props', () => {
    renderWithTheme(<LoadingSpinner thickness={2} variant="determinate" value={50} />);
    
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders with correct flex layout for message and spinner', () => {
    renderWithTheme(<LoadingSpinner message="Loading..." />);
    
    const container = screen.getByText('Loading...').closest('div');
    expect(container).toHaveStyle('display: flex');
    expect(container).toHaveStyle('flex-direction: column');
    expect(container).toHaveStyle('align-items: center');
    expect(container).toHaveStyle('gap: 16px');
  });

  it('handles long messages correctly', () => {
    const longMessage = 'This is a very long loading message that should be handled properly by the component';
    renderWithTheme(<LoadingSpinner message={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('maintains spinner visibility with empty string message', () => {
    renderWithTheme(<LoadingSpinner message="" />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  it('combines centered and custom sx props correctly', () => {
    renderWithTheme(
      <LoadingSpinner 
        centered 
        sx={{ backgroundColor: 'blue' }}
        message="Centered with custom styles"
      />
    );
    
    const innerContainer = screen.getByText('Centered with custom styles').closest('div');
    const outerContainer = innerContainer?.parentElement;
    
    expect(innerContainer).toHaveStyle('background-color: blue');
    expect(outerContainer).toHaveStyle('justify-content: center');
    expect(outerContainer).toHaveStyle('align-items: center');
  });
});