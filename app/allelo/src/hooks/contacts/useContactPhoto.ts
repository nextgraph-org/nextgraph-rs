import { useState, useEffect } from 'react';
import { imageService } from '@/services/imageService';
import { Contact } from '@/types/contact.ts';
import {useNextGraphAuth} from "@/lib/nextgraph.ts";

interface PhotoData {
  photoIRI?: { "@id"?: string };
  photoUrl?: string;
}

export const useContactPhoto = (
  contact: Contact | undefined,
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

  return { displayUrl, isLoadingImage };
};