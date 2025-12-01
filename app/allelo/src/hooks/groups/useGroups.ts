import {useState, useEffect, useCallback} from 'react';
import type {SortParams} from '@/types/contact';
import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {groupService} from "@/services/groupService.ts";

export interface GroupFilters extends SortParams {
  searchQuery?: string;
}

const defaultFilters: GroupFilters = {
  searchQuery: '',
  sortBy: 'title',
  sortDirection: 'desc',
};

export interface UseGroupsParams {
  limit?: number;
  initialFilters?: Partial<GroupFilters>;
}

interface useGroupsReturn {
  groupsNuris: string[]
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  addFilter: (key: keyof GroupFilters, value: GroupFilters[keyof GroupFilters]) => void;
  clearFilters: () => void;
  filters: GroupFilters;
  hasMore: boolean;
  loadMore: () => void;
  totalCount: number;
  reloadGroups: () => void;
}

export const useGroups = ({limit = 10, initialFilters}: UseGroupsParams = {}): useGroupsReturn => {
  const [groupsNuris, setGroupsNuris] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<GroupFilters>(() => ({
    ...defaultFilters,
    ...initialFilters
  }));

  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const hasMore = groupsNuris.length < totalCount;

  const loadNextGraphContacts = useCallback(async (page: number): Promise<string[]> => {
    if (!session || !session.ng) {
      return [];
    }

    const {
      searchQuery = '',
      sortBy = 'title',
      sortDirection = 'asc',
    } = filters;

    const filterParams = new Map<string, string>();
    if (searchQuery) {
      filterParams.set('fts', searchQuery);
    }

    const offset = page * limit;
    const groupsIDsResult = await groupService.getGroupIDs(session, limit, offset,
      undefined, undefined, [{sortBy, sortDirection}], filterParams);
    const groupsCountResult = await groupService.getGroupsCount(session, filterParams);

    // @ts-expect-error TODO output format of ng sparql query
    const totalContactsInDB = groupsCountResult.results.bindings[0].totalCount.value as number;

    setTotalCount(totalContactsInDB);

    //TODO: this should be changed to another store
    const containerOverlay = session.privateStoreId!.substring(46);
    // @ts-expect-error TODO output format of ng sparql query
    return groupsIDsResult.results.bindings.map(
      (binding) => binding.groupUri.value + containerOverlay
    );
  }, [session, filters, limit]);

  const addFilter = useCallback((key: keyof GroupFilters, value: GroupFilters[keyof GroupFilters]) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...defaultFilters
    }));
  }, []);

  const loadGroups = useCallback(async (page: number) => {
    try {
      const nuris = await loadNextGraphContacts(page);
      if (page === 0) {
        setGroupsNuris(nuris);
      } else {
        setGroupsNuris(prev => [...prev, ...nuris]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error(`Failed to load contacts`);
      setError(errorMessage);
      console.error(`Error loading contacts:`, errorMessage);
    }
  }, [loadNextGraphContacts]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    loadGroups(nextPage)
      .then(() => setCurrentPage(nextPage))
      .finally(() => setIsLoadingMore(false));
  }, [currentPage, hasMore, isLoadingMore, loadGroups]);

  const reloadGroups = useCallback(() => {
    setCurrentPage(0);
    setIsLoading(true);
    loadGroups(0).finally(() => setIsLoading(false));
  }, [loadGroups]);

  useEffect(() => {
    reloadGroups();
  }, [reloadGroups]);

  return {
    groupsNuris,
    isLoading,
    isLoadingMore,
    error,
    addFilter,
    clearFilters,
    filters,
    hasMore,
    loadMore,
    totalCount,
    reloadGroups,
  };
};