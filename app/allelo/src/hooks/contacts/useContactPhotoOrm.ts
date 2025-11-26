import {useState, useEffect} from 'react';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

interface PhotoData {
  photoIRI?: string;
  photoUrl?: string;
}

export const useContactPhotoOrm = (
  contact: SocialContact | undefined,
  photo: PhotoData | undefined,
) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(photo?.photoUrl);

  useEffect(() => {
    if (!contact) {
      return;
    }
    if (sessionId && photo?.photoIRI) {
      setIsLoadingImage(true);
      imageService.getBlob(contact["@id"]!, photo.photoIRI, true, sessionId)
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

  return {displayUrl, isLoadingImage};
};