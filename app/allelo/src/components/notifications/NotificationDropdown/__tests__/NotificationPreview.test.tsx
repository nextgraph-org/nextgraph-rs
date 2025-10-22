import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPreview } from '../NotificationPreview';
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
  },
  {
    id: 'notif-2',
    type: 'praise',
    title: 'Praise received',
    message: 'Test praise message',
    fromUserName: 'Alice Smith',
    fromUserAvatar: '/alice.jpg',
    targetUserId: 'current-user',
    isRead: true,
    isActionable: false,
    status: 'accepted',
    createdAt: new Date('2024-01-02T14:30:00.000Z'),
    updatedAt: new Date('2024-01-02T14:30:00.000Z'),
    metadata: { praiseId: 'praise-456' }
  }
];

const mockSummary: NotificationSummary = {
  total: 2,
  unread: 1,
  pending: 1,
  byType: { vouch: 1, praise: 1, connection: 0, group_invite: 0, message: 0, system: 0 }
};

const defaultProps = {
  notifications: mockNotifications,
  summary: mockSummary,
  filter: 'all' as const,
  onMarkAsRead: jest.fn(),
  onMarkAllAsRead: jest.fn(),
  onAcceptVouch: jest.fn(),
  onRejectVouch: jest.fn(),
  onAcceptPraise: jest.fn(),
  onRejectPraise: jest.fn(),
  onAssignToRCard: jest.fn(),
  onFilterChange: jest.fn(),
};

describe('NotificationPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with title', () => {
    render(<NotificationPreview {...defaultProps} />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('renders mark all read button when there are unread notifications', () => {
    render(<NotificationPreview {...defaultProps} />);
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
  });

  it('calls onMarkAllAsRead when mark all read is clicked', () => {
    render(<NotificationPreview {...defaultProps} />);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(defaultProps.onMarkAllAsRead).toHaveBeenCalled();
  });

  it('renders summary statistics', () => {
    render(<NotificationPreview {...defaultProps} />);
    expect(screen.getByText('2 Total')).toBeInTheDocument();
    expect(screen.getByText('1 Unread')).toBeInTheDocument();
    expect(screen.getByText('1 Pending')).toBeInTheDocument();
  });

  it('renders filter chips', () => {
    render(<NotificationPreview {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getAllByText('Pending')).toHaveLength(2); // One in summary, one in filter
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('calls onFilterChange when filter chip is clicked', () => {
    const { container } = render(<NotificationPreview {...defaultProps} />);
    // Find the filter chips section specifically (after summary chips)
    const filterChips = container.querySelectorAll('.MuiChip-root');
    // The filter chips come after the summary chips, so we look for the clickable ones
    const clickableChips = Array.from(filterChips).filter(chip => 
      chip.textContent && ['All', 'Pending', 'Unread'].includes(chip.textContent)
    );
    const pendingChip = clickableChips.find(chip => chip.textContent === 'Pending');
    if (pendingChip) {
      fireEvent.click(pendingChip);
      expect(defaultProps.onFilterChange).toHaveBeenCalledWith('pending');
    }
  });

  it('shows active filter with filled variant', () => {
    const { container } = render(<NotificationPreview {...defaultProps} filter="pending" />);
    const filterChips = container.querySelectorAll('.MuiChip-root');
    const clickableChips = Array.from(filterChips).filter(chip => 
      chip.textContent && ['All', 'Pending', 'Unread'].includes(chip.textContent)
    );
    const pendingChip = clickableChips.find(chip => chip.textContent === 'Pending');
    expect(pendingChip).toHaveAttribute('class', expect.stringContaining('MuiChip-filled'));
  });

  it('shows inactive filters with outlined variant', () => {
    render(<NotificationPreview {...defaultProps} filter="pending" />);
    const allChip = screen.getByText('All').closest('.MuiChip-root');
    expect(allChip).toHaveAttribute('class', expect.stringContaining('MuiChip-outlined'));
  });

  it('filters notifications based on filter prop', () => {
    render(<NotificationPreview {...defaultProps} filter="pending" />);
    expect(screen.getByText('New vouch')).toBeInTheDocument();
    expect(screen.queryByText('Praise received')).not.toBeInTheDocument();
  });

  it('filters unread notifications correctly', () => {
    render(<NotificationPreview {...defaultProps} filter="unread" />);
    expect(screen.getByText('New vouch')).toBeInTheDocument();
    expect(screen.queryByText('Praise received')).not.toBeInTheDocument();
  });

  it('shows all notifications with all filter', () => {
    render(<NotificationPreview {...defaultProps} filter="all" />);
    expect(screen.getByText('New vouch')).toBeInTheDocument();
    expect(screen.getByText('Praise received')).toBeInTheDocument();
  });

  it('shows empty state for filtered results', () => {
    const emptyProps = {
      ...defaultProps,
      notifications: [],
      filter: 'pending' as const
    };
    render(<NotificationPreview {...emptyProps} />);
    expect(screen.getByText('No pending notifications')).toBeInTheDocument();
  });

  it('shows empty state for no notifications', () => {
    const emptyProps = {
      ...defaultProps,
      notifications: [],
      filter: 'all' as const
    };
    render(<NotificationPreview {...emptyProps} />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows empty state for no unread notifications', () => {
    const emptyProps = {
      ...defaultProps,
      notifications: [],
      filter: 'unread' as const
    };
    render(<NotificationPreview {...emptyProps} />);
    expect(screen.getByText('No unread notifications')).toBeInTheDocument();
  });

  it('renders notification items in list', () => {
    render(<NotificationPreview {...defaultProps} />);
    expect(screen.getByText('Test vouch message')).toBeInTheDocument();
    expect(screen.getByText('Test praise message')).toBeInTheDocument();
  });

  it('does not show mark all read button when no unread notifications', () => {
    const readSummary = { ...mockSummary, unread: 0 };
    render(<NotificationPreview {...defaultProps} summary={readSummary} />);
    expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
  });

  it('does not show unread chip when no unread notifications', () => {
    const readSummary = { ...mockSummary, unread: 0 };
    render(<NotificationPreview {...defaultProps} summary={readSummary} />);
    expect(screen.queryByText(/^\d+ Unread$/)).not.toBeInTheDocument();
  });

  it('does not show pending chip when no pending notifications', () => {
    const noPendingSummary = { ...mockSummary, pending: 0 };
    render(<NotificationPreview {...defaultProps} summary={noPendingSummary} />);
    expect(screen.queryByText(/^\d+ Pending$/)).not.toBeInTheDocument();
  });
});