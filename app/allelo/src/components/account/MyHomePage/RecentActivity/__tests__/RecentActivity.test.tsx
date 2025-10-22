import { render, screen, fireEvent } from '@testing-library/react';
import { RecentActivity } from '../RecentActivity';
import type { UserContent } from '@/types/userContent';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockContent: UserContent[] = [
  {
    id: '1',
    type: 'post',
    title: 'Test Post',
    content: 'This is a test post content',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tags: ['test', 'post'],
    visibility: 'public',
    viewCount: 10,
    likeCount: 5,
    commentCount: 2,
    rCardIds: ['personal'],
    attachments: [],
  },
  {
    id: '2',
    type: 'offer',
    title: 'Test Offer',
    description: 'A test offer',
    content: 'This is a test offer',
    category: 'Services',
    price: '$100',
    availability: 'available',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    tags: ['service'],
    visibility: 'network',
    viewCount: 15,
    likeCount: 3,
    commentCount: 1,
    rCardIds: ['business'],
  },
];

const defaultProps = {
  content: mockContent,
  searchQuery: '',
  onSearchChange: jest.fn(),
  selectedTab: 'all' as const,
  onTabChange: jest.fn(),
  onContentAction: jest.fn(),
  onMenuOpen: jest.fn(),
  onMenuClose: jest.fn(),
  menuAnchor: {},
};

describe('RecentActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content items', () => {
    render(<RecentActivity {...defaultProps} />);
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('Test Offer')).toBeInTheDocument();
  });

  it('displays content type and visibility chips', () => {
    render(<RecentActivity {...defaultProps} />);
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('Offer')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
  });

  it('shows offer-specific content', () => {
    render(<RecentActivity {...defaultProps} />);
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('available')).toBeInTheDocument();
  });

  it('displays tags', () => {
    render(<RecentActivity {...defaultProps} />);
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('post')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
  });

  it('shows engagement stats', () => {
    render(<RecentActivity {...defaultProps} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // Comments for post
    expect(screen.getByText('1')).toBeInTheDocument(); // Comments for offer
  });

  it('calls onMenuOpen when menu button is clicked', () => {
    render(<RecentActivity {...defaultProps} />);
    const menuButtons = screen.getAllByTestId('MoreVertIcon');
    fireEvent.click(menuButtons[0].closest('button')!);
    expect(defaultProps.onMenuOpen).toHaveBeenCalledWith('1', expect.any(HTMLElement));
  });

  it('calls onContentAction when menu item is clicked', () => {
    const menuAnchor = { '1': document.createElement('button') };
    render(<RecentActivity {...defaultProps} menuAnchor={menuAnchor} />);
    
    const editMenuItem = screen.getByText('Edit');
    fireEvent.click(editMenuItem);
    expect(defaultProps.onContentAction).toHaveBeenCalledWith('1', 'edit');
  });

  it('renders empty state when no content', () => {
    render(<RecentActivity {...defaultProps} content={[]} />);
    expect(screen.getByText('No content found')).toBeInTheDocument();
    expect(screen.getByText("You haven't shared any content yet")).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const recentContent = [{
      ...mockContent[0],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    }];
    
    render(<RecentActivity {...defaultProps} content={recentContent} />);
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });
});