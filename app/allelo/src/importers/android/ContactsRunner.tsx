import React, {useState} from 'react';
import {Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions} from '@mui/material';
import {Button} from '@/components/ui';
import {checkPermissions, requestPermissions, importContacts} from '../../../../tauri-plugin-contacts-importer/guest-js';
import {processContactFromJSON} from '@/utils/socialContact/contactUtils';
import type {Contact} from '@/types/contact';
import {SourceRunnerProps} from "@/types/importSource";

export const ContactsRunner: React.FC<SourceRunnerProps> = ({open, onGetResult, onClose, onError}) => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleImportContacts = async () => {
    setLoading(true);
    setStatus('Checking permissions...');

    try {
      // Step 1: Check permissions
      const permissions = await checkPermissions();

      if (permissions.readContacts !== 'granted') {
        setStatus('Requesting permissions...');

        // Step 2: Request permissions if not granted
        const requestResult = await requestPermissions(['readContacts']);

        if (requestResult.readContacts !== 'granted') {
          // Step 3: Permission not granted - show error
          setStatus('❌ Permission not granted. Cannot access contacts.');
          setLoading(false);
          onError(new Error('Permission not granted'));
          return;
        }
      }

      // Step 4: Permission granted - import contacts
      setStatus('Permission granted! Importing contacts...');
      const result = await importContacts();
      const importedContactsJson = result.contacts || [];

      // Step 5: Process imported JSON using processContactFromJSON
      setStatus('Processing contacts...');
      const processedContacts: Contact[] = [];
      for (const contactJson of importedContactsJson) {
        try {
          const contact = await processContactFromJSON(contactJson, true);
          processedContacts.push(contact);
        } catch (err) {
          console.warn('Failed to process contact:', contactJson, err);
        }
      }

      setStatus('Saving contacts to Nextgraph...');
      try {
        // Nextgraph persistence
        onGetResult(processedContacts);
      } catch (err) {
        console.warn('Failed to add contacts to dataService: ', err);
      }

      setStatus(`Successfully imported and processed ${processedContacts.length} contacts! Redirecting to contacts...`);
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Allow NAO Access to Contacts</DialogTitle>
      <DialogContent>
        <Box sx={{py: 2}}>
          <Typography variant="body1" sx={{mb: 2}}>
            NAO would like to access your contacts to import them into your network.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
            This will help you connect with people you already know on NAO.
          </Typography>
          {status && (
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: 'text.primary'
              }}
            >
              {status}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleImportContacts}
          disabled={loading}
        >
          {loading
              ? 'Processing...'
              : 'Allow Access'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};