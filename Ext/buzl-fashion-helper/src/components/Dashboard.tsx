import React, { useMemo, useState } from 'react';
import { CalendarDays, Search, UserRound } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import type { FilterStatus, Product } from '../types';

export const Dashboard: React.FC = () => {
  const {
    products,
    userId,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    activeView,
    setActiveView,
    activeWorkerFilter,
    setActiveWorkerFilter,
    activeDateFilter,
    setActiveDateFilter,
    expandedProductIds,
    expandAllProducts,
    collapseAllProducts,
  } = useCsvStore();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const myProducts = products.filter((p) => p.assigned_to === userId);
  const unassignedProducts = products.filter((p) => !p.assigned_to);
  const total = activeView === 'mine' ? myProducts.length : products.length;
  const completed = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'completed').length;
  const doing = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'in-progress').length;
  const pending = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'pending').length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

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

  const baseFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeWorkerFilter !== 'all' && getWorkerFilterKey(p) !== activeWorkerFilter) return false;

      if (activeDateFilter) {
        const dateKey = getProductDateKey(p);
        if (!dateKey || dateKey !== activeDateFilter) return false;
      }

      if (activeView === 'mine') {
        const isMine = p.assigned_to === userId;
        const isUnassigned = !p.assigned_to;
        if (!isMine && !isUnassigned) return false;
      }

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
  }, [products, activeWorkerFilter, activeDateFilter, activeView, userId, searchQuery]);

  const filterCounts = useMemo(() => ({
    all: baseFilteredProducts.length,
    pending: baseFilteredProducts.filter((p) => p.status === 'pending').length,
    'in-progress': baseFilteredProducts.filter((p) => p.status === 'in-progress').length,
    completed: baseFilteredProducts.filter((p) => p.status === 'completed').length,
  }), [baseFilteredProducts]);

  const filters: { label: string; value: FilterStatus }[] = [
    { label: `All (${filterCounts.all})`, value: 'all' },
    { label: `Pending (${filterCounts.pending})`, value: 'pending' },
    { label: `In-Progress (${filterCounts['in-progress']})`, value: 'in-progress' },
    { label: `Completed (${filterCounts.completed})`, value: 'completed' },
  ];

  const workerOptions = useMemo(() => {
    const workers = new Map<string, string>();

    products.forEach((product) => {
      if (product.assigned_to) {
        const label = product.assignee?.username || `Worker ${product.assigned_to.slice(0, 6)}`;
        workers.set(`id:${product.assigned_to}`, label);
        return;
      }
      if (product.assignee?.username) {
        workers.set(`name:${product.assignee.username.toLowerCase()}`, product.assignee.username);
      }
    });

    return Array.from(workers.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return products
      .filter((product) => product.product_name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [products, searchQuery]);

  const statusBadgeClass = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-500';
  };

  const assignedLabel = (product: Product) => {
    if (!product.assigned_to) return 'Unassigned';
    if (product.assigned_to === userId) return 'You';
    return product.assignee?.username || `Worker ${product.assigned_to.slice(0, 6)}`;
  };

  const canExpandAll = products.length > 0 && expandedProductIds.length < products.length;
  const canCollapseAll = expandedProductIds.length > 0;

  return (
    <div className="bg-white border-b border-gray-200 p-3 flex flex-col gap-3 shadow-sm z-10 relative">
      <div className="flex flex-wrap justify-between items-end gap-1.5">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-gray-900 leading-none">{progress}%</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{activeView === 'mine' ? 'My Progress' : 'All Progress'}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:flex sm:gap-3">
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-800 leading-none">{completed}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Done</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-blue-600 leading-none">{doing}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Doing</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-gray-800 leading-none">{pending}</span>
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Left</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-green-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveView('mine')}
          className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
            activeView === 'mine' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          My Tasks <span className="ml-1 opacity-80">({myProducts.length})</span>
          {unassignedProducts.length > 0 && <span className="ml-1 text-amber-500">{unassignedProducts.length} free</span>}
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
            activeView === 'all' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          All Products <span className="ml-1 opacity-80">({products.length})</span>
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-gray-400" size={14} />
        </div>
        <input
          type="text"
          placeholder="Search products or URLs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
        />
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {searchSuggestions.map((product) => (
              <button
                key={product.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchQuery(product.product_name);
                  setShowSuggestions(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate pr-2 text-xs font-semibold text-gray-800">{product.product_name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(product.status)}`}>
                    {product.status}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-semibold text-gray-500">
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">Assigned: {assignedLabel(product)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <label className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
            <UserRound size={13} />
          </span>
          <select
            value={activeWorkerFilter}
            onChange={(e) => setActiveWorkerFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-1.5 pl-7 pr-2 text-[11px] font-semibold text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All workers</option>
            <option value="unassigned">Unassigned only</option>
            {workerOptions.map((worker) => (
              <option key={worker.value} value={worker.value}>
                {worker.label}
              </option>
            ))}
          </select>
        </label>

        <label className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
            <CalendarDays size={13} />
          </span>
          <input
            type="date"
            value={activeDateFilter}
            onChange={(e) => setActiveDateFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-1.5 pl-7 pr-2 text-[11px] font-semibold text-gray-700 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={expandAllProducts}
          disabled={!canExpandAll}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Expand all
        </button>
        <button
          onClick={collapseAllProducts}
          disabled={!canCollapseAll}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Collapse all
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
              activeFilter === filter.value
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};
