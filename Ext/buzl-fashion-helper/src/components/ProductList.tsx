import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useCsvStore } from '../store/useCsvStore';
import { ProductCard } from './ProductCard';
import type { Product } from '../types';

export const ProductList: React.FC = () => {
  const {
    products,
    userId,
    searchQuery,
    activeFilter,
    activeView,
    activeWorkerFilter,
    activeUnassignedOnly,
    activeCategoryFilter,
    activeDateFilter,
    expandedProductIds,
    toggleProductExpanded,
    expandProducts,
    collapseProducts,
  } = useCsvStore();

  const expandedSet = useMemo(() => new Set(expandedProductIds), [expandedProductIds]);

  const getWorkerFilterKey = (product: Product) => {
    if (!product.assigned_to && !product.assignee?.username) return 'unassigned';
    if (product.assigned_to) return `id:${product.assigned_to}`;
    return `name:${product.assignee!.username.toLowerCase()}`;
  };

  const toDateKey = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getProductDateKey = (product: Product) => {
    const timestamps: number[] = [];

    (product.actionLogs || []).forEach((log) => {
      const time = new Date(log.createdAt).getTime();
      if (!Number.isNaN(time)) timestamps.push(time);
    });

    [product.updatedAt, product.createdAt].forEach((value) => {
      if (!value) return;
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) timestamps.push(time);
    });

    if (timestamps.length === 0) return null;
    return toDateKey(Math.max(...timestamps));
  };
  const getStage = (product: Product) => {
    const actions = (product.actionLogs || []).map((log) => log.action);
    if (actions.includes('finish')) {
      return actions.includes('brand_approved') && actions.includes('site_uploaded') ? 'none' : 'post';
    }
    if (actions.includes('qc_done')) return 'qc';
    if (actions.includes('qc_correction_start')) return 'to-qc';
    if (actions.includes('generation_complete')) return 'to-qc';
    if (actions.includes('generation_start')) return 'generation';
    return 'none';
  };

  const getActivityTime = (product: Product) => {
    const timestamps: number[] = [];
    [product.lastActivityAt, product.assignedAt, product.updatedAt, product.createdAt].forEach((value) => {
      if (!value) return;
      const time = new Date(value).getTime();
      if (!Number.isNaN(time)) timestamps.push(time);
    });
    (product.actionLogs || []).forEach((log) => {
      const time = new Date(log.createdAt).getTime();
      if (!Number.isNaN(time)) timestamps.push(time);
    });
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  };

  const getLogTime = (product: Product, action: string) => {
    const log = (product.actionLogs || []).find((item) => item.action === action);
    if (!log?.createdAt) return 0;
    const time = new Date(log.createdAt).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const getWorkflowPriority = (product: Product) => {
    if (product.status === 'in-progress') return 0;
    if (product.status === 'pending' && product.assigned_to) return 1;
    if (product.status === 'pending') return 2;
    if (product.status === 'completed') return 3;
    return 4;
  };

  const getWorkflowSortTime = (product: Product) => {
    const generationStart = getLogTime(product, 'generation_start');
    if (generationStart) return generationStart;

    if (product.assignedAt) {
      const assigned = new Date(product.assignedAt).getTime();
      if (!Number.isNaN(assigned)) return assigned;
    }

    return getActivityTime(product);
  };

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      // Filter by status and in-progress sub-phases
      if (activeFilter === 'generation') {
        if (p.status !== 'in-progress' || getStage(p) !== 'generation') return false;
      } else if (activeFilter === 'to-qc') {
        if (p.status !== 'in-progress' || getStage(p) !== 'to-qc') return false;
      } else if (activeFilter === 'qc') {
        if (p.status !== 'in-progress' || getStage(p) !== 'qc') return false;
      } else if (activeFilter === 'post') {
        if (getStage(p) !== 'post') return false;
      } else if (activeFilter !== 'all' && p.status !== activeFilter) {
        return false;
      }

      // Filter by worker
      if (activeWorkerFilter === 'claimed') {
        if (!p.assigned_to) return false;
      } else if (activeWorkerFilter !== 'all' && getWorkerFilterKey(p) !== activeWorkerFilter) {
        return false;
      }
      if (activeUnassignedOnly && p.assigned_to) return false;
      if (activeCategoryFilter !== 'all') {
        const category = (p.category || '').trim() || 'Uncategorized';
        if (category !== activeCategoryFilter) return false;
      }

      // Filter by date (based on latest action/update timestamp)
      if (activeDateFilter) {
        const dateKey = getProductDateKey(p);
        if (!dateKey || dateKey !== activeDateFilter) return false;
      }

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

    return filtered.sort((a, b) => {
      const prioDiff = getWorkflowPriority(a) - getWorkflowPriority(b);
      if (prioDiff !== 0) return prioDiff;

      const timeDiff = getWorkflowSortTime(b) - getWorkflowSortTime(a);
      if (timeDiff !== 0) return timeDiff;

      return b.product_name.localeCompare(a.product_name);
    });
  }, [products, userId, searchQuery, activeFilter, activeView, activeWorkerFilter, activeUnassignedOnly, activeCategoryFilter, activeDateFilter]);

  const myProducts = filteredProducts.filter((p) => p.assigned_to === userId);
  const unassignedProducts = filteredProducts.filter((p) => !p.assigned_to);
  const myProductIds = useMemo(() => myProducts.map((p) => p.id), [myProducts]);
  const canExpandMine = useMemo(() => myProductIds.some((id) => !expandedSet.has(id)), [myProductIds, expandedSet]);
  const canCollapseMine = useMemo(() => myProductIds.some((id) => expandedSet.has(id)), [myProductIds, expandedSet]);

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
            <div className="px-4 py-2 bg-gray-100 border-y border-gray-200 text-[11px] font-bold uppercase text-gray-500 flex items-center justify-between gap-3">
              <span>My Assigned Tasks ({myProducts.length})</span>
              <div className="flex items-center gap-1.5 normal-case">
                <button
                  type="button"
                  onClick={() => expandProducts(myProductIds)}
                  disabled={!canExpandMine}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={() => collapseProducts(myProductIds)}
                  disabled={!canCollapseMine}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Collapse all
                </button>
              </div>
            </div>
          )}
          {myProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              expanded={expandedSet.has(product.id)}
              onToggleExpand={() => toggleProductExpanded(product.id)}
            />
          ))}
          {unassignedProducts.length > 0 && (
            <div className="px-4 py-2 bg-amber-50 border-y border-amber-100 text-[11px] font-bold uppercase text-amber-600">
              Unassigned - Available to Claim ({unassignedProducts.length})
            </div>
          )}
          {unassignedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              expanded={expandedSet.has(product.id)}
              onToggleExpand={() => toggleProductExpanded(product.id)}
            />
          ))}
        </>
      ) : (
        <Virtuoso
          style={{ height: '100%', width: '100%' }}
          data={filteredProducts}
          itemContent={(_, product: Product) => (
            <ProductCard
              product={product}
              expanded={expandedSet.has(product.id)}
              onToggleExpand={() => toggleProductExpanded(product.id)}
            />
          )}
        />
      )}
    </div>
  );
};
