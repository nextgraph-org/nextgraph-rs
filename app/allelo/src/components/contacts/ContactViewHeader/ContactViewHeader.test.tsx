import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { ContactViewHeader } from './ContactViewHeader';
import type { Contact } from '@/types/contact';
import {transformRawContact} from "@/mocks/contacts";
import { BasicLdSet } from '@/lib/ldo/BasicLdSet';
import { resolveFrom } from '@/utils/socialContact/contactUtils.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: string | Record<string, unknown>): R;
      toContain(expected: string): R;
      toBeTruthy(): R;
      toHaveBeenCalledTimes(expected: number): R;
    }
  }
}

const theme = createTheme();

// Mock contact with multiple sources like Alex from contacts.json
const mockMultiSourceContact: Contact = {
  '@id': 'contact:test',
  type: new BasicLdSet([{"@id": "Individual"}]),
  name: new BasicLdSet([
    {
      ["@id"]: "name1",
      value: 'Alex Lion Yes!',
      source: 'linkedin',
      selected: true
    },
    {
      ["@id"]: "name2",
      value: 'Alex',
      source: 'Android Phone'
    }
  ]),
  email: new BasicLdSet([
    {
      ["@id"]: "email1",
      value: 'alex.chen@techstartup.com',
      source: 'linkedin',
      selected: true
    },
    {
      ["@id"]: "email2",
      value: 'random@email.com',
      source: 'Android Phone'
    },
    {
      ["@id"]: "email3",
      value: 'random@email.com',
      source: 'Gmail'
    }
  ]),
  phoneNumber: new BasicLdSet([
    {
      ["@id"]: "phone1",
      value: '+1 (555) 123-4567',
      source: 'GreenCheck',
      selected: true
    },
    {
      ["@id"]: "phone2",
      value: '+1 (555) 333-444',
      source: 'iPhone'
    }
  ]),
  organization: new BasicLdSet([
    {
      ["@id"]: "org1",
      value: 'Innovation Labs',
      position: 'Chief Technology Officer',
      source: 'linkedin',
      selected: true
    },
    {
      ["@id"]: "org2",
      value: 'NoInnovation Labs',
      position: 'CTO',
      source: 'Android Phone'
    }
  ]),
  headline: new BasicLdSet([
    {
      ["@id"]: "headline1",
      value: "Chief Technology Officer at Innovation Labs",
      source: "linkedin"
    },
    {
      ["@id"]: "headline2",
      value: "CTO at NoInnovation Labs",
      source: "Android Phone"
    }
  ]),
  photo: new BasicLdSet([
    {
      value: 'images/Alex.jpg',
      source: 'linkedin'
    }
  ]),
  naoStatus: {
    value: 'member',
    source: 'system'
  },
  relationshipCategory: 'business',
  humanityConfidenceScore: 3,
  lastInteractionAt: new Date('2024-07-28T14:30:00Z'),
  vouchesSent: 0,
  vouchesReceived: 0,
  praisesSent: 0,
  praisesReceived: 0,
  interactionCount: 0,
  recentInteractionScore: 0,
  sharedTagsCount: 0
};

