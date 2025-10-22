import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Box,
  LinearProgress
} from '@mui/material';
import {AutoFixHigh, CheckCircle} from '@mui/icons-material';

interface MergeDialogsProps {
  isMergeDialogOpen: boolean;
  isMerging: boolean;
  mergeProgress: number;
  useAI: boolean;
  isManualMerge: boolean;
  noDuplicatesFound: boolean;
  onCancelMerge: () => void;
  onConfirmMerge: () => void;
  onSetUseAI: (useAI: boolean) => void;
}

export const MergeDialogs = ({
                               isMergeDialogOpen,
                               isMerging,
                               mergeProgress,
                               useAI,
                               isManualMerge,
                               noDuplicatesFound,
                               onCancelMerge,
                               onConfirmMerge,
                               onSetUseAI
                             }: MergeDialogsProps) => {
  return (
    <>
      {/* Merge Dialog */}
      <Dialog
        open={isMergeDialogOpen}
        onClose={onCancelMerge}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Merge Duplicate Contacts?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{mb: 2}}>
            {isManualMerge
              ? <>
                This will merge the selected contacts into a single contact. <br/>
                <b>This action is irreversible and cannot be undone.</b>
              </>
              : "This will automatically identify and merge duplicate contacts in your network."
            }
          </Typography>
          {!isManualMerge && <FormControlLabel
              control={
                <Checkbox
                  checked={useAI}
                  onChange={(e) => onSetUseAI(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                  <AutoFixHigh sx={{fontSize: 16}}/>
                  Also use AI to merge duplicates?
                </Box>
              }
          />}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelMerge}>Cancel</Button>
          <Button onClick={onConfirmMerge} variant="contained">
            {isManualMerge ? "Merge selected contacts" : "Auto Merge"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Merge Progress Dialog */}
      <Dialog
        open={isMerging}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        <Box sx={{textAlign: 'center', maxWidth: 600, p: 4}}>
          {noDuplicatesFound ? (
            <>
              <Typography variant="h4" sx={{
                mb: 4,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                color: 'success.main'
              }}>
                <CheckCircle/>
                All Clean!
              </Typography>

              <Typography variant="body2" color="success.main">
                No duplicates found!
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h4" sx={{
                mb: 4,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
              }}>
                {useAI && <AutoFixHigh/>}
                Merging Contacts
              </Typography>

              <LinearProgress
                variant="determinate"
                value={mergeProgress}
                sx={{height: 8, borderRadius: 4, mb: 2, width: '100%'}}
              />

              <Typography variant="body1" sx={{mb: 4}}>
                {useAI
                  ? "Our AI is identifying duplicate contacts and combining them to give you a cleaner, more organized contact list."
                  : "We're identifying duplicate contacts and combining them to give you a cleaner, more organized contact list."
                }
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {Math.round(mergeProgress)}% complete
              </Typography>
            </>
          )}
        </Box>
      </Dialog>
    </>
  );
};