import {useRef, useCallback} from 'react';
import {Box, Button, Avatar, CircularProgress} from '@mui/material';
import {UilCamera} from '@iconscout/react-unicons';
import {useContactData} from "@/hooks/contacts/useContactData.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {useContactPhoto} from "@/hooks/contacts/useContactPhoto.ts";
import {useContactPhotoUpload} from "@/hooks/contacts/useContactPhotoUpload.ts";
/*import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";
import {useContactPhotoOrm} from "@/hooks/contacts/useContactPhotoOrm.ts";
import {useContactPhotoUploadOrm} from "@/hooks/contacts/useContactPhotoUploadOrm.ts";*/


export interface ContactAvatarUploadProps {
  contactNuri?: string | undefined;
  initial?: string;
  isEditing?: boolean;
  size?: { xs: number; sm: number };
  forProfile?: boolean;
  useAvatar?: boolean;
}

export const ContactAvatarUpload = ({
                                      initial = '',
                                      isEditing = false,
                                      size = {xs: 100, sm: 120},
                                      forProfile,
                                      contactNuri,
                                      useAvatar = true,
                                    }: ContactAvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /*const {ormContact} = useContactOrm(contactNuri, forProfile);
  const avatar = resolveFrom(ormContact, 'photo');
  const {displayUrl, isLoadingImage} = useContactPhotoOrm(ormContact, avatar);
  const {isUploading, uploadProgress, handleFileSelect} = useContactPhotoUploadOrm(ormContact, fileInputRef);*/

  const {contact} = useContactData(contactNuri, forProfile);
  const avatar = resolveFrom(contact, 'photo');
  const {displayUrl, isLoadingImage} = useContactPhoto(contact, avatar);
  const {isUploading, uploadProgress, handleFileSelect} = useContactPhotoUpload(contact, fileInputRef);

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

    if (useAvatar)
      return <Avatar
        sx={{
          width: {xs: size.xs, sm: size.sm},
          height: {xs: size.xs, sm: size.sm},
          bgcolor: displayUrl ? 'transparent' : 'primary.main',
          fontSize: '3rem',
          cursor: isEditing ? "pointer" : "initial",
          mr: "16px"
        }}
        onClick={isEditing ? handleUploadClick : undefined}
        alt="Profile"
        src={displayUrl}
      >
        {!isLoadingImage && initial?.charAt(0)}
      </Avatar>
    return <Box
      sx={{
        width: {xs: size.xs, sm: size.sm},
        height: {xs: size.xs, sm: size.sm},
        borderRadius: '50%',
        backgroundImage: displayUrl ? `url(${displayUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: displayUrl ? 'transparent' : 'primary.main',
        color: 'white',
        fontSize: {xs: '2rem', sm: '3rem'},
        fontWeight: 'bold',
        flexShrink: 0,
        border: isEditing ? '2px dashed' : 'none',
        borderColor: 'primary.main',
        transition: 'all 0.2s ease-in-out',
        mr: "16px",
        cursor: isEditing ? "pointer" : "initial",
      }}
      onClick={isEditing ? handleUploadClick : undefined}
    >
      {!displayUrl && initial.charAt(0)}
    </Box>
  }, [displayUrl, initial, isEditing, isLoadingImage, isUploading, size.sm, size.xs, uploadProgress, useAvatar]);

  if (!contactNuri) {
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