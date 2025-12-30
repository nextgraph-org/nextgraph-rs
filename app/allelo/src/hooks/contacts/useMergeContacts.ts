interface UseMergeContactsReturn {
  getDuplicatedContacts: () => Promise<string[][]>;
  mergeContacts: (contactsIDs: string[]) => Promise<void>;
}

export function useMergeContacts(): UseMergeContactsReturn {

  const getDuplicatedContacts = async () => {
  };

  const mergeContacts = async (mergingContactIds: (string)[]) => {
  }

  return {
    getDuplicatedContacts,
    mergeContacts
  };
}