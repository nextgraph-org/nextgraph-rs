import {useState, useEffect, useCallback} from 'react';
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts";
import {useNavigate} from "react-router-dom";
import {ImportSourceConfig} from "@/types/importSource";
import {ImportSourceRegistry} from "@/importers/importSourceRegistry";
import {Contact} from "@/types/contact";

export interface UseImportContactsReturn {
  importSources: ImportSourceConfig[];
  importContacts: (contacts: Contact[]) => Promise<void>;
  importProgress: number;
  isLoading: boolean;
  isImporting: boolean;
}

export const useImportContacts = (onImportDone: () => void): UseImportContactsReturn => {
  const [importSources, setImportSources] = useState<ImportSourceConfig[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {saveContacts} = useSaveContacts();
  const navigate = useNavigate();

  useEffect(() => {
    const sources = ImportSourceRegistry.getAllSources();
    setImportSources(sources);
  }, []);

  const importContacts = useCallback(async (socialContacts: Contact[]) => {
    setImportProgress(0);
    setIsImporting(true);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setIsImporting(false);
            onImportDone();
          }, 1000);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    try {
      await saveContacts(socialContacts);
      // Add a small delay to ensure NextGraph has processed the data
      await new Promise(resolve => setTimeout(resolve, 1000));
      // setImportedCount(socialContacts.length);
      setIsLoading(false);
    } catch (error) {
      console.error('Import failed:', error);
      clearInterval(progressInterval);
      setIsImporting(false);
    }
  }, [navigate, onImportDone, saveContacts]);

  return {
    importSources,
    importContacts,
    importProgress,
    isLoading,
    isImporting
  };
};