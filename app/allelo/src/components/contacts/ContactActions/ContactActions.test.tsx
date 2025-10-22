import { render, screen, fireEvent } from '@testing-library/react';
import { ContactActions } from './ContactActions';
import type { Contact } from '@/types/contact';
import {transformRawContact} from "@/mocks/contacts";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveBeenCalledTimes(expected: number): R;
      not: {
        toHaveBeenCalled(): R;
        toBeInTheDocument(): R;
      };
    }
  }
}

const mockContact: Contact = transformRawContact({
  id: 'test-contact',
  name: 'Test Contact',
  email: 'test@example.com',
  source: 'contacts',
  naoStatus: 'not_invited',
  humanityConfidenceScore: 3,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-02T00:00:00Z'
});

describe('ContactActions', () => {
  const mockOnInviteToNAO = jest.fn();
  const mockOnConfirmHumanity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when contact is null', () => {
      const { container } = render(
        <ContactActions
          contact={null}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show invite button for non-invited contacts', () => {
      render(
        <ContactActions
          contact={mockContact}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      expect(screen.getByText('Invite to NAO')).toBeInTheDocument();
    });

    it('should not show invite button for invited contacts', () => {
      const invitedContact = transformRawContact({
        id: 'test-contact',
        name: 'Test Contact',
        email: 'test@example.com',
        source: 'contacts',
        naoStatus: 'invited',
        humanityConfidenceScore: 3,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });

      render(
        <ContactActions
          contact={invitedContact}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      expect(screen.queryByText('Invite to NAO')).not.toBeInTheDocument();
    });

    it('should not show invite button for member contacts', () => {
      const memberContact = transformRawContact({
        id: 'test-contact',
        name: 'Test Contact',
        email: 'test@example.com',
        source: 'contacts',
        naoStatus: 'member',
        humanityConfidenceScore: 3,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z'
      });

      render(
        <ContactActions
          contact={memberContact}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      expect(screen.queryByText('Invite to NAO')).not.toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call onInviteToNAO when invite button is clicked', () => {
      render(
        <ContactActions
          contact={mockContact}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      fireEvent.click(screen.getByText('Invite to NAO'));
      expect(mockOnInviteToNAO).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have proper button labeling', () => {
      render(
        <ContactActions
          contact={mockContact}
          onInviteToNAO={mockOnInviteToNAO}
          onConfirmHumanity={mockOnConfirmHumanity}
        />
      );

      const inviteButton = screen.getByText('Invite to NAO');
      expect(inviteButton).toHaveAttribute('type', 'button');
    });
  });
});