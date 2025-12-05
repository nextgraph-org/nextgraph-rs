import {dataService} from '@/services/dataService';
import {useState, useCallback, useMemo} from 'react';
import {useContactData} from "@/hooks/contacts/useContactData.ts";

export const useContactView = (id: string | null/*, refreshKey = 0*/) => {
  const [humanityDialogOpen, setHumanityDialogOpen] = useState(false);

  const {
    contact,
    isLoading: contactLoading,
    error: contactError,
    setContact,
    resource
  } = useContactData(id, false/*, refreshKey*/);

  const contactGroupsNuris = useMemo(() => contact?.internalGroup?.toArray().map((el) => {
    if (el.groupId && el.groupId["@id"]) {
      return el?.groupId["@id"];
    }
    return "";
  }), [contact?.internalGroup]);


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

  return {
    // Data
    contact,
    resource,
    contactGroupsNuris,
    // Loading states
    isLoading: contactLoading,

    // Errors
    error: contactError,

    // UI state
    humanityDialogOpen,
    setHumanityDialogOpen,

    // Actions
    toggleHumanityVerification,
  };
};