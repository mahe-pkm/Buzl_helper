import React from 'react';
import { Search } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import type { FilterStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { products, userId, searchQuery, setSearchQuery, activeFilter, setActiveFilter, activeView, setActiveView } = useCsvStore();

  const myProducts = products.filter((p) => p.assigned_to === userId);
  const unassignedProducts = products.filter((p) => !p.assigned_to);
  const total = activeView === 'mine' ? myProducts.length : products.length;
  const completed = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'completed').length;
  const doing = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'in-progress').length;
  const pending = (activeView === 'mine' ? myProducts : products).filter((p) => p.status === 'pending').length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const filters: { label: string; value: FilterStatus }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In-Progress', value: 'in-progress' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4 flex flex-col gap-4 shadow-sm z-10 relative">
      <div className="flex flex-wrap justify-between items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-bold text-gray-900 leading-none">{progress}%</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{activeView === 'mine' ? 'My Progress' : 'All Progress'}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:flex sm:gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 leading-none">{completed}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Done</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-blue-600 leading-none">{doing}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Doing</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-800 leading-none">{pending}</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Left</span>
          </div>
        </div>
      </div>

      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-green-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveView('mine')}
          className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
            activeView === 'mine' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          My Tasks <span className="ml-1 opacity-80">({myProducts.length})</span>
          {unassignedProducts.length > 0 && <span className="ml-1 text-amber-500">{unassignedProducts.length} free</span>}
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
            activeView === 'all' ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          All Products <span className="ml-1 opacity-80">({products.length})</span>
        </button>
      </div>

      <div className="relative mt-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-gray-400" size={16} />
        </div>
        <input
          type="text"
          placeholder="Search products or URLs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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
