import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, CheckCircle2, Circle, Clock, MessageSquare, UserMinus } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import type { Product } from '../types';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  style?: React.CSSProperties;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, style }) => {
  const { updateProduct, products, setProducts, globalReferenceUrl, connectionMode, userId, username } = useCsvStore();
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(product.notes || '');
  const [savingNote, setSavingNote] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setLocalNotes(product.notes || '');
  }, [product.notes]);

  const finalReferenceUrl = product.reference_link || globalReferenceUrl;
  const isMine = product.assigned_to === userId;
  const isUnassigned = !product.assigned_to;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied!`);
      
      if (type === 'Product Name') updateProduct(product.id, { nameCopied: true });
      if (type === 'Drive Folder') updateProduct(product.id, { driveCopied: true });
      if (type === 'Reference Link') updateProduct(product.id, { referenceCopied: true });
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const openLink = (url: string, type: string) => {
    window.open(url, '_blank');
    if (type === 'Drive') updateProduct(product.id, { driveOpened: true });
    if (type === 'Reference') updateProduct(product.id, { referenceOpened: true });
  };

  const handleToggleComplete = async () => {
    if (connectionMode === 'server' && !isMine) {
      toast.error('Claim this task before changing status');
      return;
    }

    const nextStatus = product.status === 'pending' ? 'in-progress' : product.status === 'in-progress' ? 'completed' : 'pending';
    const nextCompleted = nextStatus === 'completed';

    // Optimistically update
    updateProduct(product.id, { completed: nextCompleted, status: nextStatus });

    if (connectionMode === 'server') {
      try {
        await fetchWithAuth(`/products/${product.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch (err: any) {
        // Rollback on error
        updateProduct(product.id, { completed: !nextCompleted, status: product.status });
        toast.error('Failed to sync status with server');
      }
    }
  };

  const handleClaimTask = async () => {
    if (!userId) {
      toast.error('Login again before claiming tasks');
      return;
    }

    setAssigning(true);
    try {
      const updated = await fetchWithAuth(`/products/${product.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: userId }),
      });
      setProducts(products.map((p) => (
        p.id === product.id
          ? { ...p, assigned_to: updated.assigned_to, assignee: updated.assignee || { id: userId, username: username || '' } }
          : p
      )));
      toast.success('Task claimed');
    } catch (err: any) {
      toast.error(err.message || 'Claim failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleReleaseTask = async () => {
    setAssigning(true);
    try {
      await fetchWithAuth(`/products/${product.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: null }),
      });
      setProducts(products.map((p) => (
        p.id === product.id ? { ...p, assigned_to: null, assignee: null } : p
      )));
      toast.success('Task moved back to unassigned');
    } catch (err: any) {
      toast.error(err.message || 'Unassign failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveNotes = async (text: string) => {
    updateProduct(product.id, { notes: text });

    if (connectionMode === 'server') {
      setSavingNote(true);
      try {
        await fetchWithAuth(`/products/${product.id}/notes`, {
          method: 'PATCH',
          body: JSON.stringify({ notes: text }),
        });
      } catch (err: any) {
        toast.error('Failed to save notes to server');
      } finally {
        setSavingNote(false);
      }
    }
  };

  return (
    <div style={style} className="px-4 py-2">
      <div className={`border rounded-xl p-4 transition-all ${product.completed ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'}`}>
        
        <div className="flex gap-3">
          <button 
            onClick={handleToggleComplete}
            className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-green-500 transition-colors focus:outline-none"
          >
            {product.status === 'completed' ? <CheckCircle2 className="text-green-500" size={24} /> : product.status === 'in-progress' ? <Clock className="text-blue-500" size={24} /> : <Circle size={24} />}
          </button>

          {product.thumbnail_url && (
            <img src={product.thumbnail_url} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0 bg-white" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className={`font-semibold text-[13px] truncate ${product.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`} title={product.product_name}>
                {product.product_name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-1 rounded-md ${
                  product.status === 'completed' ? 'bg-green-100 text-green-700' : product.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {product.status}
                </span>
                <button 
                  onClick={() => copyToClipboard(product.product_name, 'Product Name')}
                  className={`p-1.5 rounded-md transition-colors border ${product.nameCopied ? 'text-green-600 bg-green-50 border-green-200' : 'text-gray-500 bg-white hover:bg-gray-50 border-gray-200'}`}
                  title="Copy Name"
                >
                  {product.nameCopied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {connectionMode === 'server' && (
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className={isUnassigned ? 'font-semibold text-amber-600' : isMine ? 'font-semibold text-green-700' : 'text-gray-500'}>
                  {isUnassigned ? 'Unassigned' : isMine ? 'Assigned to you' : `Assigned to ${product.assignee?.username || 'worker'}`}
                </span>
                {isMine && (
                  <button
                    onClick={handleReleaseTask}
                    disabled={assigning}
                    className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    <UserMinus size={11} /> Unassign
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                <span className="font-medium text-blue-900 truncate pr-2">Drive Folder</span>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button 
                    onClick={() => openLink(product.drive_folder, 'Drive')}
                    className={`p-1 rounded-md transition-colors ${product.driveOpened ? 'text-blue-700 bg-blue-100' : 'text-blue-600 hover:bg-blue-100'}`}
                    title="Open Folder"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button 
                    onClick={() => copyToClipboard(product.drive_folder, 'Drive Folder')}
                    className={`p-1 rounded-md transition-colors ${product.driveCopied ? 'text-green-600 bg-green-100' : 'text-blue-600 hover:bg-blue-100'}`}
                    title="Copy URL"
                  >
                    {product.driveCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {finalReferenceUrl && (
                <div className="flex items-center justify-between text-xs bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                  <span className="font-medium text-purple-900 truncate pr-2">Reference URL</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button 
                      onClick={() => openLink(finalReferenceUrl, 'Reference')}
                      className={`p-1 rounded-md transition-colors ${product.referenceOpened ? 'text-purple-700 bg-purple-100' : 'text-purple-600 hover:bg-purple-100'}`}
                      title="Open Reference"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button 
                      onClick={() => copyToClipboard(finalReferenceUrl, 'Reference Link')}
                      className={`p-1 rounded-md transition-colors ${product.referenceCopied ? 'text-green-600 bg-green-100' : 'text-purple-600 hover:bg-purple-100'}`}
                      title="Copy URL"
                    >
                      {product.referenceCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              {connectionMode === 'server' && isUnassigned && (
                <button
                  onClick={handleClaimTask}
                  disabled={assigning}
                  className="mr-auto rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  {assigning ? 'Claiming...' : '+ Claim this task'}
                </button>
              )}
              <button 
                onClick={() => setShowNotes(!showNotes)}
                className={`text-[11px] flex items-center gap-1 font-semibold transition-colors px-2 py-1 rounded-md ${product.notes ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
              >
                <MessageSquare size={12} /> {showNotes ? 'Close Notes' : (product.notes ? 'Edit Notes' : 'Add Note')}
              </button>
            </div>

            {showNotes && (
              <textarea
                value={localNotes}
                onChange={(e) => setLocalNotes(e.target.value)}
                onBlur={(e) => handleSaveNotes(e.target.value)}
                placeholder="Type notes here... (auto-saves)"
                disabled={savingNote}
                className="mt-2 w-full text-xs p-2.5 border border-amber-200 bg-amber-50 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none h-16 text-amber-900 placeholder-amber-700/50"
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
