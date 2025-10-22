import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActions } from '../QuickActions';
import type { ContentStats } from '@/types/userContent';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(className: string): R;
      toHaveValue(value: string | number): R;
    }
  }
}

const mockStats: ContentStats = {
  totalItems: 15,
  byType: {
    post: 5,
    offer: 3,
    want: 2,
    image: 2,
    link: 1,
    file: 1,
    article: 1,
  },
  byVisibility: {
    public: 8,
    network: 5,
    private: 2,
  },
  totalViews: 1250,
  totalLikes: 89,
  totalComments: 42,
};

const defaultProps = {
  searchQuery: '',
  onSearchChange: jest.fn(),
  selectedTab: 'all' as const,
  onTabChange: jest.fn(),
  filterMenuAnchor: null,
  onFilterMenuOpen: jest.fn(),
  onFilterMenuClose: jest.fn(),
  contentStats: mockStats,
};

describe('QuickActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search your content...')).toBeInTheDocument();
  });

  it('renders content type chips with counts', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText('All (15)')).toBeInTheDocument();
    expect(screen.getByText('Posts (5)')).toBeInTheDocument();
    expect(screen.getByText('Offers (3)')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search input', () => {
    render(<QuickActions {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search your content...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith('test search');
  });

  it('calls onTabChange when chip is clicked', () => {
    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Posts (5)'));
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('post');
  });

  it('calls onFilterMenuOpen when filter button is clicked', () => {
    render(<QuickActions {...defaultProps} />);
    const filterButton = screen.getByTestId('FilterListIcon').closest('button');
    fireEvent.click(filterButton!);
    expect(defaultProps.onFilterMenuOpen).toHaveBeenCalled();
  });

  it('highlights selected tab', () => {
    render(<QuickActions {...defaultProps} selectedTab="post" />);
    const postsChip = screen.getByText('Posts (5)');
    expect(postsChip.closest('.MuiChip-root')).toHaveClass('MuiChip-filled');
  });

  it('displays filter menu when anchor is provided', () => {
    const mockElement = document.createElement('div');
    render(<QuickActions {...defaultProps} filterMenuAnchor={mockElement} />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});