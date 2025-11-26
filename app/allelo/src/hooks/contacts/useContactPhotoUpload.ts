import {useState, useCallback, ChangeEvent, RefObject} from 'react';
import {imageService} from '@/services/imageService';
import {useLdo, useNextGraphAuth} from "@/lib/nextgraph.ts";
import {Photo, SocialContact} from "@/.ldo/contact.typings.ts";
import {useContactData} from "@/hooks/contacts/useContactData.ts";

export const useContactPhotoUpload = (
  contact: SocialContact | undefined,
  fileInputRef: RefObject<HTMLInputElement | null>
) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;
  const {resource} = useContactData(contact && contact["@id"]);
  const {changeData, commitData} = useLdo();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!contact) {
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
          contact["@id"]!,
          sessionId,
          (progress) => {
            const percent = Math.round((progress.current / progress.total) * 100);
            setUploadProgress(percent);
          }
        );

        if (resource && !resource.isError && resource.type !== "InvalidIdentifierResouce") {
          const changedContactObj = changeData(contact, resource);
          if (changedContactObj.photo) {
            for (const item of changedContactObj.photo) {
              item.preferred = false;
            }
            const newEntry: Photo = {
              photoIRI: nuri,
              source: "user",
              preferred: true
            };
            changedContactObj.photo.add(newEntry);
            commitData(changedContactObj);
          }
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
  }, [contact, sessionId, resource, fileInputRef, changeData, commitData]);

  return {
    isUploading,
    uploadProgress,
    handleFileSelect
  };
};