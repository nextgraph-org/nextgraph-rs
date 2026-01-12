import {Box, Dialog, LinearProgress, Typography} from "@mui/material";

export const ImportingOverlay = ({isImporting, importProgress}: { isImporting: boolean, importProgress: number }) => {
  return <Dialog
    open={isImporting}
    fullScreen
    PaperProps={{
      sx: {
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column'
      }
    }}
  >
    <Box sx={{p: 3, borderBottom: 1, borderColor: 'divider'}}>
      <Typography variant="h5" sx={{mb: 2, fontWeight: 600}}>
        Importing Contacts
      </Typography>
      <LinearProgress
        variant="determinate"
        value={importProgress}
        sx={{height: 8, borderRadius: 4}}
      />
      <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
        {Math.round(importProgress)}% complete
      </Typography>
    </Box>

    <Box sx={{
      flex: 1,
      backgroundColor: 'grey.900',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <Typography variant="h6" color="white">
        Please wait...
      </Typography>
    </Box>
  </Dialog>
}