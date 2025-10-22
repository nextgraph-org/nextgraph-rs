import { render, screen, fireEvent } from '@testing-library/react';
import { InvitationActions } from '../InvitationActions';
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
  invitationUrl: 'https://example.com/invite/123',
  invitationId: 'invite-123',
  personalizedInvite: {
    inviteeName: 'John Doe',
    inviterName: 'Alice Smith'
  },
  group: mockGroup,
  isGroupInvite: true,
  onCopyToClipboard: jest.fn(),
  onShare: jest.fn(),
  onEmailShare: jest.fn(),
  onWhatsAppShare: jest.fn(),
  onSMSShare: jest.fn(),
  onDownloadQR: jest.fn(),
  onNewInvitation: jest.fn(),
};

describe('InvitationActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders QR code section', () => {
    render(<InvitationActions {...defaultProps} />);
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('Scan to join Test Group')).toBeInTheDocument();
  });

  it('renders personal network QR description when not group invite', () => {
    const props = { ...defaultProps, isGroupInvite: false };
    render(<InvitationActions {...props} />);
    expect(screen.getByText('Scan to join your network')).toBeInTheDocument();
  });

  it('renders invitation URL in text field', () => {
    render(<InvitationActions {...defaultProps} />);
    const textField = screen.getByDisplayValue('https://example.com/invite/123');
    expect(textField).toBeInTheDocument();
  });

  it('renders invitation ID', () => {
    render(<InvitationActions {...defaultProps} />);
    expect(screen.getByText('Invitation ID: invite-123')).toBeInTheDocument();
  });

  it('calls onCopyToClipboard when copy button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const copyButton = screen.getByTestId('ContentCopyIcon').parentElement!;
    fireEvent.click(copyButton);
    expect(defaultProps.onCopyToClipboard).toHaveBeenCalled();
  });

  it('calls onDownloadQR when download button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const downloadButton = screen.getByText('Download');
    fireEvent.click(downloadButton);
    expect(defaultProps.onDownloadQR).toHaveBeenCalled();
  });

  it('calls onNewInvitation when new QR button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const newQRButton = screen.getByText('New QR');
    fireEvent.click(newQRButton);
    expect(defaultProps.onNewInvitation).toHaveBeenCalled();
  });

  it('calls onShare when share button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    expect(defaultProps.onShare).toHaveBeenCalled();
  });

  it('calls onEmailShare when email button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const emailButton = screen.getByText('Email');
    fireEvent.click(emailButton);
    expect(defaultProps.onEmailShare).toHaveBeenCalled();
  });

  it('calls onWhatsAppShare when WhatsApp button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const whatsappButton = screen.getByText('WhatsApp');
    fireEvent.click(whatsappButton);
    expect(defaultProps.onWhatsAppShare).toHaveBeenCalled();
  });

  it('calls onSMSShare when SMS button is clicked', () => {
    render(<InvitationActions {...defaultProps} />);
    const smsButton = screen.getByText('SMS');
    fireEvent.click(smsButton);
    expect(defaultProps.onSMSShare).toHaveBeenCalled();
  });
});