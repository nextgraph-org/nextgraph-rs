import { render, screen, fireEvent } from '@testing-library/react';
import { GroupFeed } from '../GroupFeed';
import type { Group } from '@/types/group';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockGroups: Group[] = [
  {
    id: 'group-1',
    name: 'Test Group 1',
    description: 'First test group',
    memberCount: 5,
    memberIds: ['user1', 'user2', 'user3'],
    createdBy: 'test-user',
    tags: ['test', 'development'],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    isPrivate: false,
    unreadCount: 3,
    latestPost: 'This is the latest post',
    latestPostAuthor: 'John Doe'
  },
  {
    id: 'group-2',
    name: 'Test Group 2', 
    description: 'Second test group',
    memberCount: 12,
    memberIds: ['user1', 'user2', 'user3', 'user4'],
    createdBy: 'test-user-2',
    tags: ['testing', 'qa'],
    createdAt: new Date('2024-01-15T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    isPrivate: true,
  }
];

const defaultProps = {
  groups: mockGroups,
  isLoading: false,
  searchQuery: '',
  onGroupClick: jest.fn(),
};

describe('GroupFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state', () => {
    render(<GroupFeed {...defaultProps} isLoading={true} />);
    expect(screen.getByText('Loading groups...')).toBeInTheDocument();
  });

  it('shows empty state when no groups', () => {
    render(<GroupFeed {...defaultProps} groups={[]} />);
    expect(screen.getByText('No groups yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first group to get started!')).toBeInTheDocument();
  });

  it('shows search empty state', () => {
    render(<GroupFeed {...defaultProps} groups={[]} searchQuery="nonexistent" />);
    expect(screen.getByText('No groups found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search terms.')).toBeInTheDocument();
  });

  it('renders group information', () => {
    render(<GroupFeed {...defaultProps} />);
    expect(screen.getByText('Test Group 1')).toBeInTheDocument();
    expect(screen.getByText('First test group')).toBeInTheDocument();
    expect(screen.getByText('Test Group 2')).toBeInTheDocument();
    expect(screen.getByText('Second test group')).toBeInTheDocument();
  });

  it('calls onGroupClick when group is clicked', () => {
    render(<GroupFeed {...defaultProps} />);
    fireEvent.click(screen.getByText('Test Group 1'));
    expect(defaultProps.onGroupClick).toHaveBeenCalledWith('group-1');
  });

  it('shows unread count badge', () => {
    render(<GroupFeed {...defaultProps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows latest post information', () => {
    render(<GroupFeed {...defaultProps} />);
    expect(screen.getByText(/John: This is the latest post/)).toBeInTheDocument();
  });

  it('renders group tags', () => {
    render(<GroupFeed {...defaultProps} />);
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('qa')).toBeInTheDocument();
  });
});