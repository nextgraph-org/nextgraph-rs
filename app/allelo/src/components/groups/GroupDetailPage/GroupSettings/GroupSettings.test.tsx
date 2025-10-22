import { render, screen, fireEvent } from '@testing-library/react';
import { GroupSettings } from './GroupSettings';
import type { Group } from '@/types/group';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toBeDisabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveValue(value: string): R;
      toBeChecked(): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}

const mockGroup: Group = {
  id: 'test-group',
  name: 'Test Group',
  memberCount: 10,
  memberIds: ['user1', 'user2'],
  createdBy: 'admin',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
  isPrivate: false,
  description: 'Test description'
};

describe('GroupSettings', () => {
  const mockProps = {
    group: mockGroup,
    onUpdateGroup: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<GroupSettings {...mockProps} isLoading={true} />);
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('renders group not found when group is null', () => {
    render(<GroupSettings {...mockProps} group={null} />);
    expect(screen.getByText('Group not found')).toBeInTheDocument();
  });

  it('renders group settings form', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByDisplayValue('Test Group')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
    expect(screen.getByText('Group Settings')).toBeInTheDocument();
  });

  it('calls onUpdateGroup when group name changes', () => {
    render(<GroupSettings {...mockProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Group');
    fireEvent.change(nameInput, { target: { value: 'Updated Group Name' } });
    
    expect(mockProps.onUpdateGroup).toHaveBeenCalledWith({ name: 'Updated Group Name' });
  });

  it('calls onUpdateGroup when description changes', () => {
    render(<GroupSettings {...mockProps} />);
    
    const descInput = screen.getByDisplayValue('Test description');
    fireEvent.change(descInput, { target: { value: 'Updated description' } });
    
    expect(mockProps.onUpdateGroup).toHaveBeenCalledWith({ description: 'Updated description' });
  });

  it('renders privacy settings', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    expect(screen.getByText('Private Group')).toBeInTheDocument();
  });

  it('renders notification settings', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Email notifications for new messages')).toBeInTheDocument();
    expect(screen.getByText('Push notifications for mentions')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByText('Leave Group')).toBeInTheDocument();
    expect(screen.getByText('Archive Group')).toBeInTheDocument();
  });

  it('shows info alert', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByText('Changes are saved automatically. Some settings may take a few minutes to take effect.')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<GroupSettings {...mockProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders all form sections', () => {
    render(<GroupSettings {...mockProps} />);
    
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });
});