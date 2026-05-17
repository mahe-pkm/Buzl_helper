import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useCsvStore } from '../store/useCsvStore';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

export const ProductList: React.FC = () => {
  const { products, searchQuery, activeFilter } = useCsvStore();

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filter by status
      if (activeFilter === 'pending' && p.completed) return false;
      if (activeFilter === 'completed' && !p.completed) return false;
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          p.product_name.toLowerCase().includes(query) ||
          p.drive_folder.toLowerCase().includes(query) ||
          (p.reference_link && p.reference_link.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [products, searchQuery, activeFilter]);

  if (filteredProducts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-semibold text-gray-700">No products found</p>
        <p className="text-xs mt-1">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-gray-50">
      <Virtuoso
        style={{ height: '100%', width: '100%' }}
        data={filteredProducts}
        itemContent={(_, product: Product) => (
          <ProductCard product={product} />
        )}
      />
    </div>
  );
};
