import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterStatus } from '../types';

interface CsvState {
  products: Product[];
  globalReferenceUrl: string;
  isImported: boolean;
  searchQuery: string;
  activeFilter: FilterStatus;
  activeView: 'mine' | 'all';
  activeWorkerFilter: string;
  activeUnassignedOnly: boolean;
  activeCategoryFilter: string;
  activeDateFilter: string;
  expandedProductIds: string[];
  uiScale: number;
  
  // Connection and Server Settings
  connectionMode: 'local' | 'server';
  token: string | null;
  userId: string | null;
  username: string | null;

  setProducts: (products: Product[]) => void;
  setGlobalReferenceUrl: (url: string) => void;
  clearData: () => void;
  
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterStatus) => void;
  setActiveView: (view: 'mine' | 'all') => void;
  setActiveWorkerFilter: (worker: string) => void;
  setActiveUnassignedOnly: (value: boolean) => void;
  setActiveCategoryFilter: (category: string) => void;
  setActiveDateFilter: (date: string) => void;
  toggleProductExpanded: (id: string) => void;
  expandAllProducts: () => void;
  collapseAllProducts: () => void;
  expandProducts: (ids: string[]) => void;
  collapseProducts: (ids: string[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  setUiScale: (scale: number) => void;

  setConnectionMode: (mode: 'local' | 'server') => void;
  setCredentials: (username: string | null, token: string | null, userId?: string | null) => void;
}

const stripHeavyProductFields = (product: Product): Product => ({
  ...product,
  thumbnail_cached_data: null,
  reference_thumbnail_cached_data: null,
  actionLogs: [],
  nameCopied: false,
  driveCopied: false,
  referenceCopied: false,
});

export const useCsvStore = create<CsvState>()(
  persist(
    (set) => ({
      products: [],
      globalReferenceUrl: '',
      isImported: false,
      searchQuery: '',
      activeFilter: 'all',
      activeView: 'mine',
      activeWorkerFilter: 'all',
      activeUnassignedOnly: false,
      activeCategoryFilter: 'all',
      activeDateFilter: '',
      expandedProductIds: [],
      uiScale: 90,

      connectionMode: 'server',
      token: null,
      userId: null,
      username: null,

      setProducts: (products) => set((state) => {
        const productIds = new Set(products.map((product) => product.id));
        return {
          products,
          isImported: true,
          expandedProductIds: state.expandedProductIds.filter((id) => productIds.has(id)),
        };
      }),
      setGlobalReferenceUrl: (url) => set({ globalReferenceUrl: url }),
      clearData: () => set({
        products: [],
        isImported: false,
        globalReferenceUrl: '',
        searchQuery: '',
        activeFilter: 'all',
        activeView: 'mine',
        activeWorkerFilter: 'all',
        activeUnassignedOnly: false,
        activeCategoryFilter: 'all',
        activeDateFilter: '',
        expandedProductIds: [],
        token: null,
        userId: null,
        username: null,
      }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setActiveView: (activeView) => set({ activeView }),
      setActiveWorkerFilter: (activeWorkerFilter) => set({ activeWorkerFilter }),
      setActiveUnassignedOnly: (activeUnassignedOnly) => set({ activeUnassignedOnly }),
      setActiveCategoryFilter: (activeCategoryFilter) => set({ activeCategoryFilter }),
      setActiveDateFilter: (activeDateFilter) => set({ activeDateFilter }),
      toggleProductExpanded: (id) => set((state) => ({
        expandedProductIds: state.expandedProductIds.includes(id)
          ? state.expandedProductIds.filter((value) => value !== id)
          : [...state.expandedProductIds, id],
      })),
      expandAllProducts: () => set((state) => ({
        expandedProductIds: state.products.map((product) => product.id),
      })),
      collapseAllProducts: () => set({ expandedProductIds: [] }),
      expandProducts: (ids) => set((state) => {
        const next = new Set(state.expandedProductIds);
        ids.forEach((id) => next.add(id));
        return { expandedProductIds: Array.from(next) };
      }),
      collapseProducts: (ids) => set((state) => {
        if (ids.length === 0) return {};
        const remove = new Set(ids);
        return { expandedProductIds: state.expandedProductIds.filter((id) => !remove.has(id)) };
      }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      })),
      setUiScale: (uiScale) => set({ uiScale: Math.min(110, Math.max(75, uiScale)) }),

      setConnectionMode: (connectionMode) => set({ connectionMode }),
      setCredentials: (username, token, userId = null) => set({ username, token, userId })
    }),
    {
      name: 'buzl-csv-storage',
      version: 10, // clear older localStorage snapshots that may contain thumbnail blobs
      partialize: (state) => ({
        products: state.connectionMode === 'local'
          ? state.products.map(stripHeavyProductFields)
          : [],
        globalReferenceUrl: state.globalReferenceUrl,
        isImported: state.connectionMode === 'local' ? state.isImported : false,
        searchQuery: state.searchQuery,
        activeFilter: state.activeFilter,
        activeView: state.activeView,
        activeWorkerFilter: state.activeWorkerFilter,
        activeUnassignedOnly: state.activeUnassignedOnly,
        activeCategoryFilter: state.activeCategoryFilter,
        activeDateFilter: state.activeDateFilter,
        expandedProductIds: state.expandedProductIds.slice(0, 100),
        uiScale: state.uiScale,
        connectionMode: state.connectionMode,
        token: state.token,
        userId: state.userId,
        username: state.username,
      }),
    }
  )
);
