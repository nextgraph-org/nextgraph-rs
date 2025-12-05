import {useState, useCallback, ChangeEvent, RefObject} from 'react';
import {imageService} from '@/services/imageService';
import {useNextGraphAuth} from "@/lib/nextgraph.ts";

interface Subject {
  "@id": string,
  "@graph"?: string
}

export const usePhotoUploadOrm = (
  subject: Subject,
  fileInputRef: RefObject<HTMLInputElement | null>,
  onUploaded: (nuri: string) => void,
) => {
  const nextGraphAuth = useNextGraphAuth();
  const sessionId = nextGraphAuth?.session?.sessionId;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    if (!subject) {
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
          subject["@id"],
          sessionId,
          (progress) => {
            const percent = Math.round((progress.current / progress.total) * 100);
            setUploadProgress(percent);
          }
        );

        if (nuri) {
          onUploaded(nuri);
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
  }, [subject, sessionId, fileInputRef, onUploaded]);

  return {
    isUploading,
    uploadProgress,
    handleFileSelect
  };
};