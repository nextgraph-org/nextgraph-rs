import {Box, Typography, CircularProgress} from "@mui/material";
import {ContactFilters} from "../ContactFilters"
import {useMergeContacts} from "@/hooks/contacts/useMergeContacts.ts";
import {useCallback, useEffect, useState} from "react";
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {ContactGrid, MergeDialogs} from "@/components/contacts";
import {useNavigate} from "react-router-dom";
import {useContactActions} from "@/hooks/contacts/useContactActions";
import {AssignRCardDialog} from "@/components/contacts/AssignRCardDialog/AssignRCardDialog";

export const ContactListTab = ({
                                 manageMode,
                                 setManageMode,
                                 onSelectionChange,
                                 forGroup,
                                 handleGreencheckConnect
                               }: {
  manageMode: boolean;
  setManageMode: any;
  onSelectionChange?: (selectedContacts: string[]) => void;
  forGroup?: boolean;
  handleGreencheckConnect: () => void
}) => {
  const {
    contactNuris,
    isLoading,
    isLoadingMore,
    error,
    addFilter,
    clearFilters,
    filters,
    hasMore,
    loadMore,
    totalCount,
    setIconFilter,
    reloadContacts,
    handleContactsCategorized,
  } = useContacts({limit: 10});

  const {getDuplicatedContacts, mergeContacts} = useMergeContacts();

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [isAssignRCardDialogOpen, setIsAssignRCardDialogOpen] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [noDuplicatesFound, setNoDuplicatesFound] = useState(false);
  const navigate = useNavigate();

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedContacts);
  }, [selectedContacts, onSelectionChange]);

  //TODO: @mkslanc uncomment when invite works
  /*  useEffect(() => {
      if (forGroup) {
        addFilter("naoStatusFilter", "member");
      }
    }, [addFilter, forGroup]);*/

  // Clear selections when filters change
  useEffect(() => {
    setSelectedContacts([]);
  }, [filters]);

  const handleToggleContactSelection = useCallback((contact: string) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c === contact);
      if (isSelected) {
        return prev.filter(c => c !== contact);
      }
      return [...prev, contact];
    });
  }, []);

  const handleContactClick = useCallback((contactId: string) => {
    if (manageMode) {
      return handleToggleContactSelection(contactId);
    }
    navigate(`/contacts/${contactId}`);
  }, [handleToggleContactSelection, manageMode, navigate]);

  const hasSelection = selectedContacts.length > 0;

  const handleSelectAll = useCallback(() => {
    if (hasSelection) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactNuris);
    }
  }, [contactNuris, hasSelection]);

  const isContactSelected = useCallback((nuri: string) => {
    return selectedContacts.some(c => c === nuri);
  }, [selectedContacts]);

  const handleCloseMergeDialog = useCallback(() => {
    setIsMergeDialogOpen(false);
    setUseAI(false);
  }, []);

  const handleCloseAssignRCardDialog = useCallback(() => {
    setIsAssignRCardDialogOpen(false);
  }, []);

  const handleAssignRCardToContacts = useCallback(async (rcardId: string) => {
    await handleContactsCategorized(selectedContacts, rcardId);
    setIsAssignRCardDialogOpen(false);
    setSelectedContacts([]);
  }, [selectedContacts, handleContactsCategorized]);

  const clearSelectedContacts = useCallback(() => {
    setSelectedContacts([]);
  }, []);

  const {
    handleAutomaticDeduplication,
    handleMergeSelectedContacts,
    handleAssignRCard
  } = useContactActions({
    selectedContacts,
    setIsMergeDialogOpen,
    setIsAssignRCardDialogOpen,
    clearSelectedContacts,
  });

  const autoMerge = useCallback(() => {
    setIsMerging(true);
    setMergeProgress(0);
    setManageMode(false);
    (async () => {
      const duplicatedContacts = await getDuplicatedContacts();
      if (duplicatedContacts.length === 0) {
        setNoDuplicatesFound(true);
        setMergeProgress(100);
        setTimeout(() => {
          setIsMerging(false);
          setNoDuplicatesFound(false);
        }, 2000);
        return;
      }
      setMergeProgress(50);
      const interval = Math.ceil(50 / duplicatedContacts.length);
      for (const contactsToMerge of duplicatedContacts) {
        await mergeContacts(contactsToMerge);
        setMergeProgress(prev => Math.min(prev + interval, 99));
      }
      reloadContacts();
      setMergeProgress(100);
      setIsMerging(false);
    })();
  }, [getDuplicatedContacts, mergeContacts, reloadContacts, setManageMode]);

  const manualMerge = useCallback(() => {
    setIsMerging(true);
    setMergeProgress(0);
    setManageMode(false);

    // Simulate progress
    const interval = Math.ceil(100 / selectedContacts.length);
    const progressInterval = setInterval(() => {
      setMergeProgress(prev => Math.min(prev + interval, 99));
    }, 200);

    (async () => {
      await mergeContacts(selectedContacts);
      reloadContacts();
      clearInterval(progressInterval);
      setSelectedContacts([]);
      setMergeProgress(100);
      setIsMerging(false);
    })();
  }, [mergeContacts, reloadContacts, selectedContacts, setManageMode]);

  const handleConfirmMerge = useCallback(() => {
    setIsMergeDialogOpen(false);
    return selectedContacts.length > 1 ? manualMerge() : autoMerge();
  }, [autoMerge, manualMerge, selectedContacts.length]);

  return <>
    <ContactFilters
      filters={filters}
      onAddFilter={addFilter}
      onClearFilters={clearFilters}
      inManageMode={manageMode && !forGroup}
      onSelectAll={handleSelectAll}
      hasSelection={hasSelection}
      totalCount={totalCount}
      contactCount={contactNuris.length}
      onClaimAccounts={handleGreencheckConnect}
      onMergeContacts={handleMergeSelectedContacts}
      onAutomaticDeduplication={handleAutomaticDeduplication}
      onAssignRCard={handleAssignRCard}
    />

    {error ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="error" gutterBottom>
          Error loading contacts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {error.message}
        </Typography>
      </Box>
    ) : isLoading ? (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        gap: 2
      }}>
        <CircularProgress size={48}/>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Loading contacts...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we fetch your contacts
        </Typography>
      </Box>
    ) : contactNuris.length === 0 ? (
      <Box sx={{textAlign: 'center', py: 8}}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {(filters.searchQuery || '') ? 'No contacts found' : 'No contacts yet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {(filters.searchQuery || '') ? 'Try adjusting your search terms.' : 'Import some contacts to get started!'}
        </Typography>
      </Box>
    ) : (
      <Box sx={{
        display: 'flex',
        flexDirection: {xs: 'column', md: 'row'},
        gap: {xs: 2, md: 3},
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative'
      }}>

        <ContactGrid
          contactNuris={contactNuris}
          isLoading={isLoading}
          error={error}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
          hasMore={hasMore}
          filters={filters}
          onContactClick={handleContactClick}
          onSelectContact={handleToggleContactSelection}
          isContactSelected={isContactSelected}
          selectedContacts={selectedContacts}
          onSetIconFilter={setIconFilter}
          inManageMode={manageMode}
        />
      </Box>
    )}

    <MergeDialogs
      isMergeDialogOpen={isMergeDialogOpen}
      isMerging={isMerging}
      mergeProgress={mergeProgress}
      useAI={useAI}
      isManualMerge={selectedContacts.length > 1}
      noDuplicatesFound={noDuplicatesFound}
      onCancelMerge={handleCloseMergeDialog}
      onConfirmMerge={handleConfirmMerge}
      onSetUseAI={setUseAI}
    />

    <AssignRCardDialog
      open={isAssignRCardDialogOpen}
      selectedContactsCount={selectedContacts.length}
      onClose={handleCloseAssignRCardDialog}
      onAssign={handleAssignRCardToContacts}
    />
  </>
}