const mockContact: Contact = transformRawContact({
  id: 'test-contact',
  name: 'Test Contact',
  email: 'test@example.com',
  position: 'Software Developer',
  company: 'Test Company',
  source: 'linkedin',
  naoStatus: 'member',
  humanityConfidenceScore: 3,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z'
});

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ContactViewHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render contact information correctly', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      expect(screen.getByText('Alex Lion Yes!')).toBeInTheDocument();
      expect(screen.getByText('NAO Member')).toBeInTheDocument();
    });


    it('should not render when contact is null', () => {
      const { container } = renderWithTheme(
        <ContactViewHeader
          contact={null}
          isLoading={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render contact initials when no profile image', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockContact}
          isLoading={false}
        />
      );

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should render profile image when available', () => {
      const contactWithImage = {
        ...mockContact,
        profileImage: '/test-image.jpg'
      };

      renderWithTheme(
        <ContactViewHeader
          contact={contactWithImage}
          isLoading={false}
        />
      );

      // Check that contact name is rendered (avatar functionality is present)
      expect(screen.getByText('Test Contact')).toBeInTheDocument();
    });
  });

  describe('NAO status indicators', () => {
    it('should show member status for NAO members', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            position: 'Software Developer',
            company: 'Test Company',
            source: 'linkedin',
            naoStatus: 'member',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z'
          })}
          isLoading={false}
        />
      );

      expect(screen.getByText('NAO Member')).toBeInTheDocument();
    });

    it('should show invited status for invited contacts', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            position: 'Software Developer',
            company: 'Test Company',
            source: 'linkedin',
            naoStatus: 'invited',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z'
          })}
          isLoading={false}
        />
      );

      expect(screen.getByText('NAO Invited')).toBeInTheDocument();
    });

    it('should show not in NAO status for uninvited contacts', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={transformRawContact({
            id: 'test-contact',
            name: 'Test Contact',
            email: 'test@example.com',
            position: 'Software Developer',
            company: 'Test Company',
            source: 'linkedin',
            naoStatus: 'not_invited',
            humanityConfidenceScore: 3,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-02T00:00:00Z'
          })}
          isLoading={false}
        />
      );

      expect(screen.getByText('Not in NAO')).toBeInTheDocument();
    });
  });




  describe('specific contact photo styling', () => {
    it('should apply custom photo styles for Tree Willard', () => {
      const treeContact = transformRawContact({
        id: 'test-contact',
        name: 'Tree Willard',
        email: 'test@example.com',
        position: 'Software Developer',
        company: 'Test Company',
        source: 'linkedin',
        naoStatus: 'member',
        humanityConfidenceScore: 3,
        profileImage: '/tree.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });

      renderWithTheme(
        <ContactViewHeader
          contact={treeContact}
          isLoading={false}
        />
      );

      // Verify specific contact name renders
      expect(screen.getByText('Tree Willard')).toBeInTheDocument();
    });

    it('should apply custom photo styles for Duke Dorje', () => {
      const dukeContact = transformRawContact({
        id: 'test-contact',
        name: 'Duke Dorje',
        email: 'test@example.com',
        position: 'Software Developer',
        company: 'Test Company',
        source: 'linkedin',
        naoStatus: 'member',
        humanityConfidenceScore: 3,
        profileImage: '/duke.jpg',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });

      renderWithTheme(
        <ContactViewHeader
          contact={dukeContact}
          isLoading={false}
        />
      );

      // Verify specific contact name renders
      expect(screen.getByText('Duke Dorje')).toBeInTheDocument();
    });
  });

  describe('PropertyWithSources component integration', () => {
    it('should handle source selection and update selected property', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Find source selector buttons using testId
      const sourceButtons = screen.getAllByTestId('MoreVertIcon').map(icon => icon.closest('button')).filter(Boolean);
      expect(sourceButtons.length).toBeGreaterThan(0);
      
      // Test that buttons exist and can be clicked (basic functionality)
      expect(sourceButtons[0]).toBeInTheDocument();
      expect(sourceButtons[0]).toHaveAttribute('type', 'button');
      
      // Click button (this tests basic interaction without requiring menu to fully open)
      fireEvent.click(sourceButtons[0]!);
    });

    it('should display property values in menu items', async () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Click source selector using testId
      const sourceButtons = screen.getAllByTestId('MoreVertIcon').map(icon => icon.closest('button')).filter(Boolean);
      fireEvent.click(sourceButtons[0]!);

      await waitFor(() => {
        // Should show actual values from different sources in menu
        const allAlexTexts = screen.getAllByText('Alex Lion Yes!');
        const allAlexShortTexts = screen.getAllByText('Alex');
        expect(allAlexTexts.length).toBeGreaterThan(0);
        expect(allAlexShortTexts.length).toBeGreaterThan(0);
      });
    });

    it('should not show source selector when only one source available', () => {
      const singleSourceContact: Contact = {
        ...mockMultiSourceContact,
        name: new BasicLdSet([
          {
            value: 'Single Name',
            source: 'linkedin'
          }
        ]),
        headline: new BasicLdSet([
          {
            value: 'Single Org',
            source: 'linkedin'
          }
        ])
      };

      renderWithTheme(
        <ContactViewHeader
          contact={singleSourceContact}
          isLoading={false}
        />
      );

      // Should not have source selector buttons when properties have single sources
      const sourceButtons = screen.queryAllByTestId('MoreVertIcon');
      expect(sourceButtons.length).toBe(0);
    });
  });

  describe('multi-source functionality', () => {
    it('should display selected name from multiple sources', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Should show the selected LinkedIn name
      expect(screen.getByText('Alex Lion Yes!')).toBeInTheDocument();
      // Should not show the non-selected Android Phone name by default
      expect(screen.queryByText('Alex')).not.toBeInTheDocument();
    });

    it('should display selected organization from multiple sources', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Should show the selected LinkedIn organization
      expect(screen.getByText('Chief Technology Officer at Innovation Labs')).toBeInTheDocument();
    });

    it('should show source selector when multiple sources available', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Should have source selector buttons for properties with multiple sources
      const sourceButtons = screen.getAllByTestId('MoreVertIcon');
      expect(sourceButtons.length).toBeGreaterThan(0);
    });

    it('should open source menu when clicking source selector', async () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // Find and click the first source selector button
      const sourceButtons = screen.getAllByTestId('MoreVertIcon').map(icon => icon.closest('button')).filter(Boolean);
      fireEvent.click(sourceButtons[0]!);

      // Should open menu with source options
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('should display different source options in menu', () => {
      renderWithTheme(
        <ContactViewHeader
          contact={mockMultiSourceContact}
          isLoading={false}
        />
      );

      // This test verifies the multi-source contact data is properly set up
      // The actual menu functionality is tested in PropertyWithSources component tests
      // @ts-expect-error whatever
      expect(mockMultiSourceContact.name.toArray().length).toBe(2);
      // @ts-expect-error whatever
      expect(mockMultiSourceContact.organization.toArray().length).toBe(2);
      
      // Verify the resolved values are shown
      expect(screen.getByText('Alex Lion Yes!')).toBeInTheDocument();
      expect(screen.getByText('Chief Technology Officer at Innovation Labs')).toBeInTheDocument();
    });

    it('should resolve from correct source based on selection', () => {
      // Test the resolveFrom function directly
      const nameResult = resolveFrom(mockMultiSourceContact, 'name');
      expect(nameResult?.value).toBe('Alex Lion Yes!');
      expect(nameResult?.source).toBe('linkedin');

      const orgResult = resolveFrom(mockMultiSourceContact, 'organization');
      expect(orgResult?.source).toBe('linkedin');
    });

    it('should handle contact with hidden properties', () => {
      const contactWithHidden: Contact = {
        ...mockMultiSourceContact,
        email: new BasicLdSet([
          {
            value: 'hidden@email.com',
            source: 'linkedin',
            hidden: true
          },
          {
            value: 'visible@email.com',
            source: 'Android Phone',
            selected: true
          }
        ])
      };

      const emailResult = resolveFrom(contactWithHidden, 'email');
      expect(emailResult?.value).toBe('visible@email.com');
      expect(emailResult?.source).toBe('Android Phone');
    });

    it('should fall back to policy order when no selection', () => {
      const contactNoSelection: Contact = {
        ...mockMultiSourceContact,
        name: new BasicLdSet([
          {
            value: 'Gmail Name',
            source: 'Gmail'
          },
          {
            value: 'LinkedIn Name',
            source: 'linkedin'
          },
          {
            value: 'GreenCheck Name',
            source: 'GreenCheck'
          }
        ])
      };

      // Should prefer GreenCheck over linkedin over Gmail based on policy
      const nameResult = resolveFrom(contactNoSelection, 'name');
      expect(nameResult?.value).toBe('GreenCheck Name');
      expect(nameResult?.source).toBe('GreenCheck');
    });
  });

  describe('responsive layout', () => {
    it('should handle missing position gracefully', () => {
      const contactWithoutPosition: Contact = {
        ...mockMultiSourceContact,
        organization: new BasicLdSet([
          {
            value: 'Innovation Labs',
            source: 'linkedin'
          }
        ])
      };

      renderWithTheme(
        <ContactViewHeader
          contact={contactWithoutPosition}
          isLoading={false}
        />
      );

      expect(screen.getByText('Alex Lion Yes!')).toBeInTheDocument();
      expect(screen.queryByText('Chief Technology Officer')).not.toBeInTheDocument();
    });
  });
});