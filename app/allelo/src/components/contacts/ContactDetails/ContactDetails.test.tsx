import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ContactDetails } from './ContactDetails';
import type { Contact } from '@/types/contact';
import {transformRawContact} from "@/mocks/contacts";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toBeChecked(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...expected: unknown[]): R;
      toHaveText(text: string): R;
    }
  }
}

const theme = createTheme();

const mockContact: Contact = transformRawContact({
  id: 'test-contact',
  name: 'Test Contact',
  email: 'test@example.com',
  source: 'contacts',
  naoStatus: 'member',
  humanityConfidenceScore: 3,
  createdAt: '2023-01-01T10:00:00Z',
  updatedAt: '2023-01-02T15:30:00Z',
  lastInteractionAt: '2023-01-03T12:15:00Z'
});

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ContactDetails', () => {
  const mockOnHumanityToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render additional information correctly', () => {
      renderWithTheme(
        <ContactDetails
          contact={mockContact}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('Level of Humanity')).toBeInTheDocument();
      expect(screen.getByText('NAO Network Status')).toBeInTheDocument();
    });

    it('should not render when contact is null', () => {
      const { container } = renderWithTheme(
        <ContactDetails
          contact={null}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render humanity score information', () => {
      renderWithTheme(
        <ContactDetails
          contact={mockContact}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Moderate')).toBeInTheDocument();
      expect(screen.getByText('Some verification indicators')).toBeInTheDocument();
      expect(screen.getByText('Score: 3/6')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render date information correctly', () => {
      renderWithTheme(
        <ContactDetails
          contact={mockContact}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('Last Interaction')).toBeInTheDocument();
      
      // Check that dates are formatted
      expect(screen.getByText(/January 1, 2023/)).toBeInTheDocument();
      expect(screen.getByText(/January 2, 2023/)).toBeInTheDocument();
      expect(screen.getByText(/January 3, 2023/)).toBeInTheDocument();
    });

    it('should not render last interaction when not provided', () => {
      const contactWithoutInteraction = {
        ...mockContact,
        lastInteractionAt: undefined
      };

      renderWithTheme(
        <ContactDetails
          contact={contactWithoutInteraction}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Added')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.queryByText('Last Interaction')).not.toBeInTheDocument();
    });
  });

  describe('humanity confidence score', () => {
    it('should render different scores correctly', () => {
      const testCases = [
        { score: 1, label: 'Very Low', description: 'Unverified online presence' },
        { score: 2, label: 'Low', description: 'Limited verification signals' },
        { score: 4, label: 'High', description: 'Multiple verification sources' },
        { score: 5, label: 'Verified Human', description: 'Confirmed human interaction' },
        { score: 6, label: 'Trusted', description: 'Highly trusted individual' }
      ];

      testCases.forEach(({ score, label, description }) => {
        const { unmount } = renderWithTheme(
          <ContactDetails
            contact={{ ...mockContact, humanityConfidenceScore: score }}
            onHumanityToggle={mockOnHumanityToggle}
          />
        );

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(description)).toBeInTheDocument();
        expect(screen.getByText(`Score: ${score}/6`)).toBeInTheDocument();

        unmount();
      });
    });

    it('should handle undefined humanity score', () => {
      const contactWithoutScore = {
        ...mockContact,
        humanityConfidenceScore: undefined
      };

      renderWithTheme(
        <ContactDetails
          contact={contactWithoutScore}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
      expect(screen.getByText('No humanity assessment')).toBeInTheDocument();
      expect(screen.getByText('Score: 0/6')).toBeInTheDocument();
    });

  });

  describe('NAO status indicators', () => {
    it('should show member status correctly', () => {
      renderWithTheme(
        <ContactDetails
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            source: 'contacts',
            naoStatus: 'member',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-02T15:30:00Z',
            lastInteractionAt: '2023-01-03T12:15:00Z'
          })}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('NAO Member')).toBeInTheDocument();
      expect(screen.getByText('This person is a verified member of the NAO network.')).toBeInTheDocument();
    });

    it('should show invited status correctly', () => {
      renderWithTheme(
        <ContactDetails
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            source: 'contacts',
            naoStatus: 'invited',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-02T15:30:00Z',
            lastInteractionAt: '2023-01-03T12:15:00Z'
          })}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('NAO Invited')).toBeInTheDocument();
      expect(screen.getByText('This person has been invited to join the NAO network.')).toBeInTheDocument();
    });

    it('should show not in NAO status correctly', () => {
      renderWithTheme(
        <ContactDetails
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            source: 'contacts',
            naoStatus: 'not_invited',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T10:00:00Z',
            updatedAt: '2023-01-02T15:30:00Z',
            lastInteractionAt: '2023-01-03T12:15:00Z'
          })}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByText('Not in NAO')).toBeInTheDocument();
      expect(screen.getByText('This person has not been invited to the NAO network yet.')).toBeInTheDocument();
    });
  });

  describe('progress bar calculation', () => {
    it('should calculate progress percentage correctly', () => {
      const testCases = [
        { score: 1, expected: '17%' },
        { score: 2, expected: '33%' },
        { score: 3, expected: '50%' },
        { score: 4, expected: '67%' },
        { score: 5, expected: '83%' },
        { score: 6, expected: '100%' }
      ];

      testCases.forEach(({ score, expected }) => {
        const { unmount } = renderWithTheme(
          <ContactDetails
            contact={{ ...mockContact, humanityConfidenceScore: score }}
            onHumanityToggle={mockOnHumanityToggle}
          />
        );

        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper switch labeling', () => {
      renderWithTheme(
        <ContactDetails
          contact={mockContact}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      expect(screen.getByLabelText('Human Verified')).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      renderWithTheme(
        <ContactDetails
          contact={mockContact}
          onHumanityToggle={mockOnHumanityToggle}
        />
      );

      const heading = screen.getByText('Additional Information');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H6');
    });
  });
});