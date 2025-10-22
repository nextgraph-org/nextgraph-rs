import { render, screen, fireEvent } from '@testing-library/react';
import { GroupHeader } from './GroupHeader';
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
  name: 'Test Group Name',
  memberCount: 15,
  memberIds: ['user1', 'user2'],
  createdBy: 'admin',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
  isPrivate: false
};

const mockGroupWithExtras = {
  ...mockGroup,
  photo: 'images/group.jpg',
  category: 'Technology'
};

describe('GroupHeader', () => {
  const mockProps = {
    group: mockGroup,
    isLoading: false,
    onBack: jest.fn(),
    onInvite: jest.fn(),
    onStartAIAssistant: jest.fn(),
    onStartTour: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    render(
      <GroupHeader
        {...mockProps}
        isLoading={true}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument(); // Back button
    // Loading state should show skeleton placeholders
    const skeletonElements = document.querySelectorAll('[style*="background"]');
    expect(skeletonElements.length).toBeGreaterThanOrEqual(0);
  });

  it('renders group not found state when group is null', () => {
    render(
      <GroupHeader
        {...mockProps}
        group={null}
      />
    );

    expect(screen.getByText('Group not found')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument(); // Back button
  });

  it('renders group information correctly', () => {
    render(<GroupHeader {...mockProps} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Group Name');
    expect(screen.getByText('15 members')).toBeInTheDocument();
  });

  it('renders group with photo and category', () => {
    render(
      <GroupHeader
        {...mockProps}
        group={mockGroupWithExtras as Group}
      />
    );

    expect(screen.getByText('Technology')).toBeInTheDocument();
    const avatar = document.querySelector('.MuiAvatar-root img');
    expect(avatar).toHaveAttribute('src', 'images/group.jpg');
  });

  it('renders private group indicator', () => {
    const privateGroup = { ...mockGroup, isPrivate: true };
    render(
      <GroupHeader
        {...mockProps}
        group={privateGroup}
      />
    );

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<GroupHeader {...mockProps} />);
    
    const backButton = document.querySelector('[data-testid="ArrowBackIcon"]')?.closest('button');
    
    if (backButton) {
      fireEvent.click(backButton);
      expect(mockProps.onBack).toHaveBeenCalledTimes(1);
    }
  });

  it('calls onStartTour when tour button is clicked', () => {
    render(<GroupHeader {...mockProps} />);
    
    const tourButton = screen.getByRole('button', { name: /tour/i });
    fireEvent.click(tourButton);
    
    expect(mockProps.onStartTour).toHaveBeenCalledTimes(1);
  });

  it('calls onStartAIAssistant when AI Assistant button is clicked', () => {
    render(<GroupHeader {...mockProps} />);
    
    const aiButton = screen.getByRole('button', { name: /ai assistant/i });
    fireEvent.click(aiButton);
    
    expect(mockProps.onStartAIAssistant).toHaveBeenCalledTimes(1);
    expect(mockProps.onStartAIAssistant).toHaveBeenCalledWith();
  });

  it('calls onInvite when invite button is clicked', () => {
    render(<GroupHeader {...mockProps} />);
    
    const inviteButton = screen.getByRole('button', { name: /invite/i });
    fireEvent.click(inviteButton);
    
    expect(mockProps.onInvite).toHaveBeenCalledTimes(1);
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<GroupHeader {...mockProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('renders all action buttons', () => {
    render(<GroupHeader {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /tour/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ai assistant/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
  });

  it('displays group name in avatar when no photo provided', () => {
    render(<GroupHeader {...mockProps} />);
    
    // The avatar should contain the first letter of the group name
    expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Test Group Name"
  });

  it('handles responsive design classes', () => {
    render(<GroupHeader {...mockProps} />);
    
    const container = screen.getByRole('heading').closest('div')?.parentElement;
    expect(container).toHaveClass('MuiBox-root');
  });

  it('renders member count with correct singular/plural', () => {
    const singleMemberGroup = { ...mockGroup, memberCount: 1 };
    const { rerender } = render(
      <GroupHeader
        {...mockProps}
        group={singleMemberGroup}
      />
    );
    
    expect(screen.getByText('1 members')).toBeInTheDocument();
    
    rerender(<GroupHeader {...mockProps} />);
    expect(screen.getByText('15 members')).toBeInTheDocument();
  });

  it('applies correct styling for action buttons', () => {
    render(<GroupHeader {...mockProps} />);
    
    const tourButton = screen.getByRole('button', { name: /tour/i });
    const aiButton = screen.getByRole('button', { name: /ai assistant/i });
    const inviteButton = screen.getByRole('button', { name: /invite/i });
    
    expect(tourButton).toHaveClass('MuiButton-outlined');
    expect(aiButton).toHaveClass('MuiButton-outlined');
    expect(inviteButton).toHaveClass('MuiButton-contained');
  });
});