import {useState, useEffect} from 'react';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph.ts";

interface Subject {
  "@id": string
}

export const usePhotoOrm = (
  subject: Subject | undefined,
  photoIRI: string | undefined,
  fallbackUrl?: string
) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [displayUrl, setDisplayUrl] = useState<string | undefined>(fallbackUrl);

  useEffect(() => {
    if (!subject || !subject["@id"]) {
      return;
    }
    if (sessionId && photoIRI) {
      setIsLoadingImage(true);
      imageService.getBlob(subject["@id"], photoIRI, true, sessionId)
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
    } else if (fallbackUrl) {
      setIsLoadingImage(false);
      setDisplayUrl(fallbackUrl);
    } else {
      setIsLoadingImage(false);
    }
  }, [sessionId, subject, photoIRI, fallbackUrl]);

  return {displayUrl, isLoadingImage};
};