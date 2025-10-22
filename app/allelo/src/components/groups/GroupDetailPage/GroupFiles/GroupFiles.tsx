import { Box, Typography, Button } from '@mui/material';

interface GroupFile {
  name: string;
  size: string;
  uploaded: string;
}

interface GroupFilesProps {
  files?: GroupFile[];
  isLoading?: boolean;
  onUploadFile?: (file: File) => void;
  onDownloadFile?: (fileName: string) => void;
}

const mockFiles: GroupFile[] = [
  { name: 'project-proposal-v2.pdf', size: '2.3 MB', uploaded: '2 hours ago' },
  { name: 'meeting-notes-jan.docx', size: '156 KB', uploaded: '1 day ago' },
  { name: 'network-diagram.png', size: '890 KB', uploaded: '3 days ago' }
];

export const GroupFiles = ({ 
  files = mockFiles, 
  isLoading, 
  onUploadFile, 
  onDownloadFile 
}: GroupFilesProps) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading files...</Typography>
      </Box>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Group Files</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Drop files here or click to browse
          </Typography>
          <input
            type="file"
            id="file-upload"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button variant="outlined" component="span" sx={{ mt: 1 }}>
              Choose Files
            </Button>
          </label>
        </Box>
        
        <Typography variant="subtitle2">Recent Files:</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {files.map((file, index) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box>
                <Typography variant="body2">{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{file.size} • {file.uploaded}</Typography>
              </Box>
              <Button 
                size="small" 
                onClick={() => onDownloadFile?.(file.name)}
              >
                Download
              </Button>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};