import {useState, useCallback, useRef} from "react";
import {Box, Typography, Alert, CircularProgress} from "@mui/material";
import {UilCloudUpload as CloudUploadIcon} from "@iconscout/react-unicons";
import {LINKEDIN_API_URL} from "@/config/importers";
import {LinkedInData} from "./linkedInTypes";

interface LinkedInDragDropFallbackProps {
  onSuccess: (data: LinkedInData) => void;
  onError: (error: Error) => void;
}

export function LinkedInDragDropFallback({onSuccess, onError}: LinkedInDragDropFallbackProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError('Please upload a ZIP file containing your LinkedIn data');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const response = await fetch(LINKEDIN_API_URL + '/api/li/upload-zip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data: LinkedInData = await response.json();

      if (!data.success) {
        throw new Error('Failed to parse LinkedIn data');
      }

      onSuccess(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      setError(errorMessage);
      onError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  }, [onSuccess, onError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Box sx={{py: 2}}>
      <Typography variant="body1" sx={{mb: 2}}>
        Upload your LinkedIn data archive to import your profile and connections.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>
        To download your LinkedIn data: Settings & Privacy → Data privacy → Get a copy of your data
      </Typography>

      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: 2,
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          borderStyle: 'dashed',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: loading ? 'grey.300' : 'primary.main',
            bgcolor: loading ? 'background.paper' : 'action.hover',
          },
        }}
        onClick={!loading ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          style={{display: 'none'}}
          disabled={loading}
        />

        {loading ? (
          <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
            <CircularProgress size={48}/>
            <Typography variant="body1">
              Processing your LinkedIn data...
            </Typography>
          </Box>
        ) : (
          <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
            <CloudUploadIcon size="48" style={{color: 'inherit'}}/>
            <Typography variant="body1">
              {selectedFile ? selectedFile.name : 'Drag and drop your LinkedIn ZIP file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              or click to browse
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
