import { render, screen, fireEvent } from '@testing-library/react';
import { InviteForm } from '../InviteForm';
import type { Group } from '@/types/group';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeDisabled(): R;
    }
  }
}

jest.mock('@/services/dataService', () => ({
  dataService: {
    getContact: jest.fn(),
  },
}));

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
  open: true,
  onClose: jest.fn(),
  onSubmit: jest.fn(),
  onSelectFromNetwork: jest.fn(),
  group: mockGroup,
};

describe('InviteForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form title with group name', () => {
    render(<InviteForm {...defaultProps} />);
    expect(screen.getByText('Invite Someone to Test Group')).toBeInTheDocument();
  });

  it('renders contact selector', () => {
    render(<InviteForm {...defaultProps} />);
    expect(screen.getByText('Select from your network')).toBeInTheDocument();
  });

  it('renders name and email fields', () => {
    render(<InviteForm {...defaultProps} />);
    expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email address/i })).toBeInTheDocument();
  });

  it('renders cancel and create invite buttons', () => {
    render(<InviteForm {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Invite')).toBeInTheDocument();
  });

  it('disables create invite button when fields are empty', () => {
    render(<InviteForm {...defaultProps} />);
    const createButton = screen.getByText('Create Invite');
    expect(createButton).toBeDisabled();
  });

  it('enables create invite button when fields are filled', () => {
    render(<InviteForm {...defaultProps} />);
    
    const nameField = screen.getByRole('textbox', { name: /first name/i });
    const emailField = screen.getByRole('textbox', { name: /email address/i });
    
    fireEvent.change(nameField, { target: { value: 'John Doe' } });
    fireEvent.change(emailField, { target: { value: 'john@example.com' } });
    
    const createButton = screen.getByText('Create Invite');
    expect(createButton).not.toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<InviteForm {...defaultProps} />);
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSubmit with form data when create invite is clicked', () => {
    render(<InviteForm {...defaultProps} />);
    
    const nameField = screen.getByRole('textbox', { name: /first name/i });
    const emailField = screen.getByRole('textbox', { name: /email address/i });
    
    fireEvent.change(nameField, { target: { value: 'John Doe' } });
    fireEvent.change(emailField, { target: { value: 'john@example.com' } });
    
    const createButton = screen.getByText('Create Invite');
    fireEvent.click(createButton);
    
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteeName: 'John Doe',
        inviteeEmail: 'john@example.com',
        inviterName: 'Oli S-B',
      })
    );
  });

  it('calls onSelectFromNetwork when network button is clicked', () => {
    render(<InviteForm {...defaultProps} />);
    const networkButton = screen.getByText('Select from your network');
    fireEvent.click(networkButton);
    expect(defaultProps.onSelectFromNetwork).toHaveBeenCalled();
  });

  it('prefills form with prefilledContact data', () => {
    const props = {
      ...defaultProps,
      prefilledContact: { name: 'Jane Smith', email: 'jane@example.com' }
    };
    render(<InviteForm {...props} />);
    
    expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

});