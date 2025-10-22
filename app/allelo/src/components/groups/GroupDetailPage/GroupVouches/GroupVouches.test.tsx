import { render, screen, fireEvent } from '@testing-library/react';
import { GroupVouches } from './GroupVouches';

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

const mockVouches = [
  {
    id: '1',
    giver: 'John Doe',
    receiver: 'Jane Smith',
    message: 'Great work on the project!',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    type: 'vouch' as const,
    tags: ['teamwork', 'leadership']
  },
  {
    id: '2',
    giver: 'Alice Johnson',
    receiver: 'Bob Wilson',
    message: 'Thanks for the help!',
    timestamp: new Date('2023-01-02T12:00:00Z'),
    type: 'praise' as const
  }
];

describe('GroupVouches', () => {
  const mockProps = {
    vouches: mockVouches,
    onCreateVouch: jest.fn(),
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<GroupVouches {...mockProps} isLoading={true} />);
    expect(screen.getByText('Loading vouches...')).toBeInTheDocument();
  });

  it('renders vouches list', () => {
    render(<GroupVouches {...mockProps} />);
    
    expect(screen.getByText('Great work on the project!')).toBeInTheDocument();
    expect(screen.getByText('Thanks for the help!')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('vouched for')).toBeInTheDocument();
    expect(screen.getByText('praised')).toBeInTheDocument();
  });

  it('renders empty state when no vouches', () => {
    render(<GroupVouches {...mockProps} vouches={[]} />);
    
    expect(screen.getByText('No vouches yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to give recognition to a group member!')).toBeInTheDocument();
  });

  it('shows give vouch button', () => {
    render(<GroupVouches {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /give vouch/i })).toBeInTheDocument();
  });

  it('opens create vouch dialog when button is clicked', () => {
    render(<GroupVouches {...mockProps} />);
    
    const giveVouchButton = screen.getByRole('button', { name: /give vouch/i });
    fireEvent.click(giveVouchButton);
    
    expect(screen.getByText('Give Recognition')).toBeInTheDocument();
  });

  it('renders vouch tags', () => {
    render(<GroupVouches {...mockProps} />);
    
    expect(screen.getByText('teamwork')).toBeInTheDocument();
    expect(screen.getByText('leadership')).toBeInTheDocument();
  });

  it('shows vouch and praise chips correctly', () => {
    render(<GroupVouches {...mockProps} />);
    
    const chips = document.querySelectorAll('.MuiChip-root');
    const vouchChip = Array.from(chips).find(chip => chip.textContent?.includes('Vouch'));
    const praiseChip = Array.from(chips).find(chip => chip.textContent?.includes('Praise'));
    
    expect(vouchChip).toBeInTheDocument();
    expect(praiseChip).toBeInTheDocument();
  });

  it('creates vouch when dialog form is submitted', () => {
    render(<GroupVouches {...mockProps} />);
    
    // Open dialog
    const giveVouchButton = screen.getByRole('button', { name: /give vouch/i });
    fireEvent.click(giveVouchButton);
    
    // Fill form
    const receiverInput = screen.getByLabelText('To');
    const messageInput = screen.getByLabelText('Vouch Message');
    
    fireEvent.change(receiverInput, { target: { value: 'Test User' } });
    fireEvent.change(messageInput, { target: { value: 'Great job!' } });
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /give vouch/i });
    fireEvent.click(submitButton);
    
    expect(mockProps.onCreateVouch).toHaveBeenCalledWith({
      giver: 'You',
      receiver: 'Test User',
      message: 'Great job!',
      type: 'vouch',
      tags: []
    });
  });

  it('disables submit button when form is incomplete', () => {
    render(<GroupVouches {...mockProps} />);
    
    // Open dialog
    const giveVouchButton = screen.getByRole('button', { name: /give vouch/i });
    fireEvent.click(giveVouchButton);
    
    // Submit button should be disabled initially
    const submitButton = screen.getByRole('button', { name: /give vouch/i });
    expect(submitButton).toBeDisabled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<GroupVouches {...mockProps} ref={ref} />);
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('changes vouch type in dialog', () => {
    render(<GroupVouches {...mockProps} />);
    
    // Open dialog
    const giveVouchButton = screen.getByRole('button', { name: /give vouch/i });
    fireEvent.click(giveVouchButton);
    
    // Verify dialog is open and default state
    expect(screen.getByText('Give Recognition')).toBeInTheDocument();
    expect(screen.getByLabelText('Vouch Message')).toBeInTheDocument();
  });
});