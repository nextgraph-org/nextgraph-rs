import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ContactGroups } from './ContactGroups';
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

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  useNavigate: () => mockNavigate,
}));

const mockGroups: Group[] = [
  {
    id: 'group1',
    name: 'Tech Team',
    memberCount: 5,
    memberIds: ['user1', 'user2'],
    createdBy: 'admin',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    isPrivate: false
  },
  {
    id: 'group2',
    name: 'Design Team',
    memberCount: 3,
    memberIds: ['user3', 'user4'],
    createdBy: 'admin',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    isPrivate: true
  },
  {
    id: 'group3',
    name: 'Marketing Squad',
    memberCount: 8,
    memberIds: ['user5', 'user6'],
    createdBy: 'admin',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    isPrivate: false
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ContactGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render groups correctly', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Member of 3 groups')).toBeInTheDocument();
      expect(screen.getByText('Tech Team')).toBeInTheDocument();
      expect(screen.getByText('Design Team')).toBeInTheDocument();
      expect(screen.getByText('Marketing Squad')).toBeInTheDocument();
    });

    it('should render singular form for single group', () => {
      renderWithRouter(<ContactGroups groups={[mockGroups[0]]} />);

      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Member of 1 group')).toBeInTheDocument();
      expect(screen.getByText('Tech Team')).toBeInTheDocument();
    });

    it('should not render when groups array is empty', () => {
      const { container } = renderWithRouter(<ContactGroups groups={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render all group chips as clickable', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      const chips = screen.getAllByRole('button');
      expect(chips).toHaveLength(3);
      
      chips.forEach(chip => {
        expect(chip).toBeInTheDocument();
      });
    });
  });

  describe('interactions', () => {
    it('should navigate to group page when chip is clicked', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      const techTeamChip = screen.getByText('Tech Team');
      fireEvent.click(techTeamChip);

      expect(mockNavigate).toHaveBeenCalledWith('/groups/group1');
    });

    it('should navigate to correct group pages for different chips', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      const designTeamChip = screen.getByText('Design Team');
      fireEvent.click(designTeamChip);
      expect(mockNavigate).toHaveBeenCalledWith('/groups/group2');

      const marketingSquadChip = screen.getByText('Marketing Squad');
      fireEvent.click(marketingSquadChip);
      expect(mockNavigate).toHaveBeenCalledWith('/groups/group3');

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple clicks correctly', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      const techTeamChip = screen.getByText('Tech Team');
      fireEvent.click(techTeamChip);
      fireEvent.click(techTeamChip);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenCalledWith('/groups/group1');
    });
  });

  describe('group count display', () => {
    it('should show correct count for multiple groups', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);
      expect(screen.getByText('Member of 3 groups')).toBeInTheDocument();
    });

    it('should show singular form for one group', () => {
      renderWithRouter(<ContactGroups groups={mockGroups.slice(0, 1)} />);
      expect(screen.getByText('Member of 1 group')).toBeInTheDocument();
    });

    it('should show correct count for two groups', () => {
      renderWithRouter(<ContactGroups groups={mockGroups.slice(0, 2)} />);
      expect(screen.getByText('Member of 2 groups')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes for chips', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      const chips = screen.getAllByRole('button');
      chips.forEach(chip => {
        expect(chip).toBeInTheDocument();
        expect(chip).toHaveAttribute('role', 'button');
      });
    });

    it('should have proper text hierarchy', () => {
      renderWithRouter(<ContactGroups groups={mockGroups} />);

      expect(screen.getByText('Groups')).toBeInTheDocument();
      expect(screen.getByText('Member of 3 groups')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle groups with long names', () => {
      const groupsWithLongNames: Group[] = [
        {
          ...mockGroups[0],
          name: 'Very Long Group Name That Might Cause Layout Issues'
        }
      ];

      renderWithRouter(<ContactGroups groups={groupsWithLongNames} />);

      expect(screen.getByText('Very Long Group Name That Might Cause Layout Issues')).toBeInTheDocument();
      expect(screen.getByText('Member of 1 group')).toBeInTheDocument();
    });

    it('should handle groups with special characters', () => {
      const groupsWithSpecialChars: Group[] = [
        {
          ...mockGroups[0],
          name: 'Group & Team (2023)'
        }
      ];

      renderWithRouter(<ContactGroups groups={groupsWithSpecialChars} />);

      expect(screen.getByText('Group & Team (2023)')).toBeInTheDocument();
    });
  });
});