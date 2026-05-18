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
  
  // Connection and Server Settings
  connectionMode: 'local' | 'server';
  serverEnvironment: 'development' | 'production' | 'custom';
  vercelUrl: string;
  hostingerUrl: string;
  customUrl: string;
  token: string | null;
  userId: string | null;
  username: string | null;

  setProducts: (products: Product[]) => void;
  setGlobalReferenceUrl: (url: string) => void;
  clearData: () => void;
  
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterStatus) => void;
  setActiveView: (view: 'mine' | 'all') => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;

  setConnectionMode: (mode: 'local' | 'server') => void;
  setServerEnvironment: (env: 'development' | 'production' | 'custom') => void;
  setVercelUrl: (url: string) => void;
  setHostingerUrl: (url: string) => void;
  setCustomUrl: (url: string) => void;
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

      // Defaults
      connectionMode: 'server',
      serverEnvironment: 'production',
      vercelUrl: 'https://buzl-helper.vercel.app/api',
      hostingerUrl: 'https://buzl-helper.vercel.app/api',
      customUrl: 'http://localhost:3000/api',
      token: null,
      userId: null,
      username: null,

      setProducts: (products) => set({ products, isImported: true }),
      setGlobalReferenceUrl: (url) => set({ globalReferenceUrl: url }),
      clearData: () => set({ products: [], isImported: false, globalReferenceUrl: '', searchQuery: '', activeFilter: 'all', activeView: 'mine', token: null, userId: null, username: null }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setActiveView: (activeView) => set({ activeView }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      })),

      setConnectionMode: (connectionMode) => set({ connectionMode }),
      setServerEnvironment: (serverEnvironment) => set({ serverEnvironment }),
      setVercelUrl: (vercelUrl) => set({ vercelUrl }),
      setHostingerUrl: (hostingerUrl) => set({ hostingerUrl }),
      setCustomUrl: (customUrl) => set({ customUrl }),
      setCredentials: (username, token, userId = null) => set({ username, token, userId })
    }),
    {
      name: 'buzl-csv-storage',
      version: 4, // bumping version clears stale cached data
    }
  )
);
