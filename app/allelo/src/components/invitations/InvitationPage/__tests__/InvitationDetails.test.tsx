import { render, screen } from '@testing-library/react';
import { InvitationDetails } from '../InvitationDetails';
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

const mockGroup: Group = {
  id: 'test-group',
  name: 'Test Group',
  description: 'Test description',
  memberCount: 5,
  memberIds: ['user1', 'user2'],
  createdBy: 'test-user',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isPrivate: false,
  image: '/test-group.jpg'
};

const defaultProps = {
  personalizedInvite: {
    inviteeName: 'John Doe',
    inviterName: 'Alice Smith',
    relationshipType: 'colleague'
  },
  group: mockGroup,
  isGroupInvite: true,
};

describe('InvitationDetails', () => {
  it('renders group invitation header with invitee name', () => {
    render(<InvitationDetails {...defaultProps} />);
    expect(screen.getByText('Invite John Doe to Test Group')).toBeInTheDocument();
  });

  it('renders group invitation header without invitee name', () => {
    const props = {
      ...defaultProps,
      personalizedInvite: { ...defaultProps.personalizedInvite, inviteeName: undefined }
    };
    render(<InvitationDetails {...props} />);
    expect(screen.getByText('Invite to Test Group')).toBeInTheDocument();
  });

  it('renders personal network invitation with invitee name', () => {
    const props = { ...defaultProps, isGroupInvite: false };
    render(<InvitationDetails {...props} />);
    expect(screen.getByText('Invite John Doe to Your Network')).toBeInTheDocument();
  });

  it('renders personal network invitation without invitee name', () => {
    const props = {
      ...defaultProps,
      isGroupInvite: false,
      personalizedInvite: { ...defaultProps.personalizedInvite, inviteeName: undefined }
    };
    render(<InvitationDetails {...props} />);
    expect(screen.getByText('Invite to Your Network')).toBeInTheDocument();
  });

  it('shows private group indicator for private groups', () => {
    const privateGroup = { ...mockGroup, isPrivate: true };
    const props = { ...defaultProps, group: privateGroup };
    render(<InvitationDetails {...props} />);
    expect(screen.getByText('Private Group')).toBeInTheDocument();
  });

  it('does not show private group indicator for public groups', () => {
    render(<InvitationDetails {...defaultProps} />);
    expect(screen.queryByText('Private Group')).not.toBeInTheDocument();
  });

  it('renders group avatar', () => {
    render(<InvitationDetails {...defaultProps} />);
    const avatar = screen.getByAltText('Test Group');
    expect(avatar).toBeInTheDocument();
  });
});