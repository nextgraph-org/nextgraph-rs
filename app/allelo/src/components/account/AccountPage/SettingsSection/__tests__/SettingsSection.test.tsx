import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSection } from '../SettingsSection';
import type { RCardWithPrivacy } from '@/types/notification';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
    }
  }
}

const mockRCards: RCardWithPrivacy[] = [
  { 
    id: 'personal', 
    name: 'Personal', 
    isDefault: true, 
    createdAt: new Date(), 
    updatedAt: new Date(),
    privacySettings: {
      keyRecoveryBuddy: false,
      locationSharing: 'never',
      locationDeletionHours: 8,
      dataSharing: {
        posts: true,
        offers: true,
        wants: true,
        vouches: true,
        praise: true
      },
      reSharing: { enabled: true, maxHops: 3 }
    }
  },
  { 
    id: 'business', 
    name: 'Business', 
    isDefault: false, 
    createdAt: new Date(), 
    updatedAt: new Date(),
    privacySettings: {
      keyRecoveryBuddy: false,
      locationSharing: 'never',
      locationDeletionHours: 8,
      dataSharing: {
        posts: false,
        offers: true,
        wants: true,
        vouches: false,
        praise: false
      },
      reSharing: { enabled: false, maxHops: 1 }
    }
  },
];

const defaultProps = {
  rCards: mockRCards,
  selectedRCard: mockRCards[0],
  onRCardSelect: jest.fn(),
  onCreateRCard: jest.fn(),
  onEditRCard: jest.fn(),
  onDeleteRCard: jest.fn(),
  onUpdate: jest.fn()
};

describe('SettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Profile Cards section', () => {
    render(<SettingsSection {...defaultProps} />);
    expect(screen.getByText('Profile Cards')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
  });

  it('calls onRCardSelect when RCard is clicked', () => {
    render(<SettingsSection {...defaultProps} />);
    fireEvent.click(screen.getByText('Business'));
    expect(defaultProps.onRCardSelect).toHaveBeenCalledWith(mockRCards[1]);
  });

  it('renders privacy settings when no RCard is selected', () => {
    const propsWithoutSelection = {
      ...defaultProps,
      selectedRCard: null,
    };
    render(<SettingsSection {...propsWithoutSelection} />);
    expect(screen.getByText('Select a Profile Card')).toBeInTheDocument();
  });

  it('displays RCard names', () => {
    render(<SettingsSection {...defaultProps} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('Business')).toBeInTheDocument();
  });
});