import { render, screen, fireEvent } from '@testing-library/react';
import { JoinProcess } from '../JoinProcess';

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

const mockCustomProfileCard = {
  id: 'custom-1',
  name: 'Custom Card',
  description: 'Custom profile card description',
  color: '#ff6b6b',
  icon: 'Business'
};

const defaultProps = {
  selectedProfileCard: '',
  customProfileCard: null,
  onProfileCardSelect: jest.fn(),
  onEditProfileCard: jest.fn(), 
  onJoinGroup: jest.fn(),
};

describe('JoinProcess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile card selection header', () => {
    render(<JoinProcess {...defaultProps} />);
    expect(screen.getByText('Select Your Profile Card')).toBeInTheDocument();
  });


  it('renders custom profile card when provided', () => {
    render(<JoinProcess {...defaultProps} customProfileCard={mockCustomProfileCard} />);
    expect(screen.getByText('Custom Card')).toBeInTheDocument();
    expect(screen.getByText('Custom profile card description')).toBeInTheDocument();
  });

  it('calls onProfileCardSelect when card is clicked', () => {
    render(<JoinProcess {...defaultProps} />);
    fireEvent.click(screen.getByText('Business'));
    expect(defaultProps.onProfileCardSelect).toHaveBeenCalledWith('Business');
  });

  it('calls onEditProfileCard when settings button is clicked', () => {
    render(<JoinProcess {...defaultProps} />);
    const settingsButtons = screen.getAllByTestId('SettingsIcon');
    expect(settingsButtons.length).toBeGreaterThan(0);
    fireEvent.click(settingsButtons[0].parentElement!);
    expect(defaultProps.onEditProfileCard).toHaveBeenCalled();
  });

  it('shows join button disabled when no card selected', () => {
    render(<JoinProcess {...defaultProps} />);
    const joinButton = screen.getByText('Join Group');
    expect(joinButton).toBeDisabled();
  });

  it('enables join button when card is selected', () => {
    render(<JoinProcess {...defaultProps} selectedProfileCard="Business" />);
    const joinButton = screen.getByText('Join Group');
    expect(joinButton).not.toBeDisabled();
  });

  it('calls onJoinGroup when join button is clicked', () => {
    render(<JoinProcess {...defaultProps} selectedProfileCard="Business" />);
    fireEvent.click(screen.getByText('Join Group'));
    expect(defaultProps.onJoinGroup).toHaveBeenCalled();
  });

  it('shows check icon for selected card', () => {
    render(<JoinProcess {...defaultProps} selectedProfileCard="Business" />);
    const checkIcons = screen.getAllByTestId('CheckCircleIcon');
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
  });
});