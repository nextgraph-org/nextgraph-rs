import {Box, Typography, CircularProgress} from "@mui/material";
import {ContactFilters} from "../ContactFilters"
import {useMergeContacts} from "@/hooks/contacts/useMergeContacts.ts";
import {useCallback, useEffect, useState} from "react";
import {useContacts} from "@/hooks/contacts/useContacts.ts";
import {ContactGrid, MergeDialogs} from "@/components/contacts";
import {DragEndEvent, DragOverlay, DragStartEvent, useDndMonitor} from "@dnd-kit/core";
import {ContactCard} from "@/components/contacts/ContactCard";
import {useNavigate} from "react-router-dom";
import {useSearchParams} from "react-router-dom";

export const ContactListTab = ({
  manageMode,
  setManageMode,
  onSelectionChange,
  forGroup
}: {
  manageMode: boolean;
  setManageMode: any;
  onSelectionChange?: (selectedContacts: string[]) => void;
  forGroup?: boolean;
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
    handleContactsCategorized
  } = useContacts({limit: 10});

  const {getDuplicatedContacts, mergeContacts} = useMergeContacts();

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [noDuplicatesFound, setNoDuplicatesFound] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const mode = searchParams.get('mode');
  const isSelectionMode = mode === 'select' || mode === 'create-group';


  const returnTo = searchParams.get('returnTo');
  const groupId = searchParams.get('groupId');

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedContacts);
  }, [selectedContacts, onSelectionChange]);

  useEffect(() => {
    if (forGroup) {
      addFilter("naoStatusFilter", "member");
    }
  }, [addFilter, forGroup]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedContacts([]);
  }, [filters]);

  const handleContactClick = (contactId: string) => {
    if (manageMode) {
      return handleSelectContact(contactId);
    }

    if (isSelectionMode) return;
    if (mode === 'invite' && returnTo === 'group-info' && groupId) {
      const inviteParams = new URLSearchParams();
      inviteParams.set('groupId', groupId);
      inviteParams.set('inviteeNuri', contactId);
      inviteParams.set('inviterName', 'Oli S-B');
      navigate(`/invite?${inviteParams.toString()}`);
    } else {
      navigate(`/contacts/${contactId}`);
    }
  };

  const handleSelectContact = (nuri: string) => {
    if (mode === 'create-group') {
      handleToggleContactSelection(nuri);
    } else if (mode === 'invite' && returnTo === 'group-info' && groupId) {
      const inviteParams = new URLSearchParams();
      inviteParams.set('groupId', groupId);
      inviteParams.set('inviteeNuri', nuri);
      inviteParams.set('inviterName', 'Oli S-B');
      navigate(`/invite?${inviteParams.toString()}`);
    } else {
      handleToggleContactSelection(nuri);
    }

    if (returnTo === 'group-invite' && groupId) {
      navigate(`/groups/${groupId}?selectedContactNuri=${encodeURIComponent(nuri)}`);
      return;
    }

    if (returnTo === 'group-info' && groupId) {
      navigate(`/groups/${groupId}/info?selectedContactNuri=${encodeURIComponent(nuri)}`);
    }
  };

  const handleToggleContactSelection = (contact: string) => {
    setSelectedContacts(prev => {
      const isSelected = prev.some(c => c === contact);
      if (isSelected) {
        return prev.filter(c => c !== contact);
      }
      return [...prev, contact];
    });
  };

  const hasSelection = selectedContacts.length > 0;

  const handleDragEndEvent = useCallback((event: DragEndEvent) => {
    const activeType = event.active.data?.current?.type;
    const overType = event.over?.data?.current?.type;

    if (activeType === 'contact' && overType === 'rcard') {
      const rcardId = event.over?.data?.current?.rcardId as string | undefined;

      if (!rcardId) {
        return;
      }

      const contactIds = event.active.data?.current?.contactIds as string[] | undefined;
      const ids = contactIds && contactIds.length > 0 ? contactIds : [String(event.active.id)];
      const uniqueIds = Array.from(new Set(ids));

      handleContactsCategorized(uniqueIds, rcardId).then(() => setSelectedContacts([]));
    }

  }, [handleContactsCategorized]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data?.current?.type === 'contact') {
      setActiveDragId(String(event.active.id));
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    handleDragEndEvent(event);
    setActiveDragId(null);
  }, [handleDragEndEvent]);

  useDndMonitor({
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
  });

  const handleSelectAll = () => {
    if (hasSelection) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactNuris);
    }
  };

  const isContactSelected = (nuri: string) => {
    return selectedContacts.some(c => c === nuri);
  };

  const handleMergeContacts = () => setIsMergeDialogOpen(true);

  const handleCloseMergeDialog = () => {
    setIsMergeDialogOpen(false);
    setUseAI(false);
  };

  const handleConfirmMerge = () => {
    setIsMergeDialogOpen(false);
    return selectedContacts.length > 1 ? manualMerge() : autoMerge();
  };

  const autoMerge = () => {
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
  }

  const manualMerge = () => {
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
  }

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
      onMergeContacts={handleMergeContacts}
      isSelectionMode={isSelectionMode}
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
        <CircularProgress size={48} />
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
          isSelectionMode={isSelectionMode}
          filters={filters}
          onContactClick={handleContactClick}
          onSelectContact={handleSelectContact}
          isContactSelected={isContactSelected}
          selectedContacts={selectedContacts}
          onSetIconFilter={setIconFilter}
          inManageMode={manageMode || mode === 'create-group'}
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

    <DragOverlay dropAnimation={null}>
      {activeDragId ? (
        <ContactCard
          nuri={activeDragId}
          isSelectionMode={false}
          onContactClick={() => {
          }}
          onSetIconFilter={() => {
          }}
        />
      ) : null}
    </DragOverlay>
  </>
}