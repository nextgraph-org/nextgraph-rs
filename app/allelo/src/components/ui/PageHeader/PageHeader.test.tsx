import { render, screen, fireEvent } from '@testing-library/react';
import { Add, Edit } from '@mui/icons-material';
import { PageHeader } from './PageHeader';
import type { HeaderAction } from './types';

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

describe('PageHeader', () => {
  it('renders title correctly', () => {
    render(<PageHeader title="Test Page" />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Page');
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Test Page" subtitle="Page description" />);
    
    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('does not render subtitle when not provided', () => {
    render(<PageHeader title="Test Page" />);
    
    expect(screen.queryByText('Page description')).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    const mockAction = jest.fn();
    const actions: HeaderAction[] = [
      {
        label: 'Add Item',
        icon: <Add />,
        onClick: mockAction,
        variant: 'contained'
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
  });

  it('calls action onClick when button is clicked', () => {
    const mockAction = jest.fn();
    const actions: HeaderAction[] = [
      {
        label: 'Test Action',
        onClick: mockAction
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    const button = screen.getByRole('button', { name: /test action/i });
    fireEvent.click(button);
    
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('renders multiple actions correctly', () => {
    const actions: HeaderAction[] = [
      {
        label: 'First Action',
        onClick: jest.fn(),
        variant: 'outlined'
      },
      {
        label: 'Second Action',
        onClick: jest.fn(),
        variant: 'contained'
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    expect(screen.getByRole('button', { name: /first action/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /second action/i })).toBeInTheDocument();
  });

  it('applies action properties correctly', () => {
    const actions: HeaderAction[] = [
      {
        label: 'Disabled Action',
        onClick: jest.fn(),
        disabled: true
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    const button = screen.getByRole('button', { name: /disabled action/i });
    expect(button).toBeDisabled();
  });

  it('shows loading state on actions when loading prop is true', () => {
    const actions: HeaderAction[] = [
      {
        label: 'Test Action',
        onClick: jest.fn()
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} loading />);
    
    // Button should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows individual action loading state', () => {
    const actions: HeaderAction[] = [
      {
        label: 'Loading Action',
        onClick: jest.fn(),
        loading: true
      },
      {
        label: 'Normal Action',
        onClick: jest.fn()
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    // Only one button should show loading spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<PageHeader title="Test Page" ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies custom sx prop correctly', () => {
    render(<PageHeader title="Test Page" sx={{ bgcolor: 'red' }} data-testid="header-root" />);
    
    const header = screen.getByTestId('header-root');
    expect(header).toHaveStyle({ backgroundColor: 'red' });
  });

  it('passes through other Box props', () => {
    render(<PageHeader title="Test Page" data-testid="custom-header" />);
    
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
  });

  it('renders actions with icons correctly', () => {
    const actions: HeaderAction[] = [
      {
        label: 'Add',
        icon: <Add data-testid="add-icon" />,
        onClick: jest.fn()
      },
      {
        label: 'Edit',
        icon: <Edit data-testid="edit-icon" />,
        onClick: jest.fn()
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    expect(screen.getByTestId('add-icon')).toBeInTheDocument();
    expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
  });

  it('applies action color and variant correctly', () => {
    const actions: HeaderAction[] = [
      {
        label: 'Primary Action',
        onClick: jest.fn(),
        variant: 'contained',
        color: 'primary'
      },
      {
        label: 'Error Action',
        onClick: jest.fn(),
        variant: 'outlined',
        color: 'error'
      }
    ];
    
    render(<PageHeader title="Test Page" actions={actions} />);
    
    const primaryButton = screen.getByRole('button', { name: /primary action/i });
    const errorButton = screen.getByRole('button', { name: /error action/i });
    
    expect(primaryButton).toBeInTheDocument();
    expect(errorButton).toBeInTheDocument();
  });

  it('handles empty actions array', () => {
    render(<PageHeader title="Test Page" actions={[]} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('handles responsive design for title', () => {
    render(<PageHeader title="Very Long Page Title That Might Overflow" />);
    
    const heading = screen.getByRole('heading');
    expect(heading).toHaveStyle({
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      overflow: 'hidden'
    });
  });
});