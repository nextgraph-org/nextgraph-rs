import {useRef, ChangeEvent, useState, useEffect, useCallback} from 'react';
import {Box, Button, Avatar, CircularProgress} from '@mui/material';
import {UilCamera} from '@iconscout/react-unicons';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph";
import {useContactOrm} from "@/hooks/contacts/useContactOrm.ts";
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm.ts";

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
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;
  const {ormContact} = useContactOrm(contactNuri, forProfile);
  const avatar = resolveFrom(ormContact, 'photo');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(avatar?.photoUrl);

  // Load image from nuri when component mounts or photoNuri changes
  useEffect(() => {
    if (!ormContact) {
      return;
    }
    if (avatar?.photoIRI && sessionId && !avatar?.photoUrl) {
      setIsLoadingImage(true);
      imageService.getBlob(ormContact["@id"], avatar?.photoIRI, true, sessionId)
        .then((url) => {
          if (url && url !== true) {
            setDisplayUrl(url as string);
          }
        })
        .catch((error) => {
          console.error('Error loading image:', error);
        })
        .finally(() => {
          setIsLoadingImage(false);
        });
    } else if (avatar?.photoUrl) {
      setIsLoadingImage(false);
      setDisplayUrl(avatar?.photoUrl);
    } else {
      setIsLoadingImage(false);
    }
  }, [avatar, ormContact, sessionId]);

  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!ormContact) {
      return;
    }
    const file = event.target.files?.[0];
    if (file && sessionId) {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Upload file and get the nuri
        const nuri = await imageService.uploadFile(
          file,
          ormContact["@id"],
          sessionId,
          (progress) => {
            const percent = Math.round((progress.current / progress.total) * 100);
            setUploadProgress(percent);
          }
        );

        if (nuri) {
          ormContact?.photo?.forEach(el => el.preferred = false);

          ormContact?.photo?.add({
            photoIRI: nuri,
            "@graph": "",
            "@id": "",
            preferred: true
          })

          const url = await imageService.getBlob(ormContact["@id"], nuri, true, sessionId);
          if (url && url !== true) {
            setDisplayUrl(url as string);
          }
        }

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [ormContact, sessionId]);

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
        onClick={isEditing ? handleUploadClick: undefined}
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
      onClick={isEditing ? handleUploadClick: undefined}
    >
      {!displayUrl && initial.charAt(0)}
    </Box>
  }, [displayUrl, initial, isEditing, isLoadingImage, isUploading, size.sm, size.xs, uploadProgress, useAvatar]);

  if (!contactNuri) {
    return ;
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
            sx={{fontSize: '0.75rem', position: "absolute", top: 0, left: 80, p: 1, minWidth: 0, backgroundColor: "white"}}
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