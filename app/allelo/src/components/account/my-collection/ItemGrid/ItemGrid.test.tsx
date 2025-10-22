import { render, screen, fireEvent } from '@testing-library/react';
import { ItemGrid } from './ItemGrid';
import type { BookmarkedItem } from '@/types/collection';

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

const mockItems: BookmarkedItem[] = [
  {
    id: '1',
    originalId: 'article-123',
    type: 'article',
    title: 'The Future of Web Development',
    description: 'An in-depth look at emerging trends in web development.',
    content: 'Web development is evolving rapidly...',
    author: {
      id: 'author-1',
      name: 'Sarah Johnson',
      avatar: '/api/placeholder/40/40',
    },
    source: 'TechBlog',
    bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    tags: ['web-development', 'ai', 'trends'],
    notes: 'Good insights on AI integration.',
    category: 'Technology',
    isRead: false,
    isFavorite: true,
  },
  {
    id: '2',
    originalId: 'post-456',
    type: 'post',
    title: 'Remote Work Best Practices',
    description: 'Tips for staying productive while working remotely',
    content: 'Working remotely requires discipline...',
    author: {
      id: 'author-2',
      name: 'Mike Chen',
      avatar: '/api/placeholder/40/40',
    },
    source: 'LinkedIn',
    bookmarkedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    tags: ['remote-work', 'productivity'],
    category: 'Work',
    isRead: true,
    isFavorite: false,
  },
];

const defaultProps = {
  items: mockItems,
  searchQuery: '',
  onToggleFavorite: jest.fn(),
  onMarkAsRead: jest.fn(),
  onMenuOpen: jest.fn(),
  onMenuClose: jest.fn(),
  menuAnchor: {},
};

describe('ItemGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders bookmarked items', () => {
    render(<ItemGrid {...defaultProps} />);
    
    expect(screen.getByText('The Future of Web Development')).toBeInTheDocument();
    expect(screen.getByText('Remote Work Best Practices')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<ItemGrid {...defaultProps} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('displays item details correctly', () => {
    render(<ItemGrid {...defaultProps} />);
    
    expect(screen.getByText('An in-depth look at emerging trends in web development.')).toBeInTheDocument();
    expect(screen.getByText('Tips for staying productive while working remotely')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Work')).toBeInTheDocument();
  });

  it('shows unread badge for unread items', () => {
    render(<ItemGrid {...defaultProps} />);
    
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('displays item tags', () => {
    render(<ItemGrid {...defaultProps} />);
    
    expect(screen.getByText('web-development')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('trends')).toBeInTheDocument();
    expect(screen.getByText('remote-work')).toBeInTheDocument();
    expect(screen.getByText('productivity')).toBeInTheDocument();
  });


  it('calls onToggleFavorite when favorite button is clicked', () => {
    const onToggleFavorite = jest.fn();
    render(<ItemGrid {...defaultProps} onToggleFavorite={onToggleFavorite} />);
    
    const favoriteButtons = screen.getAllByTestId('FavoriteIcon');
    fireEvent.click(favoriteButtons[0]);
    
    expect(onToggleFavorite).toHaveBeenCalledWith('1');
  });

  it('calls onMenuOpen when menu button is clicked', () => {
    const onMenuOpen = jest.fn();
    render(<ItemGrid {...defaultProps} onMenuOpen={onMenuOpen} />);
    
    const menuButtons = screen.getAllByTestId('MoreVertIcon');
    fireEvent.click(menuButtons[0]);
    
    expect(onMenuOpen).toHaveBeenCalledWith('1', expect.any(HTMLElement));
  });


  it('shows empty state when no items', () => {
    render(<ItemGrid {...defaultProps} items={[]} />);
    
    expect(screen.getByText('No bookmarks found')).toBeInTheDocument();
    expect(screen.getByText("You haven't bookmarked any content yet")).toBeInTheDocument();
  });

  it('shows search-specific empty state', () => {
    render(<ItemGrid {...defaultProps} items={[]} searchQuery="nonexistent" />);
    
    expect(screen.getByText('No bookmarks found')).toBeInTheDocument();
    expect(screen.getByText('No bookmarks match "nonexistent"')).toBeInTheDocument();
  });

  it('displays correct content icons for different item types', () => {
    render(<ItemGrid {...defaultProps} />);
    
    expect(screen.getByTestId('ArticleIcon')).toBeInTheDocument();
    expect(screen.getByTestId('PostAddIcon')).toBeInTheDocument();
  });
});