import {useState, useEffect, useCallback} from 'react';
import {isNextGraphEnabled} from '@/utils/featureFlags';
import {dataService} from '@/services/dataService';
import type {Contact, SortParams} from '@/types/contact';
import {nextgraphDataService} from "@/services/nextgraphDataService";
import {useNextGraphAuth} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {resolveFrom} from '@/utils/socialContact/contactUtils.ts';
import {useSaveContacts} from "@/hooks/contacts/useSaveContacts.ts";
import {defaultTemplates, renderTemplate} from "@/utils/templateRenderer.ts";

export interface ContactsFilters extends SortParams {
  searchQuery?: string;
  relationshipFilter?: string;
  naoStatusFilter?: string;
  accountFilter?: string;
  groupFilter?: string;
  currentUserGroupIds?: string[];
  hasAddressFilter?: boolean;
}

export type iconFilter = 'relationshipFilter' | 'naoStatusFilter' | 'accountFilter' | 'vouchFilter' | 'praiseFilter';

export interface ContactsReturn {
  /**@deprecated*/contacts: Contact[];
  contactNuris: string[]; // NURI list or IDs for mock data
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  totalCount: number;
  error: Error | null;
  updateContact: (nuri: string, updates: Partial<Contact>) => Promise<void>;
  addFilter: (key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => void;
  setIconFilter: (key: iconFilter, value: string) => void;
  clearFilters: () => void;
  filters: ContactsFilters;
  reloadContacts: () => void;
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
  hasAddressFilter: false
};

export interface UseContactsParams {
  limit?: number;
  initialFilters?: Partial<ContactsFilters>;
}

export const useContacts = ({limit = 10, initialFilters}: UseContactsParams = {}): ContactsReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
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

  const {updateContact: editContact} = useSaveContacts();
  const isNextGraph = isNextGraphEnabled();
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

