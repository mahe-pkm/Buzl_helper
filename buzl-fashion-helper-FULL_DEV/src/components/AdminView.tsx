import React, { useState, useMemo, useEffect } from 'react';
import { LogOut, RefreshCw, Users, Package, Search, Upload, UserPlus, Trash2, KeyRound, CheckCircle2, X, Download, AlertTriangle, ExternalLink, Copy, MessageSquare, Clock, ChevronRight, RotateCcw } from 'lucide-react';
import { exportCSV } from '../utils/csvParser';
import { toast } from 'sonner';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import { parseCSV } from '../utils/csvParser';
import type { Product } from '../types';
import { TaskTimer } from './TaskTimer';

type Tab = 'products' | 'users';
const LAST_DRIVE_LINK_KEY = 'buzl_last_drive_link';
const LAST_REFERENCE_LINK_KEY = 'buzl_last_reference_link';

export const AdminView: React.FC = () => {
  const { authUser, logout, products, workers, setProducts, setWorkers, updateProduct } = useCsvStore();
  const [tab, setTab] = useState<Tab>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorker, setFilterWorker] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false); // Default to false to prevent accidental deletion
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkWorker, setBulkWorker] = useState('');
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [resettingStatusId, setResettingStatusId] = useState<string | null>(null);
  const [globalRefLink, setGlobalRefLink] = useState(() => localStorage.getItem(LAST_REFERENCE_LINK_KEY) || '');
  
  // Sorting & Pagination State
  const [pageSize, setPageSize] = useState<number | 'ALL'>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
  
  // Custom Confirm Modal State
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);

  // Drive Import State
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [driveImportStep, setDriveImportStep] = useState(1); // 1 = input, 2 = review
  const [driveUrl, setDriveUrl] = useState(() => localStorage.getItem(LAST_DRIVE_LINK_KEY) || '');
  const [driveRecursive, setDriveRecursive] = useState(false);
  const [driveImporting, setDriveImporting] = useState(false);
  const [driveLog, setDriveLog] = useState<string[]>([]);
  const [driveFoundFolders, setDriveFoundFolders] = useState<{ id: string, name: string, path: string, webViewLink: string, selected: boolean, exists: boolean, thumbnail: string | null }[]>([]);

  const askConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  const applyLastUsedLinks = () => {
    const latestProductDrive = products.find((p) => Boolean(p.drive_folder))?.drive_folder || '';
    const latestProductReference = products.find((p) => Boolean(p.reference_link))?.reference_link || '';
    const lastDrive = localStorage.getItem(LAST_DRIVE_LINK_KEY) || latestProductDrive;
    const lastReference = localStorage.getItem(LAST_REFERENCE_LINK_KEY) || latestProductReference;

    if (!lastDrive && !lastReference) {
      toast.info('No last used Drive links found');
      return;
    }

    setDriveUrl(lastDrive);
    setGlobalRefLink(lastReference);
    if (lastDrive) localStorage.setItem(LAST_DRIVE_LINK_KEY, lastDrive);
    if (lastReference) localStorage.setItem(LAST_REFERENCE_LINK_KEY, lastReference);
    toast.success('Loaded Drive and reference links');
  };

  useEffect(() => {
    const clean = driveUrl.trim();
    if (clean) localStorage.setItem(LAST_DRIVE_LINK_KEY, clean);
    else localStorage.removeItem(LAST_DRIVE_LINK_KEY);
  }, [driveUrl]);

  useEffect(() => {
    const clean = globalRefLink.trim();
    if (clean) localStorage.setItem(LAST_REFERENCE_LINK_KEY, clean);
    else localStorage.removeItem(LAST_REFERENCE_LINK_KEY);
  }, [globalRefLink]);

  // User management state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('worker');
  const [creatingUser, setCreatingUser] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    const [prods, wrks] = await Promise.all([fetchWithAuth('/products'), fetchWithAuth('/users')]);
    setProducts(prods); setWorkers(wrks);
    toast.success('Refreshed');
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) { toast.error('Upload a .csv file'); return; }
    
    const executeUpload = async () => {
      setUploading(true);
      try {
        const parsed = await parseCSV(file);
        if (!parsed.length) { toast.error('CSV is empty'); return; }
        
        // Apply global reference link if row doesn't have one
        const productsToUpload = parsed.map(p => ({
          ...p,
          reference_link: p.reference_link || globalRefLink || null
        }));

        await fetchWithAuth('/products', { method: 'POST', body: JSON.stringify({ products: productsToUpload, replace: replaceMode }) });
        setProducts(await fetchWithAuth('/products'));
        setSelectedIds(new Set());
        toast.success(`✅ ${parsed.length} products ${replaceMode ? 'replaced' : 'added'}`);
      } catch (e: any) { toast.error(e.message || 'Upload failed'); }
      finally { setUploading(false); }
    };

    if (replaceMode && products.length > 0) {
      askConfirm(`Replace all ${products.length} existing products with the new CSV?`, executeUpload);
    } else {
      executeUpload();
    }
  };

  const handleDriveImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrl) return;

    const cleanDriveUrl = driveUrl.trim();
    const cleanRefLink = globalRefLink.trim();
    if (cleanDriveUrl) localStorage.setItem(LAST_DRIVE_LINK_KEY, cleanDriveUrl);
    else localStorage.removeItem(LAST_DRIVE_LINK_KEY);
    if (cleanRefLink) localStorage.setItem(LAST_REFERENCE_LINK_KEY, cleanRefLink);
    else localStorage.removeItem(LAST_REFERENCE_LINK_KEY);

    let folderId = cleanDriveUrl;
    const folderMatch = driveUrl.match(/folder[s]?\/([a-zA-Z0-9-_]+)/);
    const idMatch = driveUrl.match(/id=([a-zA-Z0-9-_]+)/);
    const dMatch = driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    
    if (folderMatch) folderId = folderMatch[1];
    else if (idMatch) folderId = idMatch[1];
    else if (dMatch) folderId = dMatch[1];

    const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
    if (!API_KEY) {
      setDriveLog(['Google Drive API key is missing. Add VITE_GOOGLE_DRIVE_API_KEY to buzl-fashion-helper-FULL_DEV/.env and restart Vite.']);
      toast.error('Missing VITE_GOOGLE_DRIVE_API_KEY');
      return;
    }

    setDriveImporting(true);
    setDriveLog(['Starting Google Drive extraction...']);
    const addLog = (msg: string) => setDriveLog(prev => [...prev, msg]);
    const allFolders: any[] = [];

    const fetchThumbnail = async (id: string): Promise<string | null> => {
      try {
        const url = new URL("https://www.googleapis.com/drive/v3/files");
        url.searchParams.append('q', `'${id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`);
        url.searchParams.append('key', API_KEY);
        url.searchParams.append('fields', 'files(thumbnailLink)');
        url.searchParams.append('pageSize', '1');
        const res = await fetch(url.toString());
        const data = await res.json();
        return data.files && data.files.length > 0 ? data.files[0].thumbnailLink : null;
      } catch { return null; }
    };

    const fetchFolders = async (parentId: string, currentPath = '') => {
      let pageToken = '';
      while (true) {
        const url = new URL("https://www.googleapis.com/drive/v3/files");
        url.searchParams.append('q', `'${parentId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`);
        url.searchParams.append('key', API_KEY);
        url.searchParams.append('fields', 'nextPageToken, files(id, name, webViewLink)');
        url.searchParams.append('pageSize', '1000');
        if (pageToken) url.searchParams.append('pageToken', pageToken);

        try {
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error(`API Error: ${res.status}`);
          const data = await res.json();
          
          for (const item of data.files || []) {
            const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            const thumb = await fetchThumbnail(item.id);
            allFolders.push({ ...item, path: itemPath, thumbnail: thumb });
            addLog(`Found folder: ${itemPath} ${thumb ? '(Preview ✓)' : ''}`);
            if (driveRecursive) await fetchFolders(item.id, itemPath);
          }
          pageToken = data.nextPageToken;
          if (!pageToken) break;
        } catch (err: any) {
          addLog(`Error fetching folder ${parentId}: ${err.message}`);
          break;
        }
      }
    };

    try {
      await fetchFolders(folderId);
      if (allFolders.length === 0) {
        toast.error('No folders found or access denied (is the folder public?)');
        setDriveImporting(false);
        return;
      }
      
      const mapped = allFolders.map(f => {
        const exists = products.some(p => p.drive_folder && p.drive_folder.includes(f.id));
        return {
          id: f.id,
          name: f.name,
          path: f.path,
          webViewLink: f.webViewLink,
          thumbnail: f.thumbnail,
          exists,
          selected: !exists // Uncheck by default if already exists
        };
      });
      setDriveFoundFolders(mapped);
      setDriveImportStep(2);
    } catch (err: any) {
      toast.error('Failed to extract Google Drive link');
    }
    setDriveImporting(false);
  };

  const handleDriveImportConfirm = async () => {
    const selected = driveFoundFolders.filter(f => f.selected);
    if (selected.length === 0) return;

    setDriveImporting(true);
    const productsToUpload = selected.map(f => ({
      product_name: f.path,
      drive_folder: f.webViewLink || '',
      reference_link: globalRefLink || null,
      thumbnail_url: f.thumbnail || null,
      last_action: 'Imported from Drive'
    }));

    try {
      await fetchWithAuth('/products', { method: 'POST', body: JSON.stringify({ products: productsToUpload, replace: replaceMode }) });
      setProducts(await fetchWithAuth('/products'));
      setSelectedIds(new Set());
      toast.success(`✅ ${selected.length} folders imported from Drive!`);
      setDriveImportOpen(false);
    } catch (err: any) { toast.error(err.message || 'Failed to save products to database'); }
    setDriveImporting(false);
  };

  const handleClearAll = async () => {
    askConfirm(`Delete ALL ${products.length} products? This cannot be undone.`, async () => {
      setClearing(true);
      try {
        await fetchWithAuth('/products', { method: 'DELETE' });
        setProducts([]); setSelectedIds(new Set());
        toast.success('All products deleted.');
      } catch { toast.error('Failed to clear products'); }
      finally { setClearing(false); }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    askConfirm(`Delete ${selectedIds.size} selected products? This cannot be undone.`, async () => {
      setDeletingProductId('bulk');
      try {
        await Promise.all(Array.from(selectedIds).map(id => fetchWithAuth(`/products/${id}`, { method: 'DELETE' })));
        setProducts(await fetchWithAuth('/products'));
        setSelectedIds(new Set());
        toast.success(`Deleted ${selectedIds.size} products.`);
      } catch { toast.error('Bulk delete failed'); }
      finally { setDeletingProductId(null); }
    });
  };

  const downloadTemplateCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Path,Type,View Link,Download Link,Reference Link\nExample Product,folder/Example Product,Folder,https://drive.google.com/drive/folders/EXAMPLE,,https://reference.com/example";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "buzl_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteProduct = async (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    askConfirm(`Delete product "${product.product_name}"? This action cannot be undone.`, async () => {
      setDeletingProductId(id);
      try {
        await fetchWithAuth(`/products/${id}`, { method: 'DELETE' });
        setProducts(products.filter(p => p.id !== id));
        setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        toast.success('Product deleted');
      } catch { toast.error('Delete failed'); }
      finally { setDeletingProductId(null); }
    });
  };

  const handleBulkAssign = async () => {
    if (!bulkWorker || selectedIds.size === 0) return;
    const worker = workers.find(w => w.id === bulkWorker);
    const workerName = worker ? worker.username : 'Unassigned';
    
    askConfirm(`Assign ${selectedIds.size} selected products to ${workerName}?`, async () => {
      const ids = Array.from(selectedIds);
      try {
        await Promise.all(ids.map(id => fetchWithAuth(`/products/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: bulkWorker === 'unassigned' ? null : bulkWorker }) })));
        const fresh = await fetchWithAuth('/products');
        setProducts(fresh); setSelectedIds(new Set());
        toast.success(`Assigned ${ids.length} products`);
      } catch { toast.error('Bulk assign failed'); }
    });
  };

  const handleStatusOverride = async (productId: string, status: string) => {
    try {
      await fetchWithAuth(`/products/${productId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      updateProduct(productId, { status });
      toast.success('Status updated');
    } catch { toast.error('Status update failed'); }
  };

  const handleResetStatus = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    if (product.status === 'pending') {
      toast.info('Product is already pending');
      return;
    }

    setResettingStatusId(productId);
    try {
      await fetchWithAuth(`/products/${productId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'pending' }),
      });
      updateProduct(productId, {
        status: 'pending',
        last_action: 'Status reset to pending by admin',
      });
      toast.success(`Status reset: ${product.product_name}`);
    } catch {
      toast.error('Status reset failed');
    } finally {
      setResettingStatusId(null);
    }
  };

  const handleBulkResetStatus = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const resettable = ids.filter((id) => {
      const product = products.find((p) => p.id === id);
      return product && product.status !== 'pending';
    });

    if (resettable.length === 0) {
      toast.info('Selected products are already pending');
      return;
    }

    askConfirm(`Reset status to pending for ${resettable.length} selected products?`, async () => {
      setResettingStatusId('bulk');
      try {
        await Promise.all(
          resettable.map((id) =>
            fetchWithAuth(`/products/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'pending' }),
            })
          )
        );
        const fresh = await fetchWithAuth('/products');
        setProducts(fresh);
        setSelectedIds(new Set());
        toast.success(`Reset ${resettable.length} products to pending`);
      } catch {
        toast.error('Bulk status reset failed');
      } finally {
        setResettingStatusId(null);
      }
    });
  };

  const handleTimerProductUpdated = (updated: Product) => {
    setProducts(products.map(p => p.id === updated.id ? { ...p, ...updated } : p));
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const s = new Set(prev);
    if (s.has(id)) {
      s.delete(id);
    } else {
      s.add(id);
    }
    return s;
  });
  const toggleSelectAll = () => setSelectedIds(prev => prev.size === filteredAndSorted.length ? new Set() : new Set(filteredAndSorted.map((p: Product) => p.id)));

  const handleAssign = async (productId: string, workerId: string) => {
    setAssigningId(productId);
    try {
      await fetchWithAuth(`/products/${productId}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: workerId === 'unassigned' ? null : workerId }) });
      const worker = workers.find(w => w.id === workerId);
      updateProduct(productId, { assigned_to: workerId === 'unassigned' ? null : workerId, assignee: workerId === 'unassigned' ? null : { id: workerId, username: worker?.username || '' } });
    } catch { toast.error('Assignment failed'); }
    finally { setAssigningId(null); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault(); setCreatingUser(true);
    try {
      await fetchWithAuth('/users', { method: 'POST', body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }) });
      toast.success(`${newRole === 'admin' ? 'Admin' : 'Worker'} "${newUsername}" created`);
      setNewUsername(''); setNewPassword(''); setNewRole('worker');
      setWorkers(await fetchWithAuth('/users'));
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setCreatingUser(false); }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    askConfirm(`Delete worker "${username}"? Their products will become unassigned.`, async () => {
      setDeletingId(id);
      try {
        await fetchWithAuth(`/users/${id}`, { method: 'DELETE' });
        toast.success(`Deleted "${username}"`);
        const [prods, wrks] = await Promise.all([fetchWithAuth('/products'), fetchWithAuth('/users')]);
        setProducts(prods); setWorkers(wrks);
      } catch (e: any) { toast.error(e.message || 'Delete failed'); }
      finally { setDeletingId(null); }
    });
  };

  const handleResetPassword = async (id: string) => {
    if (!resetPassword.trim()) return;
    try {
      await fetchWithAuth(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ password: resetPassword }) });
      toast.success('Password reset!');
      setResetUserId(null); setResetPassword('');
    } catch { toast.error('Reset failed'); }
  };

  const filteredAndSorted = useMemo(() => {
    const result = products.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterWorker === 'unassigned' && p.assigned_to) return false;
      if (filterWorker !== 'all' && filterWorker !== 'unassigned' && p.assigned_to !== filterWorker) return false;
      if (searchQuery) return p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || p.drive_folder.toLowerCase().includes(searchQuery.toLowerCase());
      return true;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Product] || '';
        let bVal: any = b[sortConfig.key as keyof Product] || '';
        
        if (sortConfig.key === 'createdAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortConfig.key === 'last_action') {
          // fallback string sort
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [products, filterStatus, filterWorker, searchQuery, sortConfig]);

  const paginatedProducts = useMemo(() => {
    if (pageSize === 'ALL') return filteredAndSorted;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredAndSorted.length / pageSize);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const stats = useMemo(() => ({
    total: products.length,
    completed: products.filter(p => p.status === 'completed').length,
    pending: products.filter(p => p.status === 'pending').length,
    assigned: products.filter(p => p.assigned_to).length,
    unassigned: products.filter(p => !p.assigned_to).length,
    users: workers.length,
  }), [products, workers]);

  const userStats = useMemo(() => workers.map(w => ({
    ...w,
    total: products.filter(p => p.assigned_to === w.id).length,
    done: products.filter(p => p.assigned_to === w.id && p.status === 'completed').length,
    inProgress: products.filter(p => p.assigned_to === w.id && p.status === 'in-progress').length,
    pending: products.filter(p => p.assigned_to === w.id && p.status === 'pending').length,
  })), [workers, products]);

  const onlyWorkers = workers.filter(w => w.role === 'worker');

  const copyText = (text: string, label = 'Copied!') => { navigator.clipboard.writeText(text); toast.success(label); };

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col relative" style={{ fontFamily: "'Inter', sans-serif" }}>
      
      {/* Custom Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm m-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Are you sure?</h3>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Import Dialog */}
      {driveImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> 
                {driveImportStep === 1 ? 'Google Drive Importer' : 'Review Folders'}
              </h3>
              <button onClick={() => !driveImporting && setDriveImportOpen(false)} className="text-gray-400 hover:text-gray-700 disabled:opacity-50" disabled={driveImporting}><Trash2 size={16} className="hidden" />✖</button>
            </div>
            
            {driveImportStep === 1 ? (
              <form onSubmit={handleDriveImport} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Public Google Drive Folder URL</label>
                  <input type="text" placeholder="https://drive.google.com/drive/folders/..." value={driveUrl} onChange={e => setDriveUrl(e.target.value)} required disabled={driveImporting}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Global Reference Link (Optional)</label>
                  <input type="text" placeholder="Applied to all imported folders" value={globalRefLink} onChange={e => setGlobalRefLink(e.target.value)} disabled={driveImporting}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={applyLastUsedLinks}
                    disabled={driveImporting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <Clock size={12} />
                    Use Last Used Links
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                  <input type="checkbox" checked={driveRecursive} onChange={e => setDriveRecursive(e.target.checked)} disabled={driveImporting} className="rounded text-blue-600 focus:ring-blue-500" />
                  Extract recursively (search inside subfolders)
                </label>
                
                {driveLog.length > 0 && (
                  <div className="flex flex-col mt-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Extraction Log</label>
                    <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono h-40 overflow-y-auto leading-relaxed">
                      {driveLog.map((log, i) => <div key={i}>{log}</div>)}
                      {driveImporting && <div className="animate-pulse">...</div>}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setDriveImportOpen(false)} disabled={driveImporting} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={driveImporting || !driveUrl} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                    {driveImporting ? <RefreshCw size={14} className="animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>}
                    {driveImporting ? 'Extracting...' : 'Extract Folders'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <div className="text-sm text-gray-600">
                  Found <span className="font-bold">{driveFoundFolders.length}</span> folders. Select the ones you want to import.
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-y-auto max-h-[300px] bg-gray-50 p-2">
                  {driveFoundFolders.map((f, i) => (
                    <label key={i} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${f.exists ? 'opacity-60' : ''}`}>
                      <input type="checkbox" checked={f.selected} onChange={e => {
                        const newArr = [...driveFoundFolders];
                        newArr[i].selected = e.target.checked;
                        setDriveFoundFolders(newArr);
                      }} className="mt-1 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                      {f.thumbnail && <img src={f.thumbnail} alt="Preview" className="w-8 h-8 rounded object-cover shadow-sm flex-shrink-0 bg-white" />}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900 break-all">{f.path}</span>
                        {f.exists && <span className="text-xs text-amber-600 font-bold mt-0.5">Already in dashboard</span>}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => {
                    const allSelected = driveFoundFolders.every(f => f.selected);
                    setDriveFoundFolders(driveFoundFolders.map(f => ({ ...f, selected: !allSelected })));
                  }} className="text-xs text-blue-600 font-semibold hover:underline">
                    Toggle All
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setDriveImportStep(1)} disabled={driveImporting} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50">
                      Back
                    </button>
                    <button type="button" onClick={() => {
                      if (replaceMode) {
                        askConfirm(`Replace existing products with these ${driveFoundFolders.filter(f => f.selected).length} folders?`, handleDriveImportConfirm);
                      } else {
                        handleDriveImportConfirm();
                      }
                    }} disabled={driveImporting || !driveFoundFolders.some(f => f.selected)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50">
                      {driveImporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                      {driveImporting ? 'Importing...' : `Import ${driveFoundFolders.filter(f => f.selected).length}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Nav */}
      <header className="bg-gray-900 text-white px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shadow-lg flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <Package size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">Buzl Admin</h1>
            <p className="text-xs text-white/50 mt-0.5 hidden sm:block">Fashion Helper Control Panel</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <a href="/buzl-fashion-helper.zip" download className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors font-semibold">
            <Download size={13} /> Download Extension
          </a>
          <button onClick={refresh} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              {authUser?.username?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs font-medium">{authUser?.username}</span>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-white/70 hover:text-red-400 bg-white/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 flex-shrink-0">
        {[
          { label: 'Total Products', value: stats.total, color: 'bg-white', text: 'text-gray-800', sub: 'text-gray-400' },
          { label: 'Completed', value: stats.completed, color: 'bg-green-50', text: 'text-green-700', sub: 'text-green-400' },
          { label: 'Pending', value: stats.pending, color: 'bg-amber-50', text: 'text-amber-700', sub: 'text-amber-400' },
          { label: 'Assigned', value: stats.assigned, color: 'bg-blue-50', text: 'text-blue-700', sub: 'text-blue-400' },
          { label: 'Unassigned', value: stats.unassigned, color: 'bg-red-50', text: 'text-red-600', sub: 'text-red-400' },
          { label: 'Total Users', value: stats.users, color: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 shadow-sm border border-gray-100`}>
            <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
            <p className={`text-xs font-semibold mt-1 ${s.sub}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="px-3 sm:px-6 flex gap-1 flex-shrink-0 overflow-x-auto">
        {([['products', Package, 'Products'], ['users', Users, 'User Management']] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key as Tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 px-3 sm:px-6 pb-6">
        <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 overflow-hidden" style={{ minHeight: '500px' }}>

          {/* ===== PRODUCTS TAB ===== */}
          {tab === 'products' && (
            <div className="flex flex-col h-full">
              {/* Toolbar */}
              <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
                  <div className="flex flex-col gap-1">
                    <label className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-2 border-dashed border-gray-300 rounded-lg text-gray-600 cursor-pointer hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      Upload CSV
                      <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                    </label>
                    <button onClick={downloadTemplateCsv} className="text-[10px] text-blue-500 hover:underline text-left px-1">Download Template</button>
                  </div>
                  
                  {/* Drive Import Button */}
                  <button onClick={() => { setDriveLog([]); setDriveImportStep(1); setDriveImportOpen(true); }} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#E8F0FE] text-[#1967D2] rounded-lg hover:bg-[#D2E3FC] transition-colors border border-[#D2E3FC]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    Import Drive Folder
                  </button>
                  
                  <div className="h-6 w-px bg-gray-200 mx-1"></div>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                    <input type="checkbox" checked={replaceMode} onChange={e => setReplaceMode(e.target.checked)} className="rounded" />
                    Replace existing
                  </label>
                  <div className="h-6 w-px bg-gray-200 mx-1"></div>
                  <input type="text" placeholder="Global Reference Link (Optional)" value={globalRefLink} onChange={e => setGlobalRefLink(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-auto sm:min-w-[200px] focus:outline-none focus:ring-1 focus:ring-blue-500" title="Applied to all imported products without a reference link" />
                </div>
                {/* Search */}
                <div className="relative w-full xl:flex-1 xl:min-w-[220px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search products..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {/* Filters */}
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Workers</option>
                  <option value="unassigned">Unassigned</option>
                  {onlyWorkers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
                </select>
                {/* Right actions */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  <span className="text-xs text-gray-400">{filteredAndSorted.length}/{products.length}</span>
                  <button onClick={() => exportCSV(products)} className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-green-50 text-gray-600 hover:text-green-700 px-3 py-2 rounded-lg transition-colors font-semibold">
                    <Download size={14} /> Export CSV
                  </button>
                  <button onClick={handleClearAll} disabled={clearing || products.length === 0} className="flex items-center gap-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition-colors font-semibold disabled:opacity-40">
                    <AlertTriangle size={14} /> {clearing ? 'Clearing...' : 'Clear All'}
                  </button>
                </div>
              </div>
              {/* Bulk assign bar */}
              {selectedIds.size > 0 && (
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
                  <span className="text-xs font-semibold text-blue-700">{selectedIds.size} selected</span>
                  <select value={bulkWorker} onChange={e => setBulkWorker(e.target.value)} className="text-xs border border-blue-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none">
                    <option value="">— Pick worker —</option>
                    <option value="unassigned">Unassign</option>
                    {onlyWorkers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
                  </select>
                  <button onClick={handleBulkAssign} disabled={!bulkWorker || assigningId === 'bulk'} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {assigningId === 'bulk' ? 'Assigning...' : 'Assign'}
                  </button>
                  <button
                    onClick={handleBulkResetStatus}
                    disabled={resettingStatusId === 'bulk'}
                    className="px-3 py-1.5 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {resettingStatusId === 'bulk' ? 'Resetting...' : 'Reset Status'}
                  </button>
                  <div className="h-4 w-px bg-blue-200 mx-1"></div>
                  <button onClick={handleDeleteSelected} disabled={deletingProductId === 'bulk'} className="px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50">
                    {deletingProductId === 'bulk' ? 'Deleting...' : 'Delete Selected'}
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-500 hover:underline">Clear selection</button>
                </div>
              )}

              {/* Table */}
              {filteredAndSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-gray-600 font-semibold text-lg">{products.length === 0 ? 'No products yet' : 'No matching products'}</p>
                  <p className="text-sm mt-1">{products.length === 0 ? 'Upload a CSV file above to get started' : 'Try adjusting your filters'}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1080px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-3"><input type="checkbox" checked={selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">#</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Preview</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('product_name')}>
                          Product Name {sortConfig?.key === 'product_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-center px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Links</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('status')}>
                          Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Timers</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Assign To</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Notes</th>
                        <th className="text-left px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none" onClick={() => requestSort('last_action')}>
                          Last Action {sortConfig?.key === 'last_action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {paginatedProducts.map((product: Product, idx) => (
                        <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(product.id) ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-3 py-2.5"><input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded" /></td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{(currentPage - 1) * (pageSize === 'ALL' ? 0 : pageSize) + idx + 1}</td>
                          <td className="px-3 py-2.5">
                            {product.thumbnail_url ? (
                              <img src={product.thumbnail_url} alt="Preview" className="w-8 h-8 rounded-md object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold text-gray-900 max-w-[200px] truncate text-sm" title={product.product_name}>{product.product_name}</p>
                          </td>
                          {/* Links — icon only, compact */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <a href={product.drive_folder} target="_blank" rel="noopener noreferrer" title={product.drive_folder}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"><ExternalLink size={14} /></a>
                              <button onClick={() => copyText(product.drive_folder, 'Drive link copied!')} title="Copy drive link"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><Copy size={13} /></button>
                              {product.reference_link
                                ? <><a href={product.reference_link} target="_blank" rel="noopener noreferrer" title={product.reference_link}
                                    className="p-1.5 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors"><ExternalLink size={14} /></a>
                                   <button onClick={() => copyText(product.reference_link!, 'Ref link copied!')} title="Copy ref link"
                                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><Copy size={13} /></button></>
                                : <span className="text-gray-200 text-xs px-1.5">no ref</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <select value={product.status} onChange={e => handleStatusOverride(product.id, e.target.value)}
                                className={`text-xs py-1 px-2 border rounded-lg focus:outline-none font-semibold ${
                                  product.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                                  product.status === 'in-progress' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                  'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <button
                                onClick={() => handleResetStatus(product.id)}
                                disabled={product.status === 'pending' || resettingStatusId === product.id}
                                title="Reset status to pending"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              >
                                <RotateCcw size={11} />
                                {resettingStatusId === product.id ? '...' : 'Reset'}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <TaskTimer
                              product={product}
                              canEdit={true}
                              onProductUpdated={handleTimerProductUpdated}
                              variant="row"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${product.assigned_to ? 'bg-blue-500' : 'bg-amber-500'}`} title={product.assigned_to ? 'Assigned' : 'Unassigned'} />
                              <select value={product.assigned_to || 'unassigned'} onChange={e => handleAssign(product.id, e.target.value)} disabled={assigningId === product.id}
                                className={`text-xs py-1.5 px-2 border rounded-lg bg-white focus:outline-none min-w-[110px] ${product.assigned_to ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-gray-200 text-gray-500'}`}>
                                <option value="unassigned">— Unassigned —</option>
                                {onlyWorkers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
                              </select>
                              {assigningId === product.id && <RefreshCw size={11} className="animate-spin text-blue-400" />}
                            </div>
                          </td>
                          {/* Notes column */}
                          <td className="px-3 py-2.5 max-w-[180px]">
                            {product.notes
                              ? <span className="flex items-start gap-1 text-xs text-gray-500 italic" title={product.notes}>
                                  <MessageSquare size={11} className="flex-shrink-0 mt-0.5 text-amber-400" />
                                  <span className="truncate max-w-[140px]">{product.notes}</span>
                                </span>
                              : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {product.updatedAt ? (
                              <div className="flex flex-col text-[10px] text-gray-500 whitespace-nowrap">
                                <span className="text-gray-800 font-semibold mb-0.5" title={product.last_action || ''}>{product.last_action || 'Created'}</span>
                                <span>{`${new Date(product.updatedAt).getDate()} ${new Date(product.updatedAt).toLocaleString('default', { month: 'short' })} ${new Date(product.updatedAt).getFullYear()}`}</span>
                                <span className="text-gray-400">{new Date(product.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                              </div>
                            ) : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => handleDeleteProduct(product.id)} disabled={deletingProductId === product.id}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                              {deletingProductId === product.id ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {paginatedProducts.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">No products match your filters</div>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="p-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gray-50 rounded-b-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Rows per page:</span>
                    <select value={pageSize} onChange={e => {
                      setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                      setCurrentPage(1);
                    }} className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value="ALL">ALL</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-medium">
                      {pageSize === 'ALL' ? 'Showing all' : `Page ${currentPage} of ${totalPages}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || pageSize === 'ALL'} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      </button>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || pageSize === 'ALL'} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          )}

          {/* ===== USER MANAGEMENT TAB ===== */}
          {tab === 'users' && (
            <div className="flex gap-0 h-full flex-col lg:flex-row">
              {/* Left: Create Form */}
              <div className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 p-4 sm:p-6">
                <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><UserPlus size={16} /> Create User</h3>
                <p className="text-xs text-gray-400 mb-4">New users can log in using these credentials.</p>
                <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Username</label>
                    <input type="text" placeholder="e.g. worker_1" value={newUsername} onChange={e => setNewUsername(e.target.value)} required
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
                    <input type="password" placeholder="Set a password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Role</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="worker">Worker (Extension Access)</option>
                      <option value="admin">Admin (Dashboard Access)</option>
                    </select>
                  </div>
                  <button type="submit" disabled={creatingUser}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 mt-1">
                    <UserPlus size={15} />
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              </div>

              {/* Right: Worker Table */}
              <div className="flex-1 p-4 sm:p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={16} /> All Users ({workers.length})</h3>
                {workers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="text-5xl mb-4">👤</div>
                    <p className="text-gray-600 font-semibold">No users yet</p>
                    <p className="text-sm mt-1">Create a user using the form on the left</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="min-w-[760px] w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">User</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Assigned</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Progress</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {userStats.map(w => {
                          const pct = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
                          return (
                            <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold flex-shrink-0 ${w.role === 'admin' ? 'bg-purple-600' : 'bg-gray-900'}`}>
                                    {w.username[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                                      {w.username}
                                      {w.id === authUser?.id && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">YOU</span>}
                                    </p>
                                    <p className={`text-xs font-semibold ${w.role === 'admin' ? 'text-purple-500' : 'text-gray-400'}`}>
                                      {w.role === 'admin' ? 'Admin' : 'Worker'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              {/* Detailed status breakdown */}
                              <td className="px-4 py-3">
                                {w.role === 'admin' ? <span className="text-gray-300 text-xs">—</span> : (
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-1" title="Completed">
                                      <CheckCircle2 size={12} className="text-green-500" />
                                      <span className="font-bold text-green-600">{w.done}</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="In Progress">
                                      <Clock size={12} className="text-blue-400" />
                                      <span className="font-bold text-blue-500">{w.inProgress}</span>
                                    </div>
                                    <div className="flex items-center gap-1" title="Pending">
                                      <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                                      <span className="font-bold text-gray-400">{w.pending}</span>
                                    </div>
                                    <span className="text-gray-300">/ {w.total}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 min-w-[160px]">
                                {w.role === 'admin' ? <span className="text-gray-300 text-xs">—</span> : (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                      <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600 w-9 text-right">{pct}%</span>
                                  </div>
                                )}
                              </td>
                              {/* Filter shortcut */}
                              <td className="px-4 py-3">
                                {w.role !== 'admin' && (
                                  <button onClick={() => { setTab('products'); setFilterWorker(w.id); }}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors mb-1" title="View their products">
                                    <Package size={12} /> View Tasks <ChevronRight size={11} />
                                  </button>
                                )}
                                <div className="flex items-center gap-1">
                                  {resetUserId === w.id ? (
                                    <div className="flex items-center gap-1">
                                      <input type="password" placeholder="New password" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                                        className="text-xs border border-gray-200 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                      <button onClick={() => handleResetPassword(w.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Confirm"><CheckCircle2 size={15} /></button>
                                      <button onClick={() => { setResetUserId(null); setResetPassword(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X size={15} /></button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setResetUserId(w.id)}
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition-colors">
                                      <KeyRound size={13} /> Reset
                                    </button>
                                  )}
                                  {w.id !== authUser?.id && (
                                    <button onClick={() => handleDeleteUser(w.id, w.username)} disabled={deletingId === w.id}
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                                      <Trash2 size={13} /> {deletingId === w.id ? '...' : 'Delete'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
