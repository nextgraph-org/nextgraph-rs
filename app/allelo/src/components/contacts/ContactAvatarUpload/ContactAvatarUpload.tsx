import {useRef, ChangeEvent, useState, useEffect} from 'react';
import {Box, Button, Avatar, CircularProgress} from '@mui/material';
import {UilCamera} from '@iconscout/react-unicons';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactAvatarUploadProps {
  photoUrl?: string;
  photoNuri?: string;
  ormContact: SocialContact | undefined;
  initial?: string;
  isEditing?: boolean;
  size?: { xs: number; sm: number };
  forProfile?: boolean;
}

export const  ContactAvatarUpload = ({
                                      photoUrl,
                                      photoNuri,
                                      initial = '',
                                      isEditing = false,
                                      ormContact,
                                      size = {xs: 100, sm: 120},
                                      forProfile
                                    }: ContactAvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(photoUrl);

  // Load image from nuri when component mounts or photoNuri changes
  useEffect(() => {
    if (!ormContact) {
      return;
    }
    if (photoNuri && sessionId && !photoUrl) {
      setIsLoadingImage(true);
      imageService.getBlob(ormContact["@id"], photoNuri, true, sessionId)
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
    } else if (photoUrl) {
      setDisplayUrl(photoUrl);
    }
  }, [photoNuri, photoUrl, ormContact, sessionId]);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
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
          ormContact?.photo?.add({
            photoIRI: nuri,
            "@graph": "",
            "@id": "",
            photoUrl: ""
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
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderViewAvatar = () => {
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
            backgroundColor: 'primary.main',
            color: 'white',
          }}
        >
          <CircularProgress
            size={size.sm / 2}
            sx={{ color: 'white' }}
            variant={isUploading && uploadProgress > 0 ? "determinate" : "indeterminate"}
            value={uploadProgress}
          />
        </Box>
      );
    }

    if (forProfile)
      return <Avatar
        sx={{
          width: {xs: size.xs, sm: size.sm},
          height: {xs: size.xs, sm: size.sm},
          mb: 2,
          bgcolor: 'primary.main',
          fontSize: '3rem'
        }}
        alt="Profile"
        src={displayUrl}
      >
        {initial?.charAt(0)}
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
      }}
    >
      {!displayUrl && initial.charAt(0)}
    </Box>
  }


  return (
    <Box sx={{position: 'relative', display: 'inline-block'}}>
      {/* Avatar display */}
      {renderViewAvatar()}

      {isEditing && (
        <Box sx={{my: 2, textAlign: 'center'}}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<UilCamera size="16"/>}
            onClick={handleUploadClick}
            disabled={isUploading}
            sx={{fontSize: '0.75rem'}}
          >
            {isUploading
              ? `Uploading ${uploadProgress}%`
              : displayUrl ? 'Change Photo' : 'Upload Photo'}
          </Button>
        </Box>
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