import {useState, useCallback, ChangeEvent, RefObject} from 'react';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export const useContactPhotoUploadOrm = (
  ormContact: SocialContact,
  fileInputRef: RefObject<HTMLInputElement | null>
) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
          ormContact?.photo?.forEach((el: any) => el.preferred = false);

          ormContact?.photo?.add({
            photoIRI: nuri,
            "@graph": "",
            "@id": "",
            preferred: true
          })
        }

        // Clear file input
        if (fileInputRef && fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [ormContact, sessionId, fileInputRef]);

  return {
    isUploading,
    uploadProgress,
    handleFileSelect
  };
};