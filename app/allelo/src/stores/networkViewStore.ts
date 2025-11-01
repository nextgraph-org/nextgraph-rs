import { create } from 'zustand';

export type ViewType =
  | 'work-history'
  | 'orgs-in-common'
  | 'people-in-common'
  | 'all-connections'
  | null;

export interface NetworkFilter {
  category?: string;
  naoMembership?: boolean;
  source?: string;
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
}

interface NetworkViewState {
  currentView: ViewType;
  availableViews: ViewType[];
  activeFilters: NetworkFilter;
  isSearchOpen: boolean;

  setView: (view: ViewType) => void;
  setAvailableViews: (views: ViewType[]) => void;
  setFilter: (filter: Partial<NetworkFilter>) => void;
  clearFilters: () => void;
  setSearchOpen: (isOpen: boolean) => void;
}

export const useNetworkViewStore = create<NetworkViewState>((set) => ({
  currentView: null,
  availableViews: ['all-connections'],
  activeFilters: {},
  isSearchOpen: false,

  setView: (view) => set({ currentView: view }),

  setAvailableViews: (views) => set({ availableViews: views }),

  setFilter: (filter) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, ...filter },
    })),

  clearFilters: () => set({ activeFilters: {} }),

  setSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
}));
