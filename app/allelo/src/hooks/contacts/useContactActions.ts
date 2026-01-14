import {useCallback} from 'react';

interface UseContactActionsProps {
  selectedContacts: string[];
  setIsMergeDialogOpen: (open: boolean) => void;
  setIsAssignRCardDialogOpen: (open: boolean) => void;
  clearSelectedContacts?: () => void;
}

interface UseContactActionsReturn {
  handleAutomaticDeduplication: () => void;
  handleMergeSelectedContacts: () => void;
  handleAssignRCard: () => void;
}

export const useContactActions = ({
  selectedContacts,
  setIsMergeDialogOpen,
  setIsAssignRCardDialogOpen,
  clearSelectedContacts,
}: UseContactActionsProps): UseContactActionsReturn => {

  const handleAutomaticDeduplication = useCallback(() => {
    clearSelectedContacts?.();
    setIsMergeDialogOpen(true);
  }, [clearSelectedContacts, setIsMergeDialogOpen]);

  const handleMergeSelectedContacts = useCallback(() => {
    if (selectedContacts.length > 1) {
      setIsMergeDialogOpen(true);
    }
  }, [selectedContacts.length, setIsMergeDialogOpen]);

  const handleAssignRCard = useCallback(() => {
    if (selectedContacts.length > 0) {
      setIsAssignRCardDialogOpen(true);
    }
  }, [selectedContacts.length, setIsAssignRCardDialogOpen]);

  return {
    handleAutomaticDeduplication,
    handleMergeSelectedContacts,
    handleAssignRCard,
  };
};