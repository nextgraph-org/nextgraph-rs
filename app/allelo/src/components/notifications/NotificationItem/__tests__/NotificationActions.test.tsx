import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationActions } from '../NotificationActions';
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
  title: 'New vouch',
  message: 'Test vouch message',
  fromUserName: 'Test User',
  fromUserAvatar: '/test.jpg',
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

describe('NotificationActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action buttons for pending actionable notifications', () => {
    render(<NotificationActions {...defaultProps} />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('renders assign to rCard button for accepted notifications', () => {
    const acceptedNotification = {
      ...mockNotification,
      status: 'accepted' as const,
      isActionable: false
    };
    render(<NotificationActions {...defaultProps} notification={acceptedNotification} />);
    expect(screen.getByText('Assign to rCard')).toBeInTheDocument();
  });

  it('calls onAcceptVouch when accept button is clicked', () => {
    render(<NotificationActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Accept'));
    expect(defaultProps.onAcceptVouch).toHaveBeenCalledWith('notif-1', 'vouch-123');
  });

  it('calls onRejectVouch when decline button is clicked', () => {
    render(<NotificationActions {...defaultProps} />);
    fireEvent.click(screen.getByText('Decline'));
    expect(defaultProps.onRejectVouch).toHaveBeenCalledWith('notif-1', 'vouch-123');
  });

  it('opens menu when menu button is clicked', async () => {
    render(<NotificationActions {...defaultProps} />);
    const menuButton = screen.getByTestId('MoreVertIcon').parentElement!;
    fireEvent.click(menuButton);
    
    await waitFor(() => {
      expect(screen.getByText('Mark as read')).toBeInTheDocument();
    });
  });

  it('calls onMarkAsRead when menu item is clicked', async () => {
    render(<NotificationActions {...defaultProps} />);
    const menuButton = screen.getByTestId('MoreVertIcon').parentElement!;
    fireEvent.click(menuButton);
    
    await waitFor(() => {
      const markAsReadItem = screen.getByText('Mark as read');
      fireEvent.click(markAsReadItem);
    });
    
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('notif-1');
  });

  it('opens assign dialog when assign button is clicked', async () => {
    const acceptedNotification = {
      ...mockNotification,
      status: 'accepted' as const,
      isActionable: false
    };
    render(<NotificationActions {...defaultProps} notification={acceptedNotification} />);
    
    const assignButton = screen.getByRole('button', { name: /assign to rcard/i });
    fireEvent.click(assignButton);
    
    await waitFor(() => {
      expect(screen.getAllByText('Assign to rCard')).toHaveLength(2); // Button + Dialog title
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('handles praise notifications correctly', () => {
    const praiseNotification = {
      ...mockNotification,
      type: 'praise' as const,
      metadata: { praiseId: 'praise-456' }
    };
    render(<NotificationActions {...defaultProps} notification={praiseNotification} />);
    
    fireEvent.click(screen.getByText('Accept'));
    expect(defaultProps.onAcceptPraise).toHaveBeenCalledWith('notif-1', 'praise-456');
    
    fireEvent.click(screen.getByText('Decline'));
    expect(defaultProps.onRejectPraise).toHaveBeenCalledWith('notif-1', 'praise-456');
  });

  it('renders formatted date correctly', () => {
    render(<NotificationActions {...defaultProps} />);
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
  });

  it('does not render action buttons for non-actionable notifications', () => {
    const nonActionableNotification = {
      ...mockNotification,
      isActionable: false,
      status: 'completed' as const
    };
    render(<NotificationActions {...defaultProps} notification={nonActionableNotification} />);
    
    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    expect(screen.queryByText('Decline')).not.toBeInTheDocument();
  });
});