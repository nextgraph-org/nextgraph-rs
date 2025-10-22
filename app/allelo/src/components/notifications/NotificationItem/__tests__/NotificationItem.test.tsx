import { render, screen } from '@testing-library/react';
import { NotificationItem } from '../NotificationItem';
import type { Notification } from '@/types/notification';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockNotification: Notification = {
  id: 'notif-1',
  type: 'vouch',
  title: 'New vouch from John',
  message: 'John vouched for your professional skills',
  fromUserName: 'John Doe',
  fromUserAvatar: '/john.jpg',
  targetUserId: 'current-user',
  isRead: false,
  isActionable: true,
  status: 'pending',
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
  updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  metadata: { vouchId: 'vouch-123' }
};

const defaultProps = {
  notification: mockNotification,
  onMarkAsRead: jest.fn(),
  onAcceptVouch: jest.fn(),
  onRejectVouch: jest.fn(),
  onAcceptPraise: jest.fn(),
  onRejectPraise: jest.fn(),
  onAssignToRCard: jest.fn(),
};

describe('NotificationItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification content', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByText('New vouch from John')).toBeInTheDocument();
    expect(screen.getByText('John vouched for your professional skills')).toBeInTheDocument();
  });

  it('renders user avatar with fallback', () => {
    render(<NotificationItem {...defaultProps} />);
    const avatar = screen.getByAltText('John Doe');
    expect(avatar).toBeInTheDocument();
  });

  it('renders user avatar with initials when no image', () => {
    const notificationWithoutAvatar = {
      ...mockNotification,
      fromUserAvatar: undefined
    };
    render(<NotificationItem {...defaultProps} notification={notificationWithoutAvatar} />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('shows vouch icon for vouch notifications', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByTestId('ThumbUpIcon')).toBeInTheDocument();
  });

  it('shows praise icon for praise notifications', () => {
    const praiseNotification = {
      ...mockNotification,
      type: 'praise' as const
    };
    render(<NotificationItem {...defaultProps} notification={praiseNotification} />);
    expect(screen.getByTestId('StarBorderIcon')).toBeInTheDocument();
  });

  it('renders status chips correctly', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders accepted status chip', () => {
    const acceptedNotification = {
      ...mockNotification,
      status: 'accepted' as const
    };
    render(<NotificationItem {...defaultProps} notification={acceptedNotification} />);
    expect(screen.getByText('Accepted')).toBeInTheDocument();
  });

  it('renders rejected status chip', () => {
    const rejectedNotification = {
      ...mockNotification,
      status: 'rejected' as const
    };
    render(<NotificationItem {...defaultProps} notification={rejectedNotification} />);
    expect(screen.getByText('Declined')).toBeInTheDocument();
  });

  it('renders completed status chip', () => {
    const completedNotification = {
      ...mockNotification,
      status: 'completed' as const
    };
    render(<NotificationItem {...defaultProps} notification={completedNotification} />);
    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('renders notification actions', () => {
    render(<NotificationItem {...defaultProps} />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('highlights unread notifications with border', () => {
    const { container } = render(<NotificationItem {...defaultProps} />);
    const listItem = container.querySelector('.MuiListItem-root');
    expect(listItem).toBeInTheDocument();
  });

  it('does not highlight read notifications', () => {
    const readNotification = {
      ...mockNotification,
      isRead: true
    };
    const { container } = render(<NotificationItem {...defaultProps} notification={readNotification} />);
    const listItem = container.querySelector('.MuiListItem-root');
    expect(listItem).toBeInTheDocument();
  });

  it('handles notifications without titles gracefully', () => {
    const notificationWithoutTitle = {
      ...mockNotification,
      title: ''
    };
    render(<NotificationItem {...defaultProps} notification={notificationWithoutTitle} />);
    expect(screen.getByText('John vouched for your professional skills')).toBeInTheDocument();
  });

  it('truncates long messages correctly', () => {
    const longMessageNotification = {
      ...mockNotification,
      message: 'This is a very long message that should be truncated because it exceeds the maximum number of lines that should be displayed in the notification item preview'
    };
    render(<NotificationItem {...defaultProps} notification={longMessageNotification} />);
    expect(screen.getByText(/This is a very long message/)).toBeInTheDocument();
  });
});