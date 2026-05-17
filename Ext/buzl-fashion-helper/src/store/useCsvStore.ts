import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterStatus } from '../types';

interface CsvState {
  products: Product[];
  globalReferenceUrl: string;
  isImported: boolean;
  searchQuery: string;
  activeFilter: FilterStatus;
  
  // Connection and Server Settings
  connectionMode: 'local' | 'server';
  serverEnvironment: 'development' | 'production' | 'custom';
  vercelUrl: string;
  hostingerUrl: string;
  customUrl: string;
  token: string | null;
  username: string | null;

  setProducts: (products: Product[]) => void;
  setGlobalReferenceUrl: (url: string) => void;
  clearData: () => void;
  
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterStatus) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;

  setConnectionMode: (mode: 'local' | 'server') => void;
  setServerEnvironment: (env: 'development' | 'production' | 'custom') => void;
  setVercelUrl: (url: string) => void;
  setHostingerUrl: (url: string) => void;
  setCustomUrl: (url: string) => void;
  setCredentials: (username: string | null, token: string | null) => void;
}

export const useCsvStore = create<CsvState>()(
  persist(
    (set) => ({
      products: [],
      globalReferenceUrl: '',
      isImported: false,
      searchQuery: '',
      activeFilter: 'all',

      // Defaults
      connectionMode: 'local',
      serverEnvironment: 'production',
      vercelUrl: 'https://buzl-dev.vercel.app/api',
      hostingerUrl: 'https://buzl-production.com/api',
      customUrl: 'http://localhost:3000/api',
      token: null,
      username: null,

      setProducts: (products) => set({ products, isImported: true }),
      setGlobalReferenceUrl: (url) => set({ globalReferenceUrl: url }),
      clearData: () => set({ products: [], isImported: false, globalReferenceUrl: '', searchQuery: '', activeFilter: 'all', token: null, username: null }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      })),

      setConnectionMode: (connectionMode) => set({ connectionMode }),
      setServerEnvironment: (serverEnvironment) => set({ serverEnvironment }),
      setVercelUrl: (vercelUrl) => set({ vercelUrl }),
      setHostingerUrl: (hostingerUrl) => set({ hostingerUrl }),
      setCustomUrl: (customUrl) => set({ customUrl }),
      setCredentials: (username, token) => set({ username, token })
    }),
    {
      name: 'buzl-csv-storage',
      version: 3, // bumping version clears stale cached data
    }
  )
);
