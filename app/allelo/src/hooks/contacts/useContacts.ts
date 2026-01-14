import {useState, useEffect, useCallback} from 'react';
import type {SortParams} from '@/types/contact';
import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {contactService} from "@/services/contactService.ts";
import {getContactGraph} from "@/utils/socialContact/contactUtilsOrm.ts";
import {useUpdateContacts} from "@/hooks/contacts/useUpdateContacts.ts";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export interface ContactsFilters extends SortParams {
  searchQuery?: string;
  relationshipFilter?: string;
  naoStatusFilter?: string;
  accountFilter?: string;
  groupFilter?: string;
  currentUserGroupIds?: string[];
  hasAddressFilter?: boolean;
  hasNetworkCentralityFilter?: boolean;
}

export type iconFilter = 'relationshipFilter' | 'naoStatusFilter' | 'accountFilter' | 'vouchFilter' | 'praiseFilter';

export interface ContactsReturn {
  contactNuris: string[]; // NURI list or IDs for mock data
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  totalCount: number;
  error: Error | null;
  addFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  setIconFilter: (key: iconFilter, value: string) => void;
  clearFilters: () => void;
  filters: ContactsFilters;
  reloadContacts: () => void;
  handleContactsCategorized: (contactIds: string[], rcardId: string) => Promise<void>;
}


const defaultFilters: ContactsFilters = {
  searchQuery: '',
  relationshipFilter: 'all',
  naoStatusFilter: 'all',
  accountFilter: 'all',
  groupFilter: 'all',
  sortBy: 'mostRecentInteraction',
  sortDirection: 'desc',
  currentUserGroupIds: [],
  hasAddressFilter: false,
  hasNetworkCentralityFilter: false
};

export interface UseContactsParams {
  limit?: number;
  initialFilters?: Partial<ContactsFilters>;
}

export const useContacts = ({limit = 10, initialFilters}: UseContactsParams = {}): ContactsReturn => {
  const [contactNuris, setContactNuris] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ContactsFilters>(() => ({
    ...defaultFilters,
    ...initialFilters
  }));

  const {updateContacts} = useUpdateContacts();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const hasMore = contactNuris.length < totalCount;

  const setIconFilter = useCallback((key: iconFilter, value: string) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      relationshipFilter: key === 'relationshipFilter' ? value : 'all',
      naoStatusFilter: key === 'naoStatusFilter' ? value : 'all',
      accountFilter: key === 'accountFilter' ? value : 'all',
      groupFilter: 'all',
      // Handle vouch and praise filters with sorting
      ...(key === 'vouchFilter' && value === 'has_vouches' && {
        sortBy: 'vouchTotal',
        sortDirection: 'desc' as const
      }),
      ...(key === 'praiseFilter' && value === 'has_praises' && {
        sortBy: 'praiseTotal',
        sortDirection: 'desc' as const
      }),
    }));
  }, []);

  const loadNextGraphContacts = useCallback(async (page: number): Promise<string[]> => {
    const startTime = performance.now();
    console.warn('loadNextGraphContacts: Starting...');

    if (!session || !session.ng) {
      console.log('loadNextGraphContacts: No session, returning empty array');
      return [];
    }

    const {
      sortBy = 'mostRecentInteraction',
      sortDirection = 'desc',
      accountFilter = 'all',
      relationshipFilter = 'all',
      searchQuery,
      hasAddressFilter = false,
      naoStatusFilter = 'all',
      hasNetworkCentralityFilter = false
    } = filters;


    const filterParams = new Map<string, string>();
    if (accountFilter !== 'all') {
      filterParams.set('account', accountFilter);
    }
    if (relationshipFilter !== 'all') {
      filterParams.set('rcard', relationshipFilter);
    }
    if (searchQuery) {
      filterParams.set('fts', searchQuery);
    }
    if (hasAddressFilter) {
      filterParams.set('hasAddress', 'true');
    }
    if (naoStatusFilter !== 'all') {
      filterParams.set('naoStatus', naoStatusFilter);
    }
    if (hasNetworkCentralityFilter) {
      filterParams.set('hasNetworkCentrality', 'true');
    }

    const offset = page * limit;
    const contactIDsResult = await contactService.getContactIDs(session, limit, offset,
      undefined, undefined, [{sortBy, sortDirection}], filterParams);
    const contactsCountResult = await contactService.getContactsCount(session, filterParams);

    // @ts-expect-error TODO output format of ng sparql query
    const totalContactsInDB = contactsCountResult.results.bindings[0].totalCount.value as number;

    setTotalCount(totalContactsInDB);
    // @ts-expect-error TODO output format of ng sparql query
    const result = contactIDsResult.results.bindings.map(
      (binding) => getContactGraph(binding.contactUri.value, session)
    );

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.warn(`loadNextGraphContacts: Completed in ${duration.toFixed(2)}ms`);

    return result;
  }, [session, filters, limit]);


  const addFilter = useCallback((key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(prevFilters => ({
      ...prevFilters, ...defaultFilters
    }));
  }, []);

  const loadContacts = useCallback(async (page: number) => {
    try {
      const nuris = await loadNextGraphContacts(page);
      if (page === 0) {
        setContactNuris(nuris);
      } else {
        setContactNuris(prev => [...prev, ...nuris]);
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
    loadContacts(nextPage)
      .then(() => setCurrentPage(nextPage))
      .finally(() => setIsLoadingMore(false));
  }, [currentPage, hasMore, isLoadingMore, loadContacts]);

  const reloadContacts = useCallback(() => {
    setCurrentPage(0);
    setIsLoading(true);
    loadContacts(0).finally(() => setIsLoading(false));
  }, [loadContacts]);

  const handleContactsCategorized = useCallback(async (contactIds: string[], rcardId: string) => {
    const updContacts: Record<string, Partial<SocialContact>> = {};
    contactIds.forEach((id: string) => {
      updContacts[id] = {rcard: rcardId}
    });

    await updateContacts(updContacts);

    if (filters.relationshipFilter !== 'all') {
      reloadContacts();
    }
  }, [updateContacts, filters, reloadContacts]);

  useEffect(() => {
    reloadContacts();
  }, [reloadContacts]);

  return {
    contactNuris,
    isLoading,
    isLoadingMore,
    error,
    addFilter,
    clearFilters,
    filters,
    hasMore,
    loadMore,
    totalCount,
    setIconFilter,
    reloadContacts,
    handleContactsCategorized
  };
};