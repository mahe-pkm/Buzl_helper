import React, { useState, useEffect, useMemo } from 'react';
import { Copy, ExternalLink, Check, CheckCircle2, Circle, Clock, MessageSquare, UserMinus, ChevronDown, ChevronUp, Play, Timer, Flag, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import { fetchWithAuth } from '../utils/api';
import type { Product, ProductActionLog, TimerAction } from '../types';
import { toast } from 'sonner';
import { buildThumbnailCandidates } from '../utils/driveThumbnail';

interface ProductCardProps {
  product: Product;
  expanded: boolean;
  onToggleExpand: () => void;
  style?: React.CSSProperties;
}

const TIMER_STEPS: { action: TimerAction; label: string; shortLabel: string; lastAction: string }[] = [
  { action: 'generation_start', label: 'Gen Start', shortLabel: 'Start', lastAction: 'Generation started' },
  { action: 'generation_complete', label: 'Gen Done', shortLabel: 'Done', lastAction: 'Generation completed' },
  { action: 'qc_correction_start', label: 'QC Start', shortLabel: 'QC', lastAction: 'QC and correction started' },
  { action: 'finish', label: 'Finish', shortLabel: 'Finish', lastAction: 'Task finished' },
];
const TIMER_ACTION_ORDER: TimerAction[] = ['generation_start', 'generation_complete', 'qc_correction_start', 'finish'];
const REGEN_ACTION: TimerAction = 'regeneration';
const ACTION_LAST_LABELS: Record<TimerAction, string> = {
  generation_start: 'Generation started',
  generation_complete: 'Generation completed',
  qc_correction_start: 'QC and correction started',
  finish: 'Task finished',
  regeneration: 'Regeneration requested',
};

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

const formatRelativeAgo = (timestamp?: number | null, now = Date.now()) => {
  if (!timestamp) return '--';
  if (now <= timestamp) return 'just now';

  const totalMinutes = Math.floor((now - timestamp) / 60000);
  if (totalMinutes <= 0) return '<1m ago';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
};

const showMilestoneToast = (action: TimerAction) => {
  const milestone =
    action === 'generation_complete'
      ? {
          title: 'Generation Completed',
          message: 'Great momentum. You are ready for QC.',
          border: 'border-blue-200',
          background: 'bg-gradient-to-r from-blue-50 to-white',
          iconBg: 'bg-blue-100',
          iconText: 'text-blue-700',
        }
      : action === 'finish'
        ? {
            title: 'QC Completed',
            message: 'Excellent finish. Task completed successfully.',
            border: 'border-green-200',
            background: 'bg-gradient-to-r from-green-50 to-white',
            iconBg: 'bg-green-100',
            iconText: 'text-green-700',
          }
        : null;

  if (!milestone) return false;

  toast.custom(
    () => (
      <div className={`pointer-events-auto flex w-[min(340px,92vw)] items-center gap-2 rounded-xl border p-3 shadow-lg ${milestone.border} ${milestone.background}`}>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${milestone.iconBg} ${milestone.iconText}`}>
          <Sparkles size={14} className="animate-pulse" />
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-gray-900">{milestone.title}</p>
          <p className="text-[11px] text-gray-600">{milestone.message}</p>
        </div>
      </div>
    ),
    { duration: 3200 }
  );

  return true;
};

const getResetCascadeActions = (action: TimerAction) => {
  const idx = TIMER_ACTION_ORDER.indexOf(action);
  if (idx < 0) return [action];
  return TIMER_ACTION_ORDER.slice(idx);
};

const deriveProductStateFromLogs = (logs: ProductActionLog[]): Partial<Product> => {
  const hasFinish = logs.some((log) => log.action === 'finish');
  const hasStartedFlow = logs.some((log) =>
    log.action === 'generation_start' ||
    log.action === 'generation_complete' ||
    log.action === 'qc_correction_start'
  );

  const sortedLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latestLog = sortedLogs[0];

  return {
    status: hasFinish ? 'completed' : hasStartedFlow ? 'in-progress' : 'pending',
    completed: hasFinish,
    last_action: latestLog ? ACTION_LAST_LABELS[latestLog.action] : null,
  };
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, expanded, onToggleExpand, style }) => {
  const { updateProduct, products, setProducts, globalReferenceUrl, connectionMode, userId, username } = useCsvStore();
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(product.notes || '');
  const [savingNote, setSavingNote] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loggingAction, setLoggingAction] = useState<TimerAction | null>(null);
  const [loggingRegen, setLoggingRegen] = useState(false);
  const [resettingAction, setResettingAction] = useState<TimerAction | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const thumbnailCandidates = useMemo(
    () => buildThumbnailCandidates(product.thumbnail_url, product.drive_folder),
    [product.thumbnail_url, product.drive_folder],
  );
  const [thumbnailIndex, setThumbnailIndex] = useState(0);

  useEffect(() => {
    setLocalNotes(product.notes || '');
  }, [product.notes]);

  useEffect(() => {
    if (!expanded && showNotes) {
      setShowNotes(false);
    }
  }, [expanded, showNotes]);

  const finalReferenceUrl = product.reference_link || globalReferenceUrl;
  const isMine = product.assigned_to === userId;
  const isUnassigned = !product.assigned_to;
  const isCompleted = product.status === 'completed';
  const isInProgress = product.status === 'in-progress';
  const latestTimerLogs = TIMER_STEPS.reduce<Partial<Record<TimerAction, ProductActionLog>>>((logs, step) => {
    logs[step.action] = product.actionLogs?.find((log) => log.action === step.action);
    return logs;
  }, {});
  const regenCount = (product.actionLogs || []).filter((log) => log.action === REGEN_ACTION).length;
  const generationStartAt = getLogTime(latestTimerLogs.generation_start);
  const generationCompleteAt = getLogTime(latestTimerLogs.generation_complete);
  const qcStartAt = getLogTime(latestTimerLogs.qc_correction_start);
  const finishAt = getLogTime(latestTimerLogs.finish);

  useEffect(() => {
    if (!generationStartAt && !finishAt) return;
    setNowTick(Date.now());
    const intervalId = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, [generationStartAt, finishAt]);

  useEffect(() => {
    setThumbnailIndex(0);
  }, [product.id, thumbnailCandidates.join('|')]);

  const startedAgo = generationStartAt ? `Started ${formatRelativeAgo(generationStartAt, nowTick)}` : 'Not started';
  const processingElapsed = generationStartAt
    ? formatDuration(generationStartAt, finishAt || nowTick)
    : '--';
  const finishedAgo = finishAt ? `Finished ${formatRelativeAgo(finishAt, nowTick)}` : 'Not finished';

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
  const canEditTimers = connectionMode !== 'server' || isMine;
  const thumbnailSrc = thumbnailCandidates[thumbnailIndex] || null;

  const handleThumbnailError = () => {
    setThumbnailIndex((prev) => (
      prev < thumbnailCandidates.length - 1 ? prev + 1 : prev
    ));
  };

  const mergeServerProductUpdate = (updated: Product) => {
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
  };

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
        mergeServerProductUpdate(updated);
        const milestoneShown = showMilestoneToast(action);
        if (!milestoneShown) {
          toast.success(`${step?.label || 'Timer'} logged`);
        }
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
    const milestoneShown = showMilestoneToast(action);
    if (!milestoneShown) {
      toast.success(`${step?.label || 'Timer'} logged`);
    }
  };

  const handleRegenerationAction = async () => {
    if (connectionMode === 'server' && !isMine) {
      toast.error('Claim this task before logging re-gen');
      return;
    }

    setLoggingRegen(true);

    if (connectionMode === 'server') {
      try {
        const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
          method: 'POST',
          body: JSON.stringify({ action: REGEN_ACTION }),
        });
        mergeServerProductUpdate(updated);
        const nextCount = (updated.actionLogs || []).filter((log: ProductActionLog) => log.action === REGEN_ACTION).length;
        toast.success(`Re-gen count updated: ${nextCount}`);
      } catch (err: any) {
        toast.error(err.message || 'Re-gen update failed');
      } finally {
        setLoggingRegen(false);
      }
      return;
    }

    const newLog: ProductActionLog = {
      id: crypto.randomUUID(),
      action: REGEN_ACTION,
      createdAt: new Date().toISOString(),
      user: userId || username ? { id: userId || 'local', username: username || 'Local' } : null,
    };

    updateProduct(product.id, {
      actionLogs: [newLog, ...(product.actionLogs || [])],
      last_action: 'Regeneration requested',
    });
    setLoggingRegen(false);
    toast.success(`Re-gen count updated: ${regenCount + 1}`);
  };

  const handleResetTimerAction = async (action: TimerAction) => {
    const step = TIMER_STEPS.find((item) => item.action === action);

    if (!canEditTimers) {
      toast.error('Claim this task before editing timers');
      return;
    }

    setResettingAction(action);

    if (connectionMode === 'server') {
      try {
        const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
          method: 'DELETE',
          body: JSON.stringify({ action }),
        });
        mergeServerProductUpdate(updated);
        toast.success(`${step?.label || 'Timer'} reset`);
      } catch (err: any) {
        toast.error(err.message || 'Timer reset failed');
      } finally {
        setResettingAction(null);
      }
      return;
    }

    const existingLogs = [...(product.actionLogs || [])];
    let nextLogs: ProductActionLog[] = existingLogs;

    if (action === REGEN_ACTION) {
      const regenIndex = existingLogs.findIndex((log) => log.action === REGEN_ACTION);
      if (regenIndex >= 0) {
        nextLogs = [...existingLogs.slice(0, regenIndex), ...existingLogs.slice(regenIndex + 1)];
      }
    } else {
      const cascadeActions = new Set(getResetCascadeActions(action));
      nextLogs = existingLogs.filter((log) => !cascadeActions.has(log.action));
    }

    if (nextLogs.length === existingLogs.length) {
      toast.info('Timer step not logged yet');
      setResettingAction(null);
      return;
    }

    updateProduct(product.id, {
      actionLogs: nextLogs,
      ...deriveProductStateFromLogs(nextLogs),
    });
    setResettingAction(null);
    toast.success(`${step?.label || 'Timer'} reset`);
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
        <div>
          <div className="mb-2 flex items-start gap-2">
            <button 
              onClick={handleToggleComplete}
              className={`mt-0.5 flex-shrink-0 transition-colors focus:outline-none ${
                isCompleted ? 'text-green-600' : isInProgress ? 'text-[#e98300]' : 'text-gray-300 hover:text-green-500'
              }`}
            >
              {isCompleted ? <CheckCircle2 size={24} className="text-green-600" /> : isInProgress ? <Clock size={24} className="text-[#e98300] animate-[spin_2s_linear_infinite]" /> : <Circle size={24} />}
            </button>

            {thumbnailSrc && (
              <img
                src={thumbnailSrc}
                alt="Preview"
                onError={handleThumbnailError}
                className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border border-gray-200 bg-white"
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-start gap-2">
                <h3 className={`font-semibold text-[13px] truncate ${isCompleted ? 'text-green-800' : isInProgress ? 'text-[#9a5200]' : 'text-gray-900'}`} title={product.product_name}>
                  {product.product_name}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0">
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
                  <button
                    onClick={onToggleExpand}
                    className="p-1.5 rounded-md transition-colors border border-gray-200 text-gray-500 bg-white hover:bg-gray-50"
                    title={expanded ? 'Collapse product details' : 'Expand product details'}
                  >
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
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

            {!expanded && connectionMode === 'server' && isUnassigned && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleClaimTask}
                  disabled={assigning}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  {assigning ? 'Claiming...' : '+ Claim this task'}
                </button>
              </div>
            )}

            {expanded && (
              <>
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

                <div className="mt-3 flex items-center gap-2">
                  {connectionMode === 'server' && isUnassigned && (
                    <button
                      onClick={handleClaimTask}
                      disabled={assigning}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {assigning ? 'Claiming...' : '+ Claim this task'}
                    </button>
                  )}
                  <button
                    onClick={handleRegenerationAction}
                    disabled={loggingRegen || loggingAction !== null || resettingAction !== null || !canEditTimers}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    title="Log one regeneration attempt"
                  >
                    <span className="inline-flex items-center gap-1">
                      <RotateCcw size={11} />
                      {loggingRegen ? 'Saving...' : `Re-gen (${regenCount})`}
                    </span>
                  </button>
                  <button 
                    onClick={() => setShowNotes(!showNotes)}
                    className={`ml-auto text-[11px] flex items-center gap-1 font-semibold transition-colors px-2 py-1 rounded-md ${product.notes ? 'text-amber-700 bg-amber-50 hover:bg-amber-100' : 'text-gray-500 bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <MessageSquare size={12} /> {showNotes ? 'Close Notes' : (product.notes ? 'Edit Notes' : 'Add Note')}
                  </button>
                </div>

                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  <div className="flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    <Play size={11} />
                    <span className="truncate">{startedAgo}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                    <Timer size={11} />
                    <span className="truncate">Elapsed {processingElapsed}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
                    <Flag size={11} />
                    <span className="truncate">{finishedAgo}</span>
                  </div>
                </div>

                <div className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50 p-1.5">
                  <div className="grid grid-cols-4 gap-1">
                    {TIMER_STEPS.map((step, index) => {
                      const log = latestTimerLogs[step.action];
                      const isLogged = Boolean(log);
                      const isSaving = loggingAction === step.action;
                      const isResetting = resettingAction === step.action;
                      const previousStep = index > 0 ? TIMER_STEPS[index - 1] : null;
                      const isLocked = Boolean(previousStep && !latestTimerLogs[previousStep.action]);
                      const canReset = isLogged && canEditTimers && loggingAction === null && resettingAction === null;
                      const disabled = loggingAction !== null || resettingAction !== null || isLogged || isLocked || !canEditTimers;
                      const tooltip = isLocked
                        ? 'Complete the previous timer step first'
                        : isLogged
                          ? `${step.label} logged at ${formatTimerTime(log?.createdAt)}`
                          : step.lastAction;

                      return (
                        <div key={step.action} className="relative">
                          <button
                            onClick={() => handleTimerAction(step.action)}
                            disabled={disabled}
                            title={tooltip}
                            className={`min-h-[34px] min-w-0 w-full rounded-md border px-1 py-0.5 text-center transition-colors disabled:cursor-not-allowed ${
                              isLogged
                                ? 'border-green-200 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                            } ${isLocked || !canEditTimers || ((loggingAction !== null || resettingAction !== null) && !isSaving && !isResetting) ? 'opacity-60' : ''}`}
                          >
                            <span className="flex items-center justify-center gap-1 text-[8px] font-bold uppercase leading-none">
                              {isLogged ? <Check size={10} /> : <Clock size={10} />}
                              <span className="truncate">{isSaving ? 'Save' : isResetting ? 'Reset' : step.shortLabel}</span>
                            </span>
                            <span className={`mt-0.5 block truncate font-mono text-[8px] leading-none ${isLogged ? 'text-green-700' : 'text-gray-400'}`}>
                              {formatTimerClock(log?.createdAt) || '--:--'}
                            </span>
                          </button>
                          {canReset && (
                            <button
                              onClick={() => handleResetTimerAction(step.action)}
                              className="absolute -right-1 -top-1 rounded-full border border-gray-200 bg-white p-0.5 text-gray-500 shadow-sm hover:text-blue-700"
                              title={`Reset ${step.label}`}
                            >
                              <Undo2 size={9} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 border-t border-gray-200 pt-1.5">
                    {durationRows.map((row) => (
                      <div key={row.label} title={`${row.label}: ${row.value}`} className="min-w-0 text-center">
                        <span className="block truncate text-[7px] font-bold uppercase leading-none text-gray-400">{row.label}</span>
                        <span className={`mt-0.5 block truncate font-mono text-[9px] font-bold leading-none ${row.active ? 'text-blue-600' : row.value !== '--' ? 'text-gray-700' : 'text-gray-300'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
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
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
