import { Fab } from '@mui/material';
import { UilCheck } from '@iconscout/react-unicons';

interface FloatingActionsProps {
  isMultiSelectMode: boolean;
  selectedContactsCount: number;
  onCreateGroup: () => void;
}

export const FloatingActions = ({
  isMultiSelectMode,
  selectedContactsCount,
  onCreateGroup,
}: FloatingActionsProps) => {
  return (
    <>
      {/* Floating Action Button for Group Creation */}
      {isMultiSelectMode && selectedContactsCount > 0 && (
        <Fab
          color="primary"
          onClick={onCreateGroup}
          variant="extended"
          sx={{
            position: 'fixed',
            bottom: { xs: 90, md: 24 },
            right: 24,
            zIndex: 1000,
          }}
        >
          <UilCheck size="20" style={{ marginRight: 8 }} />
          Add to group
        </Fab>
      )}
    </>
  );
};