import {useState, useEffect, useCallback} from 'react';
import {Box, Avatar, CircularProgress} from '@mui/material';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph";
import {resolveFrom} from "@/utils/socialContact/contactUtils.ts";
import {Contact} from "@/types/contact.ts";

export interface ContactAvatarUploadProps {
  contact: Contact | undefined;
  initial?: string;
  size?: { xs: number; sm: number };
}

export const ContactCardAvatar = ({
                                    initial = '',
                                    size = {xs: 100, sm: 120},
                                    contact,
                                  }: ContactAvatarUploadProps) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;
  const photo = resolveFrom(contact, 'photo');

  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(photo?.photoUrl);

  useEffect(() => {
    if (!contact) {
      return;
    }
    if (sessionId && photo?.photoIRI?.["@id"]) {
      setIsLoadingImage(true);
      imageService.getBlob(contact["@id"]!, photo.photoIRI?.["@id"], true, sessionId)
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
    } else if (photo?.photoUrl) {
      setIsLoadingImage(false);
      setDisplayUrl(photo?.photoUrl);
    } else {
      setIsLoadingImage(false);
    }
  }, [sessionId, contact, photo]);

  const renderViewAvatar = useCallback(() => {
    // Show loading spinner while loading or uploading
    if (isLoadingImage) {
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
            variant={"indeterminate"}
          />
        </Box>
      );
    }

    return <Avatar
      sx={{
        width: {xs: size.xs, sm: size.sm},
        height: {xs: size.xs, sm: size.sm},
        bgcolor: displayUrl ? 'transparent' : 'primary.main',
        fontSize: '3rem',
        mr: "16px"
      }}
      alt="Profile"
      src={displayUrl}
    >
      {!isLoadingImage && initial?.charAt(0)}
    </Avatar>
  }, [displayUrl, initial, isLoadingImage, size.sm, size.xs]);

  if (!contact) {
    return;
  }


  return (
    <Box sx={{position: 'relative', display: 'inline-block'}}>
      {renderViewAvatar()}
    </Box>
  );
};