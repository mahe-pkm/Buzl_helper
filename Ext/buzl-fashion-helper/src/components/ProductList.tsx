import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useCsvStore } from '../store/useCsvStore';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

export const ProductList: React.FC = () => {
  const { products, userId, searchQuery, activeFilter, activeView } = useCsvStore();

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filter by status
      if (activeFilter !== 'all' && p.status !== activeFilter) return false;

      if (activeView === 'mine') {
        const isMine = p.assigned_to === userId;
        const isUnassigned = !p.assigned_to;
        if (!isMine && !isUnassigned) return false;
      }
      
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
  }, [products, userId, searchQuery, activeFilter, activeView]);

  const myProducts = filteredProducts.filter((p) => p.assigned_to === userId);
  const unassignedProducts = filteredProducts.filter((p) => !p.assigned_to);

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
    <div className="flex-1 w-full bg-gray-50 overflow-y-auto">
      {activeView === 'mine' ? (
        <>
          {myProducts.length > 0 && (
            <div className="px-4 py-2 bg-gray-100 border-y border-gray-200 text-[11px] font-bold uppercase text-gray-500">
              My Assigned Tasks ({myProducts.length})
            </div>
          )}
          {myProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          {unassignedProducts.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-y border-amber-100 text-[11px] font-bold uppercase text-amber-600">
              Unassigned - Available to Claim ({unassignedProducts.length})
            </div>
          )}
          {unassignedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </>
      ) : (
        <Virtuoso
          style={{ height: '100%', width: '100%' }}
          data={filteredProducts}
          itemContent={(_, product: Product) => (
            <ProductCard product={product} />
          )}
        />
      )}
    </div>
  );
};
