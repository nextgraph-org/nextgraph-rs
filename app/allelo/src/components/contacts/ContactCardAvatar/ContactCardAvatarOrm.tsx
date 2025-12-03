import {useCallback} from 'react';
import {Box, Avatar, CircularProgress} from '@mui/material';
import {resolveFrom} from "@/utils/socialContact/contactUtilsOrm";
import {SocialContact} from "@/.orm/shapes/contact.typings";
import {usePhotoOrm} from "@/hooks/usePhotoOrm";

export interface ContactAvatarUploadProps {
  contact: SocialContact | undefined;
  initial?: string;
  size?: { xs: number; sm: number };
}

export const ContactCardAvatarOrm = ({
                                       initial = '',
                                       size = {xs: 100, sm: 120},
                                       contact,
                                     }: ContactAvatarUploadProps) => {
  const photo = resolveFrom(contact, 'photo');

  const {displayUrl, isLoadingImage} = usePhotoOrm(contact, photo?.photoIRI, photo?.photoUrl);

  const renderViewAvatar = useCallback(() => {
    // Show loading spinner while loading or uploading
    if (isLoadingImage) {
      return (
        <Box
          sx={{
            width: {xs: size.xs, sm: size.sm},
            height: {xs: size.xs, sm: size.sm},
            bgcolor: 'white',
            border: 1,
            borderColor: 'primary.main',
            color: 'primary.main',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
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