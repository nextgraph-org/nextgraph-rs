import {dataService} from '@/services/dataService';
import type {Group} from '@/types/group';
import {useEffect, useState, useCallback} from 'react';
import {useContactData} from "@/hooks/contacts/useContactData.ts";


export const useContactView = (id: string | null/*, refreshKey = 0*/) => {
  const [contactGroups, setContactGroups] = useState<Group[]>([]);
  const [humanityDialogOpen, setHumanityDialogOpen] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const {contact, isLoading: contactLoading, error: contactError, setContact, resource} = useContactData(id, false/*, refreshKey*/);

  // Load and filter groups when contact changes
  useEffect(() => {
    const loadGroups = async () => {
      if (!contact) {
        setContactGroups([]);
        return;
      }

      setGroupsError(null);

      try {
        const allGroups = await dataService.getGroups();

        // Filter groups that the contact belongs to
        const contactGroupsData = contact.internalGroup;
        const contactGroupIds = contactGroupsData ? Array.from(contactGroupsData).map(group => group.value) : [];
        const userGroups = allGroups.filter(group =>
          contactGroupIds.includes(group.id)
        );
        setContactGroups(userGroups);
      } catch (err) {
        console.error('Failed to load groups:', err);
        setGroupsError('Failed to load groups');
      }
    };

    loadGroups();
  }, [contact]);

  const toggleHumanityVerification = useCallback(async () => {
    if (!contact) return;

    const newScore = contact.humanityConfidenceScore === 5 ? 3 : 5;

    try {
      // Update locally immediately for responsiveness
      const updatedContact = {
        ...contact,
        humanityConfidenceScore: newScore,
        updatedAt: {
          '@id': `updated-at-${contact['@id']}`,
          valueDateTime: new Date().toISOString()
        }
      };

      setContact(updatedContact);

      // In a real app, this would make an API call
      await dataService.updateContact(contact['@id'] || '', {
        humanityConfidenceScore: newScore
      });
    } catch (error) {
      console.error('Failed to update humanity score:', error);
      // Revert on error - restore original contact
      setContact(contact);
    }
  }, [contact, setContact]);

  const inviteToNAO = useCallback(async () => {
    if (!contact) return;

    try {
      // Update locally immediately
      const updatedContact = {
        ...contact,
        naoStatus: {
          '@id': `nao-status-${contact['@id']}`,
          value: 'invited' as const
        },
        updatedAt: {
          '@id': `updated-at-${contact['@id']}`,
          valueDateTime: new Date().toISOString()
        }
      };

      setContact(updatedContact);

      // In a real app, this would make an API call
      await dataService.updateContact(contact['@id'] || '', {
        naoStatus: {
          '@id': `nao-status-${contact['@id']}`,
          value: 'invited'
        }
      });
    } catch (error) {
      console.error('Failed to invite to NAO:', error);
      // Revert on error
      setContact(contact);
    }
  }, [contact, setContact]);

  return {
    // Data
    contact,
    contactGroups,
    resource,

    // Loading states
    isLoading: contactLoading,

    // Errors
    error: contactError || groupsError,

    // UI state
    humanityDialogOpen,
    setHumanityDialogOpen,

    // Actions
    toggleHumanityVerification,
    inviteToNAO
  };
};