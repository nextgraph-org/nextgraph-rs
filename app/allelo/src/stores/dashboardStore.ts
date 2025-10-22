import { create } from 'zustand';
import { ReactNode, RefObject } from 'react';

interface DashboardState {
  // Layout zones
  headerZone: ReactNode;
  footerZone: ReactNode;

  // Layout refs
  mainRef: RefObject<HTMLElement | null> | null;

  // Layout controls
  showOverflow: boolean;
  showHeader: boolean;

  // Actions for zones
  setHeaderZone: (zone: ReactNode) => void;
  clearHeaderZone: () => void;
  setFooterZone: (zone: ReactNode) => void;
  clearFooterZone: () => void;

  // Actions for refs
  setMainRef: (ref: RefObject<HTMLElement | null>) => void;

  // Actions for layout
  toggleOverflow: () => void;
  setOverflow: (show: boolean) => void;
  setShowHeader: (show: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  // Initial state
  headerZone: null,
  footerZone: null,
  mainRef: null,
  showOverflow: true,
  showHeader: true,

  // Zone actions
  setHeaderZone: (zone) => set({ headerZone: zone }),
  clearHeaderZone: () => set({ headerZone: null }),
  setFooterZone: (zone) => set({ footerZone: zone }),
  clearFooterZone: () => set({ footerZone: null }),

  // Ref actions
  setMainRef: (ref) => set({ mainRef: ref }),

  // Layout actions
  toggleOverflow: () => set((state) => ({ showOverflow: !state.showOverflow })),
  setOverflow: (show) => set({ showOverflow: show }),
  setShowHeader: (show) => set({ showHeader: show }),
}));
