import React, {useCallback, useState} from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton
} from '@mui/material';
import {UilArrowLeft, UilCloudDownload} from '@iconscout/react-unicons';
import {useImportContacts} from '@/hooks/contacts/useImportContacts';
import {ImportSourceConfig} from "@/types/importSource";
import {ImportSourceRegistry} from "@/importers/importSourceRegistry";
import {useNavigate} from "react-router-dom";
import {ImportingOverlay} from "@/components/contacts/ImportContacts/ImportingOverlay.tsx";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export const ImportContacts = () => {
  const navigate = useNavigate();

  const onImportDone = useCallback(() => {
    navigate('/contacts');
  }, [navigate]);
  
  const {importSources, importProgress, isImporting, importContacts} = useImportContacts(onImportDone);
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

  const handleRunnerComplete = useCallback(async (contacts?: SocialContact[], callback?: () => void) => {
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
    return <UilCloudDownload size="40"/>;
  };

  const handleBackClick = () => {
    navigate('/contacts');
  };

  return (
    <Box sx={{height: '100%', p: 0}}>
      <Box sx={{mb: 4}}>
        <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden', display: "flex", alignItems: 'center', gap: 1, pb: 2}}>
          <IconButton
            onClick={handleBackClick}
            sx={{
              p: 0.5,
              color: 'text.primary',
              mr: 3
            }}
          >
            <UilArrowLeft size="20"/>
          </IconButton>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: {xs: 0, md: 0},
              fontSize: {xs: '1.5rem', md: '2.125rem'},
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Import Your Contacts
          </Typography>
        </Box>
        <Typography variant="body1" sx={{color: 'text.secondary', p: 1}}>
          Choose a source to import your contacts from
        </Typography>
      </Box>

      <Box sx={{p: {xs: 1, md: 0}}}>
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
                    startIcon={<UilCloudDownload size="20"/>}
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
      <ImportingOverlay isImporting={isImporting} importProgress={importProgress}/>
    </Box>
  );
};