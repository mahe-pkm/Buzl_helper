import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock, RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../utils/api';
import type { Product, ProductActionLog, TimerAction } from '../types';

const TIMER_STEPS: { action: TimerAction; label: string; shortLabel: string; lastAction: string }[] = [
  { action: 'generation_start', label: 'Image Gen Start', shortLabel: 'Start', lastAction: 'Image generation started' },
  { action: 'generation_complete', label: 'Image Gen Finished', shortLabel: 'Gen Done', lastAction: 'Image generation finished' },
  { action: 'qc_correction_start', label: 'Move to QC', shortLabel: 'To QC', lastAction: 'Moved to QC' },
  { action: 'qc_done', label: 'QC Finished', shortLabel: 'QC Done', lastAction: 'QC finished' },
  { action: 'finish', label: 'Send to Brand', shortLabel: 'Brand', lastAction: 'Sent to brand' },
];
const POST_PROCESS_STEPS: { action: TimerAction; label: string; lastAction: string }[] = [
  { action: 'brand_approved', label: 'Brand Approved', lastAction: 'Brand approved' },
  { action: 'site_uploaded', label: 'Site Uploaded', lastAction: 'Site uploaded' },
];
const LOG_TRACKED_STEPS = [...TIMER_STEPS, ...POST_PROCESS_STEPS];
const REGEN_ACTION: TimerAction = 'regeneration';

const formatFullTime = (value?: string) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatShortTime = (value?: string) => {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

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

interface TaskTimerProps {
  product: Product;
  canEdit: boolean;
  onProductUpdated: (product: Product) => void;
  variant?: 'stack' | 'row' | 'rail';
}

export const TaskTimer: React.FC<TaskTimerProps> = ({
  product,
  canEdit,
  onProductUpdated,
  variant = 'stack',
}) => {
  const [savingAction, setSavingAction] = useState<TimerAction | null>(null);
  const [resettingAction, setResettingAction] = useState<TimerAction | null>(null);
  const [savingRegen, setSavingRegen] = useState(false);
  const [postOpen, setPostOpen] = useState(false);
  const [nowTick, setNowTick] = useState<number | null>(null);

  const latestLogs = useMemo(() => {
    return LOG_TRACKED_STEPS.reduce<Partial<Record<TimerAction, ProductActionLog>>>((logs, step) => {
      logs[step.action] = product.actionLogs?.find((log) => log.action === step.action);
      return logs;
    }, {});
  }, [product.actionLogs]);

  const generationStartAt = getLogTime(latestLogs.generation_start);
  const generationCompleteAt = getLogTime(latestLogs.generation_complete);
  const qcStartAt = getLogTime(latestLogs.qc_correction_start);
  const qcDoneAt = getLogTime(latestLogs.qc_done);
  const finishAt = getLogTime(latestLogs.finish);

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
      value: formatDuration(qcStartAt, qcDoneAt || (qcStartAt ? nowTick : null)),
      active: Boolean(qcStartAt && !qcDoneAt),
    },
    {
      label: 'Total',
      value: formatDuration(generationStartAt, finishAt || (generationStartAt && !finishAt ? nowTick : null)),
      active: Boolean(generationStartAt && !finishAt),
    },
  ];
  const regenCount = useMemo(() => (product.actionLogs || []).filter((log) => log.action === REGEN_ACTION).length, [product.actionLogs]);

  const commitTimerAction = async (action: TimerAction, generatedCountToStore: number | null) => {
    if (!canEdit) {
      toast.error('Only the assigned member or admin can log this timer');
      return;
    }

    const step = TIMER_STEPS.find((item) => item.action === action);
    const existingLog = latestLogs[action];
    if (existingLog) {
      toast.info(`${step?.label || 'Timer step'} already logged`);
      return;
    }

    setSavingAction(action);
    try {
      const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (generatedCountToStore !== null) {
        const patched = await fetchWithAuth(`/products/${product.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ generated_image_count: generatedCountToStore }),
        });
        onProductUpdated({ ...updated, generated_image_count: patched.generated_image_count });
      } else {
        onProductUpdated(updated);
      }
      toast.success(`${step?.label || 'Timer'} logged`);
    } catch (error: any) {
      toast.error(error.message || 'Timer update failed');
    } finally {
      setSavingAction(null);
    }
  };

  const handleTimerAction = async (action: TimerAction) => {
    if (action === 'generation_complete' && regenCount === 0) {
      const input = window.prompt('Generated image count for first generation run', String(product.generated_image_count ?? 0));
      if (input === null) return;
      const parsed = Number.parseInt(input, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error('Enter a valid non-negative number');
        return;
      }
      await commitTimerAction(action, parsed);
      return;
    }

    await commitTimerAction(action, null);
  };

  const handleRegeneration = async () => {
    if (!canEdit) {
      toast.error('Only the assigned member or admin can log this timer');
      return;
    }
    const input = window.prompt('Full re-gen: how many images were regenerated this time?', '1');
    if (input === null) return;
    const parsedCount = Number.parseInt(input, 10);
    if (!Number.isFinite(parsedCount) || parsedCount <= 0) {
      toast.error('Enter a positive number');
      return;
    }

    setSavingRegen(true);
    try {
      const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
        method: 'POST',
        body: JSON.stringify({ action: REGEN_ACTION }),
      });
      const nextFullRegenImageCount = (updated.full_regen_image_count ?? product.full_regen_image_count ?? 0) + parsedCount;
      const patched = await fetchWithAuth(`/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ full_regen_image_count: nextFullRegenImageCount }),
      });
      onProductUpdated({ ...updated, full_regen_image_count: patched.full_regen_image_count });
      const nextCount = (updated.actionLogs || []).filter((log: ProductActionLog) => log.action === REGEN_ACTION).length;
      toast.success(`Re-gen attempts: ${nextCount}. Full re-gen images +${parsedCount}`);
    } catch (error: any) {
      toast.error(error.message || 'Re-gen update failed');
    } finally {
      setSavingRegen(false);
    }
  };

  const handleResetTimerAction = async (action: TimerAction) => {
    if (!canEdit) {
      toast.error('Only the assigned member or admin can edit this timer');
      return;
    }

    const step = TIMER_STEPS.find((item) => item.action === action);
    setResettingAction(action);
    try {
      const updated = await fetchWithAuth(`/products/${product.id}/logs`, {
        method: 'DELETE',
        body: JSON.stringify({ action }),
      });
      onProductUpdated(updated);
      toast.success(`${step?.label || 'Timer'} reset`);
    } catch (error: any) {
      toast.error(error.message || 'Timer reset failed');
    } finally {
      setResettingAction(null);
    }
  };

  const containerClass =
    variant === 'rail'
      ? 'flex flex-col gap-1'
    : variant === 'row'
        ? 'flex min-w-[230px] flex-wrap gap-1'
        : 'grid grid-cols-5 gap-1';

  const buttonClass =
    variant === 'rail'
      ? 'h-[30px] w-12 rounded-md border px-1 text-center transition-colors disabled:cursor-not-allowed'
      : variant === 'row'
        ? 'h-[34px] min-w-[44px] rounded-md border px-1.5 text-center transition-colors disabled:cursor-not-allowed'
        : 'min-h-[38px] rounded-md border px-1.5 text-center transition-colors disabled:cursor-not-allowed';

  const regenButtonClass =
    variant === 'rail'
      ? 'h-[30px] w-12 rounded-md border border-blue-200 bg-blue-50 px-1 text-center text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed'
      : 'h-8 min-w-[86px] rounded-md border border-blue-200 bg-blue-50 px-2 text-center text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed';
  const regenLabel = savingRegen ? 'Save...' : variant === 'rail' ? `R${regenCount}` : `Re-gen (${regenCount})`;

  return (
    <div className={variant === 'rail' ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5'}>
      {variant !== 'rail' && (
        <div className="grid grid-cols-3 gap-1">
          <div className="rounded-md border border-blue-100 bg-blue-50 px-1.5 py-1 text-center" title="First generation image count">
            <span className="block text-[8px] font-bold uppercase text-blue-400">Gen Img</span>
            <span className="block text-[10px] font-bold text-blue-700">{product.generated_image_count ?? 0}</span>
          </div>
          <div className="rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-1 text-center" title="Images from full re-gen attempts">
            <span className="block text-[8px] font-bold uppercase text-indigo-400">Full Re-gen Img</span>
            <span className="block text-[10px] font-bold text-indigo-700">{product.full_regen_image_count ?? 0}</span>
          </div>
          <div className="rounded-md border border-teal-100 bg-teal-50 px-1.5 py-1 text-center" title="Manual re-gen image count">
            <span className="block text-[8px] font-bold uppercase text-teal-400">Re-gen Img</span>
            <span className="block text-[10px] font-bold text-teal-700">{product.regen_image_count ?? 0}</span>
          </div>
        </div>
      )}
      <div className={containerClass}>
        {TIMER_STEPS.map((step, index) => {
          const log = latestLogs[step.action];
          const isLogged = Boolean(log);
          const isSaving = savingAction === step.action;
          const isResetting = resettingAction === step.action;
          const previousStep = index > 0 ? TIMER_STEPS[index - 1] : null;
          const isLocked = Boolean(previousStep && !latestLogs[previousStep.action]);
          const canReset = isLogged && canEdit && savingAction === null && resettingAction === null && !savingRegen;
          const disabled = savingAction !== null || resettingAction !== null || isLogged || isLocked || !canEdit || savingRegen;
          const tooltip = !canEdit
            ? 'Assigned member or admin only'
            : isLocked
              ? 'Complete the previous timer step first'
              : isLogged
                ? `${step.label}: ${formatFullTime(log?.createdAt)}`
                : step.lastAction;

          return (
            <div key={step.action} className="relative">
              <button
                type="button"
                onClick={() => handleTimerAction(step.action)}
                disabled={disabled}
                title={tooltip}
                className={`${buttonClass} ${
                  isLogged
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
                } ${!canEdit || isLocked || ((savingAction !== null || resettingAction !== null) && !isSaving && !isResetting) ? 'opacity-60' : ''}`}
              >
                <span className="flex items-center justify-center gap-0.5 text-[9px] font-bold uppercase leading-none">
                  {isLogged ? <Check size={9} /> : <Clock size={9} />}
                  <span className="truncate">{isSaving ? 'Save' : isResetting ? 'Reset' : step.shortLabel}</span>
                </span>
                <span className={`mt-0.5 block truncate font-mono text-[8px] leading-none ${isLogged ? 'text-green-700' : 'text-gray-400'}`}>
                  {formatShortTime(log?.createdAt)}
                </span>
              </button>
              {canReset && (
                <button
                  type="button"
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

      <div className={variant === 'rail' ? 'flex flex-col gap-0.5' : 'grid grid-cols-4 gap-1 rounded-md border border-gray-200 bg-gray-50 p-1'}>
        {durationRows.map((row) => (
          <div key={row.label} title={`${row.label}: ${row.value}`} className={variant === 'rail' ? 'w-12 text-center' : 'min-w-0 text-center'}>
            <span className="block truncate text-[8px] font-bold uppercase leading-none text-gray-400">{row.label}</span>
            <span className={`mt-0.5 block truncate font-mono text-[8px] font-bold leading-none ${row.active ? 'text-blue-600' : row.value !== '--' ? 'text-gray-700' : 'text-gray-300'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleRegeneration}
        disabled={!canEdit || savingRegen || savingAction !== null || resettingAction !== null}
        title="Log one regeneration attempt"
        className={`${regenButtonClass} ${!canEdit ? 'opacity-60' : ''}`}
      >
        <span className="flex items-center justify-center gap-1 text-[9px] font-bold leading-none">
          <RotateCcw size={9} />
          {regenLabel}
        </span>
      </button>

      {variant !== 'rail' && (
        <div className="rounded-md border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setPostOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-2 py-1.5 text-left text-[10px] font-bold text-gray-700"
          >
            <span>Post Processing Stages</span>
            {postOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {postOpen && (
            <div className="grid grid-cols-2 gap-1 border-t border-gray-100 p-1.5">
              {POST_PROCESS_STEPS.map((step) => {
                const log = latestLogs[step.action];
                const isLogged = Boolean(log);
                const isSaving = savingAction === step.action;
                const isResetting = resettingAction === step.action;
                const canReset = isLogged && canEdit && savingAction === null && resettingAction === null && !savingRegen;
                const disabled = savingAction !== null || resettingAction !== null || isLogged || !canEdit || !latestLogs.finish || savingRegen;

                return (
                  <div key={step.action} className="relative">
                    <button
                      type="button"
                      onClick={() => handleTimerAction(step.action)}
                      disabled={disabled}
                      title={!latestLogs.finish ? 'Complete Send to Brand first' : step.lastAction}
                      className={`min-h-[34px] w-full rounded-md border px-1.5 text-left transition-colors disabled:cursor-not-allowed ${
                        isLogged
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      } ${disabled && !isSaving && !isResetting ? 'opacity-60' : ''}`}
                    >
                      <span className="block truncate text-[9px] font-bold">{isSaving ? 'Save' : isResetting ? 'Reset' : step.label}</span>
                      <span className={`mt-0.5 block truncate font-mono text-[8px] ${isLogged ? 'text-green-700' : 'text-gray-400'}`}>
                        {formatShortTime(log?.createdAt)}
                      </span>
                    </button>
                    {canReset && (
                      <button
                        type="button"
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
          )}
        </div>
      )}
    </div>
  );
};
