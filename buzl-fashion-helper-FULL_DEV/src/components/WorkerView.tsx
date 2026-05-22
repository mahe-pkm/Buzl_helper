import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, ExternalLink, Copy, CheckCircle2, Clock, Circle, Search, RefreshCw, MessageSquare, X, Check, Package, User, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import type { Product } from '../types';
import { TaskTimer } from './TaskTimer';
import { buildThumbnailCandidates } from '../utils/driveThumbnail';
import { getProductPhase } from '../utils/productPhase';
import { getCachedThumb, setCachedThumb } from '../utils/thumbnailCache';

type WorkerTab = 'mine' | 'all';

export const WorkerView: React.FC = () => {
  const { authUser, logout, products, setProducts, searchQuery, setSearchQuery } = useCsvStore();
  const [activeTab, setActiveTab] = useState<WorkerTab>('mine');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in-progress' | 'generation' | 'qc' | 'completed'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchWithAuth('/products');
      setProducts(data);
    } catch { toast.error('Failed to refresh'); }
    finally { setRefreshing(false); }
  };

  // Partition products
  const myProducts = useMemo(() => products.filter(p => p.assigned_to === authUser?.id), [products, authUser]);
  const unassignedProducts = useMemo(() => products.filter(p => !p.assigned_to), [products]);
  const allProducts = products;
  const searchNeedle = searchQuery.trim().toLowerCase();

  const matchesSearch = (product: Product) => {
    if (!searchNeedle) return true;
    return (
      product.product_name.toLowerCase().includes(searchNeedle) ||
      product.drive_folder.toLowerCase().includes(searchNeedle) ||
      (product.reference_link || '').toLowerCase().includes(searchNeedle)
    );
  };
  const matchesFilterStatus = (product: Product) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'generation') return product.status === 'in-progress' && getProductPhase(product) === 'generation';
    if (filterStatus === 'qc') return product.status === 'in-progress' && getProductPhase(product) === 'qc';
    return product.status === filterStatus;
  };
  const matchesFilterCategory = (product: Product) => {
    if (filterCategory === 'all') return true;
    const category = (product.category || '').trim() || 'Uncategorized';
    return category === filterCategory;
  };
  const activityTime = (product: Product) => {
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

  // Stats for header
  const stats = useMemo(() => ({
    total: myProducts.length,
    done: myProducts.filter(p => p.status === 'completed').length,
    inProgress: myProducts.filter(p => p.status === 'in-progress').length,
    pending: myProducts.filter(p => p.status === 'pending').length,
    pct: myProducts.length > 0 ? Math.round((myProducts.filter(p => p.status === 'completed').length / myProducts.length) * 100) : 0,
  }), [myProducts]);

  // Overall progress for "All" tab
  const globalStats = useMemo(() => ({
    total: allProducts.length,
    done: allProducts.filter(p => p.status === 'completed').length,
    inProgress: allProducts.filter(p => p.status === 'in-progress').length,
    unassigned: unassignedProducts.length,
    pct: allProducts.length > 0 ? Math.round((allProducts.filter(p => p.status === 'completed').length / allProducts.length) * 100) : 0,
  }), [allProducts, unassignedProducts]);

  const mineBaseFiltered = useMemo(() => {
    return [...myProducts, ...unassignedProducts].filter(matchesSearch).sort((a, b) => activityTime(b) - activityTime(a));
  }, [myProducts, unassignedProducts, searchNeedle]);

  const allBaseFiltered = useMemo(() => {
    return allProducts.filter(matchesSearch).sort((a, b) => activityTime(b) - activityTime(a));
  }, [allProducts, searchNeedle]);

  // "Mine" tab filtered list (my tasks + unassigned)
  const mineFiltered = useMemo(() => {
    return mineBaseFiltered.filter((product) => matchesFilterStatus(product) && matchesFilterCategory(product));
  }, [mineBaseFiltered, filterStatus, filterCategory]);

  // "All" tab filtered
  const allFiltered = useMemo(() => {
    return allBaseFiltered.filter((product) => matchesFilterStatus(product) && matchesFilterCategory(product));
  }, [allBaseFiltered, filterStatus, filterCategory]);

  const filterBase = activeTab === 'mine' ? mineBaseFiltered : allBaseFiltered;
  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    filterBase.forEach((product) => {
      const category = (product.category || '').trim() || 'Uncategorized';
      values.add(category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [filterBase]);
  const filterCounts = useMemo(() => ({
    all: filterBase.length,
    pending: filterBase.filter((p) => p.status === 'pending').length,
    'in-progress': filterBase.filter((p) => p.status === 'in-progress').length,
    generation: filterBase.filter((p) => p.status === 'in-progress' && getProductPhase(p) === 'generation').length,
    qc: filterBase.filter((p) => p.status === 'in-progress' && getProductPhase(p) === 'qc').length,
    completed: filterBase.filter((p) => p.status === 'completed').length,
  }), [filterBase]);

  const searchSuggestions = useMemo(() => {
    if (!searchNeedle) return [];
    return filterBase
      .filter((product) => product.product_name.toLowerCase().includes(searchNeedle))
      .slice(0, 6);
  }, [filterBase, searchNeedle]);

  const handleSetStatus = async (product: Product, status: string) => {
    const prev = product.status;
    setUpdatingId(product.id);
    setProducts(products.map(p => p.id === product.id ? { ...p, status } : p));
    try {
      await fetchWithAuth(`/products/${product.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    } catch {
      setProducts(products.map(p => p.id === product.id ? { ...p, status: prev } : p));
      toast.error('Update failed');
    } finally { setUpdatingId(null); }
  };

  const handleSaveNote = async (productId: string) => {
    try {
      await fetchWithAuth(`/products/${productId}/notes`, { method: 'PATCH', body: JSON.stringify({ notes: noteText }) });
      setProducts(products.map(p => p.id === productId ? { ...p, notes: noteText } : p));
      setEditingNoteId(null);
      toast.success('Note saved');
    } catch { toast.error('Note save failed'); }
  };

  const handleClaim = async (product: Product) => {
    setClaimingId(product.id);
    try {
      await fetchWithAuth(`/products/${product.id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: authUser?.id }) });
      setProducts(products.map(p => p.id === product.id ? { ...p, assigned_to: authUser?.id, assignee: { id: authUser?.id, username: authUser?.username } } : p));
      toast.success(`"${product.product_name}" claimed!`);
    } catch { toast.error('Claim failed'); }
    finally { setClaimingId(null); }
  };

  const handleTimerProductUpdated = (updated: Product) => {
    setProducts(products.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  };

  const statusIcon = (p: Product) => {
    if (p.status === 'completed') return <CheckCircle2 className="text-green-500" size={20} />;
    if (p.status === 'in-progress') return <Clock className="text-blue-400" size={20} />;
    return <Circle className="text-gray-300" size={20} />;
  };

  const statusBadge = (product: Product) => {
    const cfg: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      'in-progress': 'bg-blue-100 text-blue-600',
      pending: 'bg-gray-100 text-gray-400',
    };
    const phase = getProductPhase(product);
    const label = product.status === 'in-progress' ? (phase === 'qc' ? 'qc' : 'generation') : product.status;
    return <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cfg[product.status] || cfg.pending}`}>{label}</span>;
  };

  const suggestionStatusClass = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700';
    if (status === 'in-progress') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-500';
  };

  const assignedLabel = (product: Product) => {
    if (!product.assigned_to) return 'Unassigned';
    if (product.assigned_to === authUser?.id) return 'You';
    return product.assignee?.username || 'Member';
  };

  const expandedSet = useMemo(() => new Set(expandedIds), [expandedIds]);
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => (
      prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id]
    ));
  };

  const TaskCard = ({ product, isOwn }: { product: Product; isOwn: boolean }) => {
    const isExpanded = expandedSet.has(product.id);
    const localMainThumb = useMemo(() => getCachedThumb(product.id, 'main'), [product.id, product.thumbnail_cached_data]);
    const thumbnailCandidates = useMemo(
      () => [localMainThumb, product.thumbnail_cached_data, ...buildThumbnailCandidates(product.thumbnail_url, product.drive_folder)].filter(Boolean) as string[],
      [localMainThumb, product.thumbnail_cached_data, product.thumbnail_url, product.drive_folder],
    );
    const [thumbnailIndex, setThumbnailIndex] = useState(0);
    const thumbnailSrc = thumbnailCandidates[thumbnailIndex] || null;

    useEffect(() => {
      setThumbnailIndex(0);
    }, [product.id, thumbnailCandidates.join('|')]);

    return (
    <div className={`bg-white px-3 py-2 border-b border-gray-100 ${product.status === 'completed' ? 'opacity-70' : ''}`}>
      <div className="flex gap-2.5 rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
        {/* Status icon — only clickable for own tasks */}
        <div className="w-12 flex-shrink-0 sm:w-14">
        {isOwn ? (
          <button disabled={updatingId === product.id} onClick={() => {
            const next = product.status === 'pending' ? 'in-progress' : product.status === 'in-progress' ? 'completed' : 'pending';
            handleSetStatus(product, next);
          }} className="mb-1 flex h-6 w-12 items-center justify-center disabled:opacity-50" title={`Status: ${product.status}`}>
            {statusIcon(product)}
          </button>
        ) : (
          <div className="mb-1 flex h-6 w-12 items-center justify-center">{statusIcon(product)}</div>
        )}
        
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt="Preview"
            className="mb-1.5 h-10 w-12 rounded-md object-cover border border-gray-200 bg-white"
            onLoad={(e) => {
              const src = e.currentTarget.currentSrc || e.currentTarget.src;
              if (!src || src.startsWith('data:')) return;
              fetch(src).then((res) => (res.ok ? res.blob() : null)).then((blob) => {
                if (!blob) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                  if (!dataUrl) return;
                  setCachedThumb(product.id, 'main', dataUrl);
                };
                reader.readAsDataURL(blob);
              }).catch(() => {});
            }}
            onError={() => setThumbnailIndex((prev) => (prev < thumbnailCandidates.length - 1 ? prev + 1 : prev))}
          />
        ) : (
          <div className="mb-1.5 flex h-10 w-12 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[9px] font-semibold text-gray-400">
            IMG
          </div>
        )}

        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-1">
            <h3 className={`font-semibold text-[13px] leading-tight ${product.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {product.product_name}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {statusBadge(product)}
              <button onClick={() => { navigator.clipboard.writeText(product.product_name); toast.success('Copied!'); }} className="text-gray-400 hover:text-gray-600 p-0.5">
                <Copy size={11} />
              </button>
              <button
                onClick={() => toggleExpanded(product.id)}
                className="text-gray-400 hover:text-gray-700 p-0.5"
                title={isExpanded ? 'Collapse details' : 'Expand details'}
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>
          </div>

          {/* Assignee (for unassigned/all view) */}
          {!isOwn && (
            <p className="text-[10px] mt-0.5 flex items-center gap-1">
              <User size={9} />
              {product.assignee ? (
                <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Assigned: {product.assignee.username}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unassigned
                </span>
              )}
            </p>
          )}
          <p className="text-[10px] mt-0.5">
            <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-600">
              Category: {(product.category || '').trim() || 'Uncategorized'}
            </span>
          </p>

          {!isExpanded && !product.assigned_to && (
            <button
              onClick={() => handleClaim(product)}
              disabled={claimingId === product.id}
              className="mt-2 inline-flex rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {claimingId === product.id ? 'Claiming...' : '+ Claim this task'}
            </button>
          )}

          {isExpanded && (
            <div className="mt-2 border-t border-gray-100 pt-2 space-y-2">
              {/* Drive Folder */}
              {product.drive_folder && (
                <div className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100">
                  <span className="font-medium text-blue-800 text-[11px] truncate pr-2 max-w-[42vw] sm:max-w-[160px]" title={product.drive_folder}>Drive Folder</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => window.open(product.drive_folder, '_blank')} className="p-1 rounded text-blue-600 hover:bg-blue-100"><ExternalLink size={12} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(product.drive_folder); toast.success('Copied!'); }} className="p-1 rounded text-blue-600 hover:bg-blue-100"><Copy size={12} /></button>
                  </div>
                </div>
              )}

              {/* Reference Link */}
              {product.reference_link && (
                <div className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1.5 rounded-lg border border-purple-100">
                  <span className="font-medium text-purple-800 text-[11px] truncate pr-2 max-w-[42vw] sm:max-w-[160px]" title={product.reference_link}>Reference Link</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => window.open(product.reference_link!, '_blank')} className="p-1 rounded text-purple-600 hover:bg-purple-100"><ExternalLink size={12} /></button>
                    <button onClick={() => { navigator.clipboard.writeText(product.reference_link!); toast.success('Copied!'); }} className="p-1 rounded text-purple-600 hover:bg-purple-100"><Copy size={12} /></button>
                  </div>
                </div>
              )}

              {/* Claim button for unassigned */}
              {!product.assigned_to && (
                <button onClick={() => handleClaim(product)} disabled={claimingId === product.id}
                  className="w-full text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg py-1 transition-colors disabled:opacity-50">
                  {claimingId === product.id ? 'Claiming...' : '+ Claim this task'}
                </button>
              )}

              {/* Notes (own tasks only) */}
              {isOwn && (
                editingNoteId === product.id ? (
                  <div className="flex gap-1">
                    <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note..." onKeyDown={e => e.key === 'Enter' && handleSaveNote(product.id)}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button onClick={() => handleSaveNote(product.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
                    <button onClick={() => setEditingNoteId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingNoteId(product.id); setNoteText(product.notes || ''); }}
                    className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
                    <MessageSquare size={10} />
                    {product.notes ? <span className="truncate max-w-[52vw] italic sm:max-w-[220px]">{product.notes}</span> : 'Add note'}
                  </button>
                )
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                <TaskTimer
                  product={product}
                  canEdit={isOwn}
                  onProductUpdated={handleTimerProductUpdated}
                  variant="row"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
  };

  const filtered = activeTab === 'mine' ? mineFiltered : allFiltered;
  const mineAssignedFiltered = mineFiltered.filter((p) => p.assigned_to === authUser?.id);
  const mineUnassignedFiltered = mineFiltered.filter((p) => !p.assigned_to);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-50 md:mx-auto md:max-w-[480px] md:border-x md:border-gray-200">
      {/* Header */}
      <header className="flex-shrink-0 bg-gray-900 text-white px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="bg-white/10 p-1.5 rounded-lg"><Package size={14} /></div>
          <span className="font-bold text-sm">Buzl Helper</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/buzl-fashion-helper.zip" download className="text-white/70 hover:text-white p-1 mr-1" title="Download Chrome Extension">
            <Download size={13} />
          </a>
          <button onClick={refresh} disabled={refreshing} className="text-white/70 hover:text-white p-1">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">{authUser?.username}</span>
          <button onClick={logout} className="text-white/70 hover:text-red-400 p-1"><LogOut size={13} /></button>
        </div>
      </header>

      {/* Progress bar — shows based on active tab */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2.5">
        {activeTab === 'mine' ? (
          <>
            <div className="flex flex-wrap justify-between items-end gap-2 mb-1">
              <div>
                <span className="text-xl font-bold text-gray-900 leading-none">{stats.pct}%</span>
                <span className="text-xs text-gray-400 ml-1.5">my progress</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-right">
                <div><p className="text-sm font-bold text-green-600">{stats.done}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Done</p></div>
                <div><p className="text-sm font-bold text-blue-500">{stats.inProgress}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Doing</p></div>
                <div><p className="text-sm font-bold text-gray-500">{stats.pending}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Left</p></div>
                <div><p className="text-sm font-bold text-gray-700">{stats.total}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Mine</p></div>
              </div>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-700" style={{ width: `${stats.pct}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap justify-between items-end gap-2 mb-1">
              <div>
                <span className="text-xl font-bold text-gray-900 leading-none">{globalStats.pct}%</span>
                <span className="text-xs text-gray-400 ml-1.5">overall done</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-right">
                <div><p className="text-sm font-bold text-green-600">{globalStats.done}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Done</p></div>
                <div><p className="text-sm font-bold text-blue-500">{globalStats.inProgress}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Doing</p></div>
                <div><p className="text-sm font-bold text-amber-500">{globalStats.unassigned}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Free</p></div>
                <div><p className="text-sm font-bold text-gray-700">{globalStats.total}</p><p className="text-[9px] text-gray-400 uppercase font-semibold">Total</p></div>
              </div>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-700" style={{ width: `${globalStats.pct}%` }} />
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 flex">
        <button onClick={() => setActiveTab('mine')}
          className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'mine' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
          My Tasks {myProducts.length > 0 && <span className="ml-1 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{myProducts.length}</span>}
          {unassignedProducts.length > 0 && <span className="ml-1 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[10px]">{unassignedProducts.length} free</span>}
        </button>
        <button onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 text-xs font-bold transition-colors ${activeTab === 'all' ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
          All Products <span className="ml-1 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{allProducts.length}</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-3 py-2 flex flex-col gap-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          {showSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
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
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${suggestionStatusClass(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-blue-700">
                    <span className="rounded bg-blue-50 px-1.5 py-0.5">Assigned: {assignedLabel(product)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {(['all', 'pending', 'in-progress', 'generation', 'qc', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-2 py-1 rounded text-[10px] font-semibold capitalize transition-colors ${filterStatus === f ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {f === 'all' ? `All (${filterCounts.all})` : f === 'pending' ? `Pending (${filterCounts.pending})` : f === 'in-progress' ? `In-Progress (${filterCounts['in-progress']})` : f === 'generation' ? `Generation (${filterCounts.generation})` : f === 'qc' ? `QC (${filterCounts.qc})` : `Completed (${filterCounts.completed})`}
            </button>
          ))}
        </div>
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'mine' && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-gray-600 text-sm">No tasks yet</p>
            <p className="text-xs mt-1">Check "All Products" tab to claim unassigned tasks</p>
          </div>
        ) : activeTab === 'all' && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-600 text-sm">No matching products</p>
          </div>
        ) : (
          <div>
            {activeTab === 'mine' && (
              <>
                {mineAssignedFiltered.length > 0 && (
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">My Assigned Tasks ({mineAssignedFiltered.length})</p>
                  </div>
                )}
                {mineAssignedFiltered.map(p => (
                  <TaskCard key={p.id} product={p} isOwn={true} />
                ))}
                {mineUnassignedFiltered.length > 0 && (
                  <div className="px-3 py-1.5 bg-amber-50 border-y border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Unassigned - Available to Claim ({mineUnassignedFiltered.length})
                    </p>
                  </div>
                )}
                {mineUnassignedFiltered.map((p) => <TaskCard key={p.id} product={p} isOwn={false} />)}
              </>
            )}
            {activeTab === 'all' && filtered.map(p => (
              <TaskCard key={p.id} product={p} isOwn={p.assigned_to === authUser?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
