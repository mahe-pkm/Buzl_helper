import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, FilterStatus, Worker } from '../types';

interface CsvState {
  authUser: any | null;
  products: Product[];
  workers: Worker[];
  globalReferenceUrl: string;
  searchQuery: string;
  activeFilter: FilterStatus;

  setAuth: (user: any | null) => void;
  setProducts: (products: Product[]) => void;
  setWorkers: (workers: Worker[]) => void;
  setGlobalReferenceUrl: (url: string) => void;
  clearData: () => void;
  logout: () => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: FilterStatus) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
}

export const useCsvStore = create<CsvState>()(
  persist(
    (set) => ({
      authUser: null,
      products: [],
      workers: [],
      globalReferenceUrl: '',
      searchQuery: '',
      activeFilter: 'all',

      setAuth: (user) => set({ authUser: user }),
      setProducts: (products) => set({ products }),
      setWorkers: (workers) => set({ workers }),
      setGlobalReferenceUrl: (url) => set({ globalReferenceUrl: url }),
      clearData: () => set({ products: [], globalReferenceUrl: '', searchQuery: '', activeFilter: 'all' }),
      logout: () => {
        localStorage.removeItem('buzl_token');
        set({ authUser: null, products: [], workers: [], globalReferenceUrl: '' });
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setActiveFilter: (filter) => set({ activeFilter: filter }),
      updateProduct: (id, updates) => set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      }))
    }),
    {
      name: 'buzl-csv-storage',
      version: 4,
    }
  )
);
