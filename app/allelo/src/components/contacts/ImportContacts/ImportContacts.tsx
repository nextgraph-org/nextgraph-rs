import React, {useCallback, useState} from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Dialog,
  LinearProgress
} from '@mui/material';
import {CloudDownload} from '@mui/icons-material';
import {useImportContacts} from '@/hooks/contacts/useImportContacts';
import {ImportSourceConfig} from "@/types/importSource.ts";
import {ImportSourceRegistry} from "@/utils/importSourceRegistry/importSourceRegistry.tsx";
import {Contact} from "@/types/contact.ts";

export const ImportContacts = () => {
  const {importSources, importProgress, isImporting, importContacts} = useImportContacts();
  const [selectedSource, setSelectedSource] = useState<ImportSourceConfig | null>(null);
  const [isRunnerOpen, setIsRunnerOpen] = useState(false);

  const handleImportClick = useCallback((source: ImportSourceConfig) => {
    setSelectedSource(source);
    setIsRunnerOpen(true);
  }, []);

  const handleRunnerClose = useCallback(() => {
    setIsRunnerOpen(false);
    setSelectedSource(null);
  }, []);

  const handleRunnerComplete = useCallback(async (contacts?: Contact[], callback?: () => void) => {
    if (contacts)
      await importContacts(contacts);
    if (callback)
      callback();
    console.log('Import completed:', contacts);
  }, [importContacts]);

  const handleRunnerError = (error: unknown) => {
    console.error('Import failed:', error);
    //handleRunnerClose();
  };

  const getSourceIcon = (sourceId: string) => {
    const icon = ImportSourceRegistry.getIcon(sourceId);
    if (icon) {
      return React.cloneElement(icon, {sx: {fontSize: 40}});
    }
    return <CloudDownload sx={{fontSize: 40}}/>;
  };

  return (
    <Box sx={{height: '100%'}}>
      <Box sx={{mb: 4}}>
        <Typography variant="h4" component="h1" gutterBottom sx={{fontWeight: 700}}>
          Import Your Contacts
        </Typography>
        <Typography variant="body1" sx={{color: 'text.secondary'}}>
          Choose a source to import your contacts from
        </Typography>
      </Box>

      <Box sx={{p: {xs: 2, md: 0}}}>
        <Grid container spacing={3}>
          {importSources.map((source) => (
            <Grid size={{xs: 12, md: 4}} key={source.type}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                    borderColor: 'primary.main',
                  }
                }}
              >
                <CardContent sx={{flexGrow: 1, textAlign: 'center', p: 3}}>
                  <Box sx={{mb: 3}}>
                    {getSourceIcon(source.type)}
                  </Box>
                  <Typography variant="h6" component="h2" gutterBottom sx={{fontWeight: 600}}>
                    {source.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{lineHeight: 1.6}}>
                    {source.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{justifyContent: 'center', p: 3, pt: 0}}>
                  <Button
                    variant="contained"
                    onClick={() => handleImportClick(source)}
                    disabled={!source.isAvailable}
                    startIcon={<CloudDownload/>}
                    sx={{borderRadius: 2}}
                  >
                    {source.customButtonName ? source.customButtonName : "Import from " + source.name}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Import source runner */}
      {selectedSource?.Runner && (
        <selectedSource.Runner
          open={isRunnerOpen}
          onGetResult={handleRunnerComplete}
          onClose={handleRunnerClose}
          onError={handleRunnerError}
        />
      )}

      {/* Full-screen importing overlay */}
      <Dialog
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
          <Typography variant="h6">
            Video Placeholder
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
};