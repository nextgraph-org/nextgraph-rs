import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarkedItemCard } from '../BookmarkedItemCard';
import type { BookmarkedItem } from '@/types/collection';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockItem: BookmarkedItem = {
  id: '1',
  originalId: 'article-123',
  type: 'article',
  title: 'Test Article',
  description: 'Test description',
  content: 'Test content',
  author: {
    id: 'author-1',
    name: 'John Doe',
    avatar: '/test-avatar.jpg',
  },
  source: 'TestBlog',
  bookmarkedAt: new Date('2024-01-01'),
  tags: ['test', 'article'],
  notes: 'Test notes',
  category: 'Technology',
  isRead: false,
  isFavorite: true,
};

const defaultProps = {
  item: mockItem,
  menuAnchor: null,
  onToggleFavorite: jest.fn(),
  onMarkAsRead: jest.fn(),
  onMenuOpen: jest.fn(),
  onMenuClose: jest.fn(),
};

describe('BookmarkedItemCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders bookmarked item information', () => {
    render(<BookmarkedItemCard {...defaultProps} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('article')).toBeInTheDocument();
  });

  it('calls onToggleFavorite when favorite button is clicked', () => {
    render(<BookmarkedItemCard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const favoriteButton = buttons[0]; // First button is the favorite button
    fireEvent.click(favoriteButton);
    expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith('1');
  });

  it('calls onMenuOpen when menu button is clicked', () => {
    render(<BookmarkedItemCard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const menuButton = buttons[1]; // Second button is the menu button
    fireEvent.click(menuButton);
    expect(defaultProps.onMenuOpen).toHaveBeenCalledWith('1', expect.any(HTMLElement));
  });

  it('shows unread chip for unread items', () => {
    render(<BookmarkedItemCard {...defaultProps} />);
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });
});