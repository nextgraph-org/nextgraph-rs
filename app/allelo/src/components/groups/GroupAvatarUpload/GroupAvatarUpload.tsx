import {useRef, useCallback} from 'react';
import {Box, Button, Avatar, CircularProgress} from '@mui/material';
import {UilCamera} from '@iconscout/react-unicons';
import {usePhotoOrm} from "@/hooks/usePhotoOrm.ts";
import {useGroupData} from "@/hooks/groups/useGroupData.ts";
import {usePhotoUploadOrm} from "@/hooks/usePhotoUploadOrm.ts";


export interface GroupAvatarUploadProps {
  groupNuri: string | undefined;
  initial?: string;
  isEditing: boolean;
  size?: { xs: number; sm: number };
}

export const GroupAvatarUpload = ({
                                    initial = '',
                                    isEditing,
                                    size = {xs: 100, sm: 120},
                                    groupNuri,
                                  }: GroupAvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {group} = useGroupData(groupNuri);
  const {displayUrl, isLoadingImage} = usePhotoOrm(group, group?.logoIRI);

  const onUploaded = useCallback((nuri: string) => {
    if (group) {
      group.logoIRI = nuri;
    }
  }, [group])


  const {isUploading, uploadProgress, handleFileSelect} = usePhotoUploadOrm(group, fileInputRef, onUploaded);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderViewAvatar = useCallback(() => {
    // Show loading spinner while loading or uploading
    if (isLoadingImage || isUploading) {
      return (
        <Box
          sx={{
            width: {xs: size.xs, sm: size.sm},
            height: {xs: size.xs, sm: size.sm},
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress
            size={size.sm / 2}
            sx={{color: 'black'}}
            variant={isUploading && uploadProgress > 0 ? "determinate" : "indeterminate"}
            value={uploadProgress}
          />
        </Box>
      );
    }

    return <Avatar
      sx={{
        width: {xs: size.xs, sm: size.sm},
        height: {xs: size.xs, sm: size.sm},
        bgcolor: displayUrl ? 'transparent' : 'primary.main',
        fontSize: '2rem',
        cursor: isEditing ? "pointer" : "initial",
        borderColor: 'primary.main',
        border: 2,
        fontWeight: 600,
      }}
      onClick={isEditing ? handleUploadClick : undefined}
      alt={initial}
      src={displayUrl}
    >
      {!isLoadingImage && initial?.charAt(0)}
    </Avatar>
  }, [displayUrl, initial, isEditing, isLoadingImage, isUploading, size.sm, size.xs, uploadProgress]);

  if (!groupNuri) {
    return;
  }


  return (
    <Box sx={{position: 'relative', display: 'inline-block'}}>
      {/* Avatar display */}
      {renderViewAvatar()}

      {isEditing && (
        <Button
          variant="outlined"
          size="small"
          onClick={handleUploadClick}
          disabled={isUploading}
          sx={{
            fontSize: '0.75rem',
            position: "absolute",
            top: 0,
            left: 80,
            p: 1,
            minWidth: 0,
            backgroundColor: "white"
          }}
        >
          {<UilCamera size="16"/>}
        </Button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{display: 'none'}}
      />
    </Box>
  );
};