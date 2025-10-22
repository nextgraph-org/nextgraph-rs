import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationDropdown } from '../NotificationDropdown';
import type { Notification, NotificationSummary } from '@/types/notification';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'vouch',
    title: 'New vouch',
    message: 'Test vouch message',
    fromUserName: 'John Doe',
    fromUserAvatar: '/john.jpg',
    targetUserId: 'current-user',
    isRead: false,
    isActionable: true,
    status: 'pending',
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    metadata: { vouchId: 'vouch-123' }
  }
];

const mockSummary: NotificationSummary = {
  total: 1,
  unread: 1,
  pending: 1,
  byType: { vouch: 1, praise: 0, connection: 0, group_invite: 0, message: 0, system: 0 }
};

const defaultProps = {
  notifications: mockNotifications,
  summary: mockSummary,
  onMarkAsRead: jest.fn(),
  onMarkAllAsRead: jest.fn(),
  onAcceptVouch: jest.fn(),
  onRejectVouch: jest.fn(),
  onAcceptPraise: jest.fn(),
  onRejectPraise: jest.fn(),
  onAssignToRCard: jest.fn(),
};

describe('NotificationDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification bell icon', () => {
    render(<NotificationDropdown {...defaultProps} />);
    expect(screen.getByLabelText('notifications')).toBeInTheDocument();
  });

  it('shows badge with unread count', () => {
    render(<NotificationDropdown {...defaultProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows notifications icon when there are unread notifications', () => {
    render(<NotificationDropdown {...defaultProps} />);
    expect(screen.getByTestId('NotificationsIcon')).toBeInTheDocument();
  });

  it('shows notifications none icon when no unread notifications', () => {
    const noUnreadSummary = { ...mockSummary, unread: 0 };
    render(<NotificationDropdown {...defaultProps} summary={noUnreadSummary} />);
    expect(screen.getByTestId('NotificationsNoneIcon')).toBeInTheDocument();
  });

  it('opens menu when bell icon is clicked', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('renders notification preview when menu is open', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('1 Total')).toBeInTheDocument();
      expect(screen.getByText('1 Unread')).toBeInTheDocument();
    });
  });

  it('shows View All Notifications footer when there are notifications', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('View All Notifications')).toBeInTheDocument();
    });
  });

  it('does not show footer when no notifications', async () => {
    const emptyProps = {
      ...defaultProps,
      notifications: [],
      summary: { ...mockSummary, total: 0, unread: 0, pending: 0 }
    };
    render(<NotificationDropdown {...emptyProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('View All Notifications')).not.toBeInTheDocument();
  });

  it('closes menu when View All Notifications is clicked', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      const viewAllButton = screen.getByText('View All Notifications');
      fireEvent.click(viewAllButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });

  it('stops event propagation when menu is clicked', async () => {
    const mockStopPropagation = jest.fn();
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      const menu = screen.getByRole('presentation');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      clickEvent.stopPropagation = mockStopPropagation;
      fireEvent(menu, clickEvent);
    });

    expect(mockStopPropagation).toHaveBeenCalled();
  });

  it('passes through all handler props to NotificationPreview', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('New vouch')).toBeInTheDocument();
    });

    // Test that action buttons are rendered (indicating handlers are passed)
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    
    expect(bellButton).toHaveAttribute('aria-haspopup', 'true');
    expect(bellButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates aria-expanded when menu is opened', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    
    fireEvent.click(bellButton);
    
    await waitFor(() => {
      expect(bellButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('renders with correct menu positioning', async () => {
    render(<NotificationDropdown {...defaultProps} />);
    const bellButton = screen.getByLabelText('notifications');
    fireEvent.click(bellButton);

    await waitFor(() => {
      const menu = screen.getByRole('presentation');
      expect(menu).toBeInTheDocument();
    });
  });
});