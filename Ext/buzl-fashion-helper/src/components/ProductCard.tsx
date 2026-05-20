import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink, Check, CheckCircle2, Circle, Clock, MessageSquare, UserMinus } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import type { Product, ProductActionLog, TimerAction } from '../types';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  style?: React.CSSProperties;
}

const TIMER_STEPS: { action: TimerAction; label: string; shortLabel: string; lastAction: string }[] = [
  { action: 'generation_start', label: 'Gen Start', shortLabel: 'Start', lastAction: 'Generation started' },
  { action: 'generation_complete', label: 'Gen Done', shortLabel: 'Done', lastAction: 'Generation completed' },
  { action: 'qc_correction_start', label: 'QC Start', shortLabel: 'QC', lastAction: 'QC and correction started' },
  { action: 'finish', label: 'Finish', shortLabel: 'Finish', lastAction: 'Task finished' },
];

const getTimerStatusPatch = (action: TimerAction): Partial<Product> => {
  if (action === 'finish') {
    return { status: 'completed', completed: true };
  }

  return { status: 'in-progress', completed: false };
};

const formatTimerTime = (createdAt?: string) => {
  if (!createdAt) return 'Not set';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatTimerClock = (createdAt?: string) => {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getLogTime = (log?: ProductActionLog) => {
  if (!log?.createdAt) return null;
  const time = new Date(log.createdAt).getTime();
  return Number.isNaN(time) ? null : time;
};

const formatDuration = (start?: number | null, end?: number | null) => {
  if (!start || !end || end < start) return '--';

  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000));
  if (totalMinutes === 0) return '<1m';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, style }) => {
  const { updateProduct, products, setProducts, globalReferenceUrl, connectionMode, userId, username } = useCsvStore();
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(product.notes || '');
  const [savingNote, setSavingNote] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loggingAction, setLoggingAction] = useState<TimerAction | null>(null);
  const [nowTick, setNowTick] = useState<number | null>(null);

  useEffect(() => {
    setLocalNotes(product.notes || '');
  }, [product.notes]);

  const finalReferenceUrl = product.reference_link || globalReferenceUrl;
  const isMine = product.assigned_to === userId;
  const isUnassigned = !product.assigned_to;
  const isCompleted = product.status === 'completed';
  const isInProgress = product.status === 'in-progress';
  const latestTimerLogs = TIMER_STEPS.reduce<Record<TimerAction, ProductActionLog | undefined>>((logs, step) => {
    logs[step.action] = product.actionLogs?.find((log) => log.action === step.action);
    return logs;
  }, {} as Record<TimerAction, ProductActionLog | undefined>);
  const generationStartAt = getLogTime(latestTimerLogs.generation_start);
  const generationCompleteAt = getLogTime(latestTimerLogs.generation_complete);
  const qcStartAt = getLogTime(latestTimerLogs.qc_correction_start);
  const finishAt = getLogTime(latestTimerLogs.finish);

  useEffect(() => {
    if (!generationStartAt || finishAt) return;
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [generationStartAt, finishAt]);

  const durationRows = [
    {
      label: 'Gen',
      value: formatDuration(generationStartAt, generationCompleteAt || (generationStartAt ? nowTick : null)),
      active: Boolean(generationStartAt && !generationCompleteAt),
    },
    {
      label: 'To QC',
      value: formatDuration(generationCompleteAt, qcStartAt || (generationCompleteAt && !finishAt ? nowTick : null)),
      active: Boolean(generationCompleteAt && !qcStartAt && !finishAt),
    },
    {
      label: 'QC',
      value: formatDuration(qcStartAt, finishAt || (qcStartAt ? nowTick : null)),
      active: Boolean(qcStartAt && !finishAt),
    },
    {
      label: 'Total',
      value: formatDuration(generationStartAt, finishAt || (generationStartAt && !finishAt ? nowTick : null)),
      active: Boolean(generationStartAt && !finishAt),
    },
  ];

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

  const handleTimerAction = async (action: TimerAction) => {
    const step = TIMER_STEPS.find((item) => item.action === action);
    const existingLog = latestTimerLogs[action];

    if (existingLog) {
      toast.info(`${step?.label || 'Timer step'} already logged`);
      return;
    }

    if (connectionMode === 'server' && !isMine) {
      toast.error('Claim this task before logging time');
      return;
    }

    setLoggingAction(action);

    if (connectionMode === 'server') {
      try {
        const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
          method: 'POST',
          body: JSON.stringify({ action }),
        });

        setProducts(products.map((p) => (
          p.id === product.id
            ? {
                ...p,
                product_name: updated.product_name,
                drive_folder: updated.drive_folder,
                reference_link: updated.reference_link || undefined,
                thumbnail_url: updated.thumbnail_url || undefined,
                assigned_to: updated.assigned_to || null,
                assignee: updated.assignee || null,
                status: updated.status || p.status,
                completed: updated.status === 'completed',
                notes: updated.notes || '',
                actionLogs: updated.actionLogs || [],
                last_action: updated.last_action || null,
              }
            : p
        )));
        toast.success(`${step?.label || 'Timer'} logged`);
      } catch (err: any) {
        toast.error(err.message || 'Timer update failed');
      } finally {
        setLoggingAction(null);
      }
      return;
    }

    const newLog: ProductActionLog = {
      id: crypto.randomUUID(),
      action,
      createdAt: new Date().toISOString(),
      user: userId || username ? { id: userId || 'local', username: username || 'Local' } : null,
    };

    updateProduct(product.id, {
      ...getTimerStatusPatch(action),
      actionLogs: [newLog, ...(product.actionLogs || [])],
      last_action: step?.lastAction || null,
    });
    setLoggingAction(null);
    toast.success(`${step?.label || 'Timer'} logged`);
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

  const cardClass = isCompleted
    ? 'bg-white border-green-500 shadow-sm hover:shadow-md hover:border-green-600'
    : isInProgress
      ? 'bg-amber-50/40 border-[#e98300] shadow-sm hover:shadow-md hover:border-[#d97706]'
      : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300';

  return (
    <div style={style} className="px-4 py-2">
      <div className={`relative border rounded-xl p-4 transition-all ${cardClass}`}>
        {isCompleted && (
          <div className="pointer-events-none absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-500 text-white shadow-md">
            <Check size={12} className="animate-pulse" />
          </div>
        )}
        {isInProgress && (
          <div className="pointer-events-none absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#e98300] text-white shadow-md">
            <Clock size={12} className="animate-[spin_2s_linear_infinite]" />
          </div>
        )}
        {!isCompleted && !isInProgress && (
          <div className="pointer-events-none absolute -left-2 -top-2 h-5 w-5 rounded-full border-2 border-white bg-gray-300 shadow-sm" />
        )}
        
        <div className="flex gap-3">
          <button 
            onClick={handleToggleComplete}
            className={`mt-0.5 flex-shrink-0 transition-colors focus:outline-none ${
              isCompleted ? 'text-green-600' : isInProgress ? 'text-[#e98300]' : 'text-gray-300 hover:text-green-500'
            }`}
          >
            {isCompleted ? <CheckCircle2 size={24} className="text-green-600" /> : isInProgress ? <Clock size={24} className="text-[#e98300] animate-[spin_2s_linear_infinite]" /> : <Circle size={24} />}
          </button>

          {product.thumbnail_url && (
            <img src={product.thumbnail_url} alt="Preview" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border border-gray-200 bg-white" />
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className={`font-semibold text-[13px] truncate ${isCompleted ? 'text-green-800' : isInProgress ? 'text-[#9a5200]' : 'text-gray-900'}`} title={product.product_name}>
                {product.product_name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-1 rounded-md ${
                  isCompleted ? 'bg-green-100 text-green-700' : isInProgress ? 'bg-amber-100 text-[#9a5200]' : 'bg-gray-100 text-gray-500'
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
                <span className={`inline-flex items-center gap-1.5 ${
                  isUnassigned ? 'font-semibold text-amber-600' : isMine ? 'font-semibold text-green-700' : 'font-semibold text-blue-700'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                    isUnassigned ? 'bg-amber-500' : isMine ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
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

            <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {TIMER_STEPS.map((step, index) => {
                  const log = latestTimerLogs[step.action];
                  const isLogged = Boolean(log);
                  const isSaving = loggingAction === step.action;
                  const previousStep = index > 0 ? TIMER_STEPS[index - 1] : null;
                  const isLocked = Boolean(previousStep && !latestTimerLogs[previousStep.action]);
                  const disabled = loggingAction !== null || isLogged || isLocked || (connectionMode === 'server' && !isMine);
                  const tooltip = isLocked
                    ? 'Complete the previous timer step first'
                    : isLogged
                      ? `${step.label} logged at ${formatTimerTime(log?.createdAt)}`
                      : step.lastAction;

                  return (
                    <button
                      key={step.action}
                      onClick={() => handleTimerAction(step.action)}
                      disabled={disabled}
                      title={tooltip}
                      className={`min-h-[42px] min-w-0 rounded-md border px-1 py-1 text-center transition-colors disabled:cursor-not-allowed ${
                        isLogged
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                      } ${isLocked || (connectionMode === 'server' && !isMine) || (loggingAction !== null && !isSaving) ? 'opacity-60' : ''}`}
                    >
                      <span className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase leading-none">
                        {isLogged ? <Check size={10} /> : <Clock size={10} />}
                        <span className="truncate">{isSaving ? 'Save' : step.shortLabel}</span>
                      </span>
                      <span className={`mt-1 block truncate font-mono text-[9px] leading-none ${isLogged ? 'text-green-700' : 'text-gray-400'}`}>
                        {formatTimerClock(log?.createdAt) || '--:--'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-gray-200 pt-2 sm:grid-cols-4">
                {durationRows.map((row) => (
                  <div key={row.label} title={`${row.label}: ${row.value}`} className="min-w-0 text-center">
                    <span className="block truncate text-[8px] font-bold uppercase leading-none text-gray-400">{row.label}</span>
                    <span className={`mt-1 block truncate font-mono text-[10px] font-bold leading-none ${row.active ? 'text-blue-600' : row.value !== '--' ? 'text-gray-700' : 'text-gray-300'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

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
