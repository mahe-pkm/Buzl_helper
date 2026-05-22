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
  
  // Connection and Server Settings
  connectionMode: 'local' | 'server';
  serverEnvironment: 'development' | 'production' | 'custom';
  vercelUrl: string;
  hostingerUrl: string;
  customUrl: string;
  dashboardVercelUrl: string;
  dashboardHostingerUrl: string;
  dashboardCustomUrl: string;
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

  setConnectionMode: (mode: 'local' | 'server') => void;
  setServerEnvironment: (env: 'development' | 'production' | 'custom') => void;
  setVercelUrl: (url: string) => void;
  setHostingerUrl: (url: string) => void;
  setCustomUrl: (url: string) => void;
  setDashboardVercelUrl: (url: string) => void;
  setDashboardHostingerUrl: (url: string) => void;
  setDashboardCustomUrl: (url: string) => void;
  setCredentials: (username: string | null, token: string | null, userId?: string | null) => void;
}

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

      // Defaults
      connectionMode: 'server',
      serverEnvironment: 'custom',
      vercelUrl: 'https://buzl-helper.vercel.app/api',
      hostingerUrl: 'https://buzl-helper.vercel.app/api',
      customUrl: 'http://127.0.0.1:3000/api',
      dashboardVercelUrl: 'https://buzl-dev.vercel.app',
      dashboardHostingerUrl: 'https://buzl-dev.vercel.app',
      dashboardCustomUrl: 'http://127.0.0.1:5174',
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

      setConnectionMode: (connectionMode) => set({ connectionMode }),
      setServerEnvironment: (serverEnvironment) => set({ serverEnvironment }),
      setVercelUrl: (vercelUrl) => set({ vercelUrl }),
      setHostingerUrl: (hostingerUrl) => set({ hostingerUrl }),
      setCustomUrl: (customUrl) => set({ customUrl }),
      setDashboardVercelUrl: (dashboardVercelUrl) => set({ dashboardVercelUrl }),
      setDashboardHostingerUrl: (dashboardHostingerUrl) => set({ dashboardHostingerUrl }),
      setDashboardCustomUrl: (dashboardCustomUrl) => set({ dashboardCustomUrl }),
      setCredentials: (username, token, userId = null) => set({ username, token, userId })
    }),
    {
      name: 'buzl-csv-storage',
      version: 9, // bumping version clears stale cached data
    }
  )
);