  const loadMockContacts = useCallback(async (page: number): Promise<string[]> => {
    const allContacts = await dataService.getContacts();

    const {
      searchQuery = '',
      relationshipFilter = 'all',
      naoStatusFilter = 'all',
      accountFilter = 'all',
      groupFilter = 'all',
      sortBy = 'name',
      sortDirection = 'asc',
      currentUserGroupIds = [],
      hasAddressFilter = false
    } = filters;

    const filtered = allContacts.filter(contact => {
      // Search filter
      const name = resolveFrom(contact, 'name');
      const displayName = name?.value || renderTemplate(defaultTemplates.contactName, name);

      const email = resolveFrom(contact, 'email');
      const organization = resolveFrom(contact, 'organization');
      const address = resolveFrom(contact, 'address');

      const matchesSearch = searchQuery === '' ||
        displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email?.value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        organization?.value?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        organization?.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        address?.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        address?.country?.toLowerCase().includes(searchQuery.toLowerCase());

      // Relationship filter
      const matchesRelationship = relationshipFilter === 'all' ||
        (relationshipFilter === 'undefined' && !contact.relationshipCategory) ||
        (relationshipFilter === 'default' && !contact.relationshipCategory) ||
        contact.relationshipCategory === relationshipFilter;

      // NAO Status filter
      const matchesNaoStatus = naoStatusFilter === 'all' ||
        (naoStatusFilter === 'undefined' && !contact.naoStatus?.value) ||
        contact.naoStatus?.value === naoStatusFilter;

      // Account filter
      const matchesSource = accountFilter === 'all'
        || contact.account?.some(account => account.protocol === accountFilter);

      const inGroup = currentUserGroupIds.length === 0 || currentUserGroupIds.length > 0 && contact.internalGroup && contact.internalGroup.some(groupId => currentUserGroupIds.includes(groupId.value))

      // Group filter
      const matchesGroup = groupFilter === 'all' ||
        (groupFilter === 'has_groups' && contact.internalGroup && contact.internalGroup.size > 0) ||
        (groupFilter === 'no_groups' && (!contact.internalGroup || contact.internalGroup.size === 0)) ||
        (groupFilter === 'groups_in_common' && inGroup);



      // Vouch filter - when sortBy is 'vouchTotal', only show contacts with vouches > 0
      const matchesVouches = sortBy !== 'vouchTotal' ||
        ((contact.vouchesSent || 0) + (contact.vouchesReceived || 0)) > 0;

      // Praise filter - when sortBy is 'praiseTotal', only show contacts with praises > 0
      const matchesPraises = sortBy !== 'praiseTotal' ||
        ((contact.praisesSent || 0) + (contact.praisesReceived || 0)) > 0;

      // Address filter - only show contacts with at least one address
      const matchesHasAddress = !hasAddressFilter || (contact.address && contact.address.size > 0);

      return matchesSearch && matchesRelationship && matchesNaoStatus && matchesSource && matchesGroup && matchesVouches && matchesPraises && matchesHasAddress && inGroup;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name': {
          const aName = resolveFrom(a, 'name')?.value || '';
          const bName = resolveFrom(b, 'name')?.value || '';
          compareValue = aName.localeCompare(bName);
          break;
        }
        case 'organization': {
          const aOrganization = resolveFrom(a, 'organization')?.value || '';
          const bOrganization = resolveFrom(b, 'organization')?.value || '';
          compareValue = aOrganization.localeCompare(bOrganization);
          break;
        }
        case 'naoStatus': {
          const statusOrder = {'member': 0, 'invited': 1, 'not_invited': 2};
          const aStatus = a.naoStatus?.value as keyof typeof statusOrder;
          const bStatus = b.naoStatus?.value as keyof typeof statusOrder;
          compareValue = (statusOrder[aStatus] || 3) - (statusOrder[bStatus] || 3);
          break;
        }
        case 'groupCount': {
          const aGroups = a.internalGroup?.size || 0;
          const bGroups = b.internalGroup?.size || 0;
          compareValue = aGroups - bGroups;
          break;
        }
        case 'mostRecentInteraction': {
          const aDate = a.mostRecentInteraction ? new Date(a.mostRecentInteraction).getTime() : 0;
          const bDate = b.mostRecentInteraction ? new Date(b.mostRecentInteraction).getTime() : 0;
          compareValue = aDate - bDate;
          break;
        }
        /*case 'mostActive': {
          const now = Date.now();
          const dayInMs = 24 * 60 * 60 * 1000;
          const weekInMs = 7 * dayInMs;
          const monthInMs = 30 * dayInMs;

          const calculateActivityScore = (contact: typeof a) => {
            const lastInteraction = contact.lastInteractionAt?.getTime() || 0;
            const timeSinceInteraction = now - lastInteraction;

            let timeScore = 0;
            if (timeSinceInteraction < dayInMs) {
              timeScore = 1000;
            } else if (timeSinceInteraction < weekInMs) {
              timeScore = 500;
            } else if (timeSinceInteraction < monthInMs) {
              timeScore = 100;
            } else {
              timeScore = Math.max(1, 50 - (timeSinceInteraction / monthInMs));
            }

            const interactionFrequency = (contact.interactionCount || 0) * 10;
            const recentScore = contact.recentInteractionScore || 0;

            return timeScore + interactionFrequency + recentScore;
          };

          const aActivity = calculateActivityScore(a);
          const bActivity = calculateActivityScore(b);
          compareValue = bActivity - aActivity;
          break;
        }*/
        /* TODO: I don't think we would have this one
           case 'nearMeNow': {
           const aAddress = resolveFrom(a, 'address');
           const bAddress = resolveFrom(b, 'address');
           const aDistance = (aAddress as any)?.distance || Number.MAX_SAFE_INTEGER;
           const bDistance = (bAddress as any)?.distance || Number.MAX_SAFE_INTEGER;
           compareValue = aDistance - bDistance;
           break;
         }*/
        case 'sharedTags': {
          const calculateSharedTagsScore = (contact: typeof a) => {
            const sharedTags = contact.sharedTagsCount || 0;
            const totalTags = contact.tag?.size || 0;
            const tagSimilarity = totalTags > 0 ? (sharedTags / totalTags) * 100 : 0;
            return sharedTags * 10 + tagSimilarity;
          };

          const aSharedScore = calculateSharedTagsScore(a);
          const bSharedScore = calculateSharedTagsScore(b);
          compareValue = bSharedScore - aSharedScore;
          break;
        }
        case 'vouchTotal': {
          const aVouches = (a.vouchesSent || 0) + (a.vouchesReceived || 0);
          const bVouches = (b.vouchesSent || 0) + (b.vouchesReceived || 0);
          compareValue = aVouches - bVouches;
          break;
        }
        case 'praiseTotal': {
          const aPraises = (a.praisesSent || 0) + (a.praisesReceived || 0);
          const bPraises = (b.praisesSent || 0) + (b.praisesReceived || 0);
          compareValue = aPraises - bPraises;
          break;
        }
        default:
          compareValue = 0;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    setContacts(allContacts);

    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedContacts = limit === 0 ? filtered : filtered.slice(startIndex, endIndex);

    setTotalCount(filtered.length);
    return paginatedContacts.map(contact => contact['@id'] || '');
  }, [filters, limit]);

  const loadNextGraphContacts = useCallback(async (page: number): Promise<string[]> => {
    if (!session || !session.ng) {
      return [];
    }

    const {
      sortBy = 'mostRecentInteraction',
      sortDirection = 'desc',
      accountFilter = 'all',
      searchQuery,
      hasAddressFilter = false
    } = filters;


    const filterParams = new Map<string, string>();
    if (accountFilter !== 'all') {
      filterParams.set('account', accountFilter);
    }
    if (searchQuery) {
      filterParams.set('fts', searchQuery);
    }
    if (hasAddressFilter) {
      filterParams.set('hasAddress', 'true');
    }

    const offset = page * limit;
    const contactIDsResult = await nextgraphDataService.getContactIDs(session, limit, offset,
      undefined, undefined, [{sortBy, sortDirection}], filterParams);
    const contactsCountResult = await nextgraphDataService.getContactsCount(session, filterParams);

    // @ts-expect-error TODO output format of ng sparql query
    const totalContactsInDB = contactsCountResult.results.bindings[0].totalCount.value as number;

    setTotalCount(totalContactsInDB);
    const containerOverlay = session.privateStoreId!.substring(46);
    // @ts-expect-error TODO output format of ng sparql query
    const contactNuris = contactIDsResult.results.bindings.map(
      (binding) => binding.contactUri.value + containerOverlay
    );

    return contactNuris;
  }, [session, filters, limit]);

  const updateContact = async (nuri: string, updates: Partial<Contact>) => {
    await editContact(nuri, updates);
  };

  const addFilter = useCallback((key: keyof ContactsFilters, value: ContactsFilters[keyof ContactsFilters]) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      searchQuery: '',
      relationshipFilter: 'all',
      naoStatusFilter: 'all',
      accountFilter: 'all',
      groupFilter: 'all',
      sortBy: 'mostActive',
      sortDirection: 'asc',
      hasAddressFilter: false
    }));
  }, []);

  const loadContacts = useCallback(async (page: number) => {
    try {
      const nuris = !isNextGraph ? await loadMockContacts(page) : await loadNextGraphContacts(page);
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
  }, [isNextGraph, loadMockContacts, loadNextGraphContacts]);

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

  useEffect(() => {
    reloadContacts();
  }, [reloadContacts]);

  return {
    contacts,
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
    updateContact,
    setIconFilter,
    reloadContacts
  };
};