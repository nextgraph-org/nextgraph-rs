import {useState, useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {Typography, Box} from '@mui/material';
import {useContacts} from '@/hooks/contacts/useContacts';
import {useContactDragDrop} from '@/hooks/contacts/useContactDragDrop';
import {
  ContactListHeader,
  ContactTabs,
  ContactFilters,
  ContactGrid,
  MergeDialogs,
  FloatingActions
} from '@/components/contacts';
import {ContactMap} from '@/components/ContactMap';
import {useMergeContacts} from "@/hooks/contacts/useMergeContacts";
import {useDashboardStore} from '@/stores/dashboardStore';

const ContactListPage = () => {
  const [tabValue, setTabValue] = useState(0);

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
    updateContact,
    reloadContacts
  } = useContacts({limit: tabValue === 2 ? 0 : 10});

  const {getDuplicatedContacts, mergeContacts} = useMergeContacts();


  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [noDuplicatesFound, setNoDuplicatesFound] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {setHeaderZone, clearHeaderZone} = useDashboardStore();

  const mode = searchParams.get('mode');
  const isSelectionMode = mode === 'select' || mode === 'invite' || mode === 'create-group';
  const isMultiSelectMode = mode === 'create-group';
  const returnTo = searchParams.get('returnTo');
  const groupId = searchParams.get('groupId');
  const groupData = searchParams.get('groupData');

  // Register header zone
  useEffect(() => {
    setHeaderZone(
      <ContactListHeader
        isSelectionMode={isSelectionMode}
        mode={mode}
        selectedContactsCount={selectedContacts.length}
      />
    );

    return () => {
      clearHeaderZone();
    };
  }, [isSelectionMode, mode, selectedContacts.length, setHeaderZone, clearHeaderZone]);

  // Clear selections when filters change
  useEffect(() => {
    setSelectedContacts([]);
  }, [filters]);

  useEffect(() => {
    const handleContactCategorized = (event: CustomEvent) => {
      const {contactId, category} = event.detail;
      updateContact(contactId, {relationshipCategory: category});
      setSelectedContacts([]);
    };

    window.addEventListener('contactCategorized', handleContactCategorized as EventListener);
    return () => {
      window.removeEventListener('contactCategorized', handleContactCategorized as EventListener);
    };
  }, [updateContact]);

  const handleContactClick = (contactId: string) => {
    if (isSelectionMode) return;
    navigate(`/contacts/${contactId}`);
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

  const handleSelectAll = () => {
    if (hasSelection) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contactNuris);
    }
  };

  const handleCreateGroup = async () => {
    if (mode === 'create-group' && groupData) {
      try {
        const parsedGroupData = JSON.parse(decodeURIComponent(groupData));
        const {dataService} = await import('@/services/dataService');
        const newGroup = await dataService.createGroup({
          name: parsedGroupData.name,
          description: parsedGroupData.description,
          logoPreview: parsedGroupData.logoPreview,
          tags: parsedGroupData.tags,
          members: selectedContacts
        });

        navigate(`/groups/${newGroup.id}/info`, {
          state: {newGroup: {...newGroup, members: selectedContacts}}
        });
      } catch (error) {
        console.error('Failed to create group:', error);
      }
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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);

  const dragDrop = useContactDragDrop({
    selectedContactNuris: selectedContacts
  });

  return (
    <Box sx={{
      width: '100%',
      height: tabValue === 2 ? '100%' : undefined,
      maxWidth: {xs: '100vw', md: '100%'},
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: {xs: '10px', md: 0},
      mx: {xs: 0, md: 'auto'},
      display: 'flex',
      flexDirection: 'column'
    }}>
      <ContactTabs
        tabValue={tabValue}
        onTabChange={handleTabChange}
        contactCount={contactNuris.length}
        isLoading={isLoading}
      />

      {tabValue === 2 && (
        <Box sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <ContactFilters
            filters={filters}
            onAddFilter={addFilter}
            onClearFilters={clearFilters}
            dragDrop={dragDrop}
            showFilters={false}
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
            <Box sx={{textAlign: 'center', py: 8}}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Loading map...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Building your contact map view
              </Typography>
            </Box>
          ) : contactNuris.length === 0 ? (
            <Box sx={{textAlign: 'center', py: 8}}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No contacts to map
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Import some contacts to see your map!
              </Typography>
            </Box>
          ) : (
            <Box sx={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              overflow: 'hidden',
              height: "100%"
            }}>
              <ContactMap
                contactNuris={contactNuris}
                onContactClick={(contact) => {
                  navigate(`/contacts/${contact["@id"]}`);
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {tabValue === 0 && (
        <>
          <ContactFilters
            filters={filters}
            onAddFilter={addFilter}
            onClearFilters={clearFilters}
            dragDrop={dragDrop}
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
            <Box sx={{textAlign: 'center', py: 8}}>
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
              {/* Global Drag Label */}
              {dragDrop.dragOverCategory && dragDrop.draggedContactNuri && (
                <Box sx={{
                  position: 'fixed',
                  top: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  zIndex: 10000,
                  pointerEvents: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}>
                  {dragDrop.getCategoryDisplayName(dragDrop.dragOverCategory)}
                </Box>
              )}

              <ContactGrid
                contactNuris={contactNuris}
                isLoading={isLoading}
                error={error}
                isLoadingMore={isLoadingMore}
                onLoadMore={loadMore}
                hasMore={hasMore}
                isSelectionMode={isSelectionMode}
                isMultiSelectMode={isMultiSelectMode}
                filters={filters}
                onContactClick={handleContactClick}
                onSelectContact={handleSelectContact}
                isContactSelected={isContactSelected}
                onSelectAll={handleSelectAll}
                hasSelection={hasSelection}
                totalCount={totalCount}
                contactCount={contactNuris.length}
                dragDrop={dragDrop}
                onSetIconFilter={setIconFilter}
                onMergeContacts={handleMergeContacts}
              />
            </Box>
          )}
        </>
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

      <FloatingActions
        isMultiSelectMode={isMultiSelectMode}
        selectedContactsCount={selectedContacts.length}
        onCreateGroup={handleCreateGroup}
      />
    </Box>
  );
};

export default ContactListPage;