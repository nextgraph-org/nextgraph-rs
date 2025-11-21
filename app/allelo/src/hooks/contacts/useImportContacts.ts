import {useState, useEffect, useCallback} from 'react';
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts";
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

  useEffect(() => {
    const sources = ImportSourceRegistry.getAllSources();
    setImportSources(sources);
  }, []);

  const importContacts = useCallback(async (socialContacts: Contact[]) => {
    setImportProgress(0);
    setIsImporting(true);

    try {
      await saveContacts(socialContacts, (current, total) => {
        const progress = (current / total) * 100;
        setImportProgress(progress);
      });

      // Add a small delay to ensure NextGraph has processed the data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
      setIsImporting(false);
      onImportDone();
    } catch (error) {
      console.error('Import failed:', error);
      setIsImporting(false);
    }
  }, [onImportDone, saveContacts]);

  return {
    importSources,
    importContacts,
    importProgress,
    isLoading,
    isImporting
  };
};