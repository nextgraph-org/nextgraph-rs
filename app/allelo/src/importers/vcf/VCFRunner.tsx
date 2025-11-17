import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  UilUpload,
  UilFileAlt,
  UilTimes,
  UilCheckCircle
} from '@iconscout/react-unicons';
import { SourceRunnerProps } from '@/types/importSource';
import { parseVCF } from '@/utils/vcfParser';
import { processContactFromJSON } from '@/utils/socialContact/contactUtils';
import { Contact } from '@/types/contact';

export function VCFRunner({ open, onGetResult, onClose, onError }: SourceRunnerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewContacts, setPreviewContacts] = useState<any[]>([]);
  const [processedCount, setProcessedCount] = useState(0);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.match(/\.(vcf|vcard)$/i)) {
        setError('Please select a valid VCF/vCard file (.vcf or .vcard)');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setPreviewContacts([]);
      setProcessedCount(0);

      // Preview the file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const contacts = parseVCF(content);
          setPreviewContacts(contacts.slice(0, 5)); // Show first 5 for preview
        } catch (err) {
          console.error('Error parsing VCF:', err);
          setError('Failed to parse VCF file. Please check the file format.');
        }
      };
      reader.readAsText(selectedFile);
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const contactsData = parseVCF(content);

          if (contactsData.length === 0) {
            setError('No contacts found in the VCF file');
            setIsProcessing(false);
            return;
          }

          // Process contacts in batches
          const contacts: Contact[] = [];
          const batchSize = 10;

          for (let i = 0; i < contactsData.length; i += batchSize) {
            const batch = contactsData.slice(i, i + batchSize);
            const batchPromises = batch.map(async (contactData) => {
              try {
                return await processContactFromJSON(contactData, false);
              } catch (err) {
                console.error('Error processing contact:', err);
                return null;
              }
            });

            const batchResults = await Promise.all(batchPromises);
            contacts.push(...batchResults.filter((c): c is Contact => c !== null));

            setProgress(Math.round(((i + batch.length) / contactsData.length) * 100));
            setProcessedCount(contacts.length);
          }

          // Call the callback with processed contacts
          onGetResult(contacts, () => {
            console.log(`VCF import complete: ${contacts.length} contacts imported`);
          });

          // Close the dialog after a short delay
          setTimeout(() => {
            onClose();
            setIsProcessing(false);
            setFile(null);
            setPreviewContacts([]);
            setProcessedCount(0);
            setProgress(0);
          }, 1000);
        } catch (err) {
          console.error('Error importing VCF:', err);
          setError('Failed to import contacts. Please try again.');
          onError(err);
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read the file. Please try again.');
        setIsProcessing(false);
      };

      reader.readAsText(file);
    } catch (err) {
      console.error('Error during import:', err);
      setError('An unexpected error occurred during import.');
      onError(err);
      setIsProcessing(false);
    }
  }, [file, onGetResult, onClose, onError]);

  const handleClose = useCallback(() => {
    if (!isProcessing) {
      setFile(null);
      setError(null);
      setPreviewContacts([]);
      setProcessedCount(0);
      setProgress(0);
      onClose();
    }
  }, [isProcessing, onClose]);

  const handleRemoveFile = useCallback(() => {
    setFile(null);
    setPreviewContacts([]);
    setProcessedCount(0);
    setError(null);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UilFileAlt size="24" />
            <Typography variant="h6">Import VCF/vCard File</Typography>
          </Box>
          {!isProcessing && (
            <IconButton onClick={handleClose} size="small">
              <UilTimes size="20" />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {!isProcessing ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a VCF or vCard file to import your contacts. The file can contain one or multiple contacts.
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                How to export your contacts:
              </Typography>
              <Typography variant="body2" component="div">
                • <strong>Google Contacts:</strong> Export → vCard format → Download from Google Drive if needed
                <br />
                • <strong>iPhone:</strong> Settings → Contacts → Export vCard → Save to Files or iCloud Drive
                <br />
                • <strong>Outlook:</strong> File → Open & Export → Import/Export → Export to a file → vCard
                <br />
                • <strong>Other apps:</strong> Look for Export, Download, or Backup options in your contacts app
              </Typography>
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {!file ? (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 4,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => document.getElementById('vcf-file-input')?.click()}
              >
                <UilUpload size="48" style={{ color: theme.palette.text.secondary }} />
                <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                  Click to select a VCF file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports .vcf and .vcard files
                </Typography>
                <input
                  id="vcf-file-input"
                  type="file"
                  accept=".vcf,.vcard"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </Box>
            ) : (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    backgroundColor: 'action.hover',
                    borderRadius: 2,
                    mb: 2
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UilFileAlt size="24" />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" onClick={handleRemoveFile}>
                    <UilTimes size="20" />
                  </IconButton>
                </Box>

                {previewContacts.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Preview (first 5 contacts):
                    </Typography>
                    <List dense>
                      {previewContacts.map((contact, index) => {
                        const name = contact.name?.[0]?.value || 'Unnamed Contact';
                        const email = contact.email?.[0]?.value || '';
                        return (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemText
                              primary={name}
                              secondary={email}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        );
                      })}
                    </List>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ) : (
          <Box>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <UilCheckCircle size="64" style={{ color: theme.palette.success.main }} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Importing Contacts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing {processedCount} contacts...
              </Typography>
            </Box>

            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                {progress}% complete
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!isProcessing && (
          <>
            <Button onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || isProcessing}
              startIcon={<UilUpload size="20" />}
            >
              Import Contacts
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
