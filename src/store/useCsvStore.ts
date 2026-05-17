import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterStatus } from '../types';

interface CsvState {
  products: Product[];
  globalReferenceUrl: string;
  isImported: boolean;
  searchQuery: string;
  activeFilter: FilterStatus;
  
  setProducts: (products: Product[]) => void;
  setGlobalReferenceUrl: (url: string) => void;
  clearData: () => void;
  
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterStatus) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

export const useCsvStore = create<CsvState>()(
  persist(
    (set) => ({
      products: [],
      globalReferenceUrl: '',
      isImported: false,
      searchQuery: '',
      activeFilter: 'all',

      setProducts: (products) => set({ products, isImported: true }),
      setGlobalReferenceUrl: (url) => set({ globalReferenceUrl: url }),
      clearData: () => set({ products: [], isImported: false, globalReferenceUrl: '', searchQuery: '', activeFilter: 'all' }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      }))
    }),
    {
      name: 'buzl-csv-storage',
      version: 2, // bumping version clears stale cached data with bad product names
    }
  )
);
