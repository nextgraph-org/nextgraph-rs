import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionHeader } from './CollectionHeader';

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

const defaultProps = {
  onQueryClick: jest.fn(),
};

describe('CollectionHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with title and query button', () => {
    render(<CollectionHeader {...defaultProps} />);
    
    expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Query Collection')).toBeInTheDocument();
    expect(screen.getByTestId('AutoAwesomeIcon')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<CollectionHeader {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('calls onQueryClick when query button is clicked', () => {
    const onQueryClick = jest.fn();
    render(<CollectionHeader {...defaultProps} onQueryClick={onQueryClick} />);
    
    fireEvent.click(screen.getByText('Query Collection'));
    expect(onQueryClick).toHaveBeenCalledTimes(1);
  });

  it('renders with proper styling structure', () => {
    const { container } = render(<CollectionHeader {...defaultProps} />);
    
    const headerBox = container.firstChild as HTMLElement;
    expect(headerBox).toHaveStyle({ marginBottom: '32px' });
  });

  it('displays correct button variant and icon', () => {
    render(<CollectionHeader {...defaultProps} />);
    
    const button = screen.getByText('Query Collection').closest('button');
    expect(button).toHaveClass('MuiButton-contained');
    expect(screen.getByTestId('AutoAwesomeIcon')).toBeInTheDocument();
  });
});