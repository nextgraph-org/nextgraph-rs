import { render, screen, fireEvent } from '@testing-library/react';
import { MembersList } from '../MembersList';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockMembers = [
  {
    id: 'admin-1',
    name: 'Admin User',
    avatar: '/admin.jpg',
    role: 'Admin' as const,
    status: 'Member' as const,
    joinedAt: new Date('2024-01-01'),
  },
  {
    id: 'member-1', 
    name: 'Regular Member',
    avatar: '/member.jpg',
    role: 'Member' as const,
    status: 'Member' as const,
    joinedAt: new Date('2024-01-15'),
  },
  {
    id: 'invited-1',
    name: 'Invited User',
    avatar: '/invited.jpg', 
    role: 'Member' as const,
    status: 'Invited' as const,
    joinedAt: null,
  },
];

const defaultProps = {
  members: mockMembers,
  isCurrentUserAdmin: false,
  onInviteMember: jest.fn(),
  onRemoveMember: jest.fn(),
};

describe('MembersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders member count in header', () => {
    render(<MembersList {...defaultProps} />);
    expect(screen.getByText('Members (3)')).toBeInTheDocument();
  });

  it('renders all members', () => {
    render(<MembersList {...defaultProps} />);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Regular Member')).toBeInTheDocument();
    expect(screen.getByText('Invited User')).toBeInTheDocument();
  });

  it('shows invite button always', () => {
    // The component shows invite button regardless of isCurrentUserAdmin
    render(<MembersList {...defaultProps} />);
    expect(screen.getByText('Invite')).toBeInTheDocument();
  });

  it('calls onInviteMember when invite button is clicked', () => {
    render(<MembersList {...defaultProps} />);
    fireEvent.click(screen.getByText('Invite'));
    expect(defaultProps.onInviteMember).toHaveBeenCalled();
  });

  it('shows remove buttons for admins (except oli-sb)', () => {
    render(<MembersList {...defaultProps} isCurrentUserAdmin={true} />);
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(3); // Shows for all members since none have id 'oli-sb'
  });

  it('does not show remove buttons for non-admins', () => {
    render(<MembersList {...defaultProps} isCurrentUserAdmin={false} />);
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('calls onRemoveMember when remove button is clicked', () => {
    render(<MembersList {...defaultProps} isCurrentUserAdmin={true} />);
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    expect(defaultProps.onRemoveMember).toHaveBeenCalledWith(mockMembers[0]);
  });

  it('shows Admin chip for admin role', () => {
    render(<MembersList {...defaultProps} />);
    // Only one Admin chip for the admin user
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows status chips correctly', () => {
    render(<MembersList {...defaultProps} />);
    // Two Member status chips (one for admin, one for regular member)
    const memberChips = screen.getAllByText('Member');
    expect(memberChips).toHaveLength(2);
    
    // One Invited status chip
    expect(screen.getByText('Invited')).toBeInTheDocument();
  });

  it('does not show remove button for user with id oli-sb', () => {
    const membersWithOli = [
      ...mockMembers,
      {
        id: 'oli-sb',
        name: 'Oli SB',
        avatar: '/oli.jpg',
        role: 'Admin' as const,
        status: 'Member' as const,
        joinedAt: new Date('2024-01-01'),
      }
    ];
    
    render(<MembersList {...defaultProps} members={membersWithOli} isCurrentUserAdmin={true} />);
    const removeButtons = screen.getAllByText('Remove');
    // Should still be 3 remove buttons (not 4) because oli-sb is excluded
    expect(removeButtons).toHaveLength(3);
  });
});