import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithAuth } from '../utils/api';
import type { Product, ProductActionLog, TimerAction } from '../types';

const TIMER_STEPS: { action: TimerAction; label: string; shortLabel: string; lastAction: string }[] = [
  { action: 'generation_start', label: 'Generation Start', shortLabel: 'Start', lastAction: 'Generation started' },
  { action: 'generation_complete', label: 'Generation Complete', shortLabel: 'Done', lastAction: 'Generation completed' },
  { action: 'qc_correction_start', label: 'QC & Correction Start', shortLabel: 'QC', lastAction: 'QC and correction started' },
  { action: 'finish', label: 'Finish', shortLabel: 'Finish', lastAction: 'Task finished' },
];

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
  const [nowTick, setNowTick] = useState<number | null>(null);

  const latestLogs = useMemo(() => {
    return TIMER_STEPS.reduce<Record<TimerAction, ProductActionLog | undefined>>((logs, step) => {
      logs[step.action] = product.actionLogs?.find((log) => log.action === step.action);
      return logs;
    }, {} as Record<TimerAction, ProductActionLog | undefined>);
  }, [product.actionLogs]);

  const generationStartAt = getLogTime(latestLogs.generation_start);
  const generationCompleteAt = getLogTime(latestLogs.generation_complete);
  const qcStartAt = getLogTime(latestLogs.qc_correction_start);
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
      value: formatDuration(qcStartAt, finishAt || (qcStartAt ? nowTick : null)),
      active: Boolean(qcStartAt && !finishAt),
    },
    {
      label: 'Total',
      value: formatDuration(generationStartAt, finishAt || (generationStartAt && !finishAt ? nowTick : null)),
      active: Boolean(generationStartAt && !finishAt),
    },
  ];

  const handleTimerAction = async (action: TimerAction) => {
    if (!canEdit) {
      toast.error('Only the assigned worker or admin can log this timer');
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
      onProductUpdated(updated);
      toast.success(`${step?.label || 'Timer'} logged`);
    } catch (error: any) {
      toast.error(error.message || 'Timer update failed');
    } finally {
      setSavingAction(null);
    }
  };

  const containerClass =
    variant === 'rail'
      ? 'flex flex-col gap-1'
      : variant === 'row'
        ? 'flex min-w-[190px] flex-wrap gap-1'
        : 'grid grid-cols-4 gap-1';

  const buttonClass =
    variant === 'rail'
      ? 'h-[30px] w-12 rounded-md border px-1 text-center transition-colors disabled:cursor-not-allowed'
      : variant === 'row'
        ? 'h-[34px] min-w-[44px] rounded-md border px-1.5 text-center transition-colors disabled:cursor-not-allowed'
        : 'min-h-[38px] rounded-md border px-1.5 text-center transition-colors disabled:cursor-not-allowed';

  return (
    <div className={variant === 'rail' ? 'flex flex-col gap-1' : 'flex flex-col gap-1.5'}>
      <div className={containerClass}>
        {TIMER_STEPS.map((step, index) => {
          const log = latestLogs[step.action];
          const isLogged = Boolean(log);
          const isSaving = savingAction === step.action;
          const previousStep = index > 0 ? TIMER_STEPS[index - 1] : null;
          const isLocked = Boolean(previousStep && !latestLogs[previousStep.action]);
          const disabled = savingAction !== null || isLogged || isLocked || !canEdit;
          const tooltip = !canEdit
            ? 'Assigned worker or admin only'
            : isLocked
              ? 'Complete the previous timer step first'
              : isLogged
                ? `${step.label}: ${formatFullTime(log?.createdAt)}`
                : step.lastAction;

          return (
            <button
              key={step.action}
              type="button"
              onClick={() => handleTimerAction(step.action)}
              disabled={disabled}
              title={tooltip}
              className={`${buttonClass} ${
                isLogged
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200 hover:bg-blue-50'
              } ${!canEdit || isLocked || (savingAction !== null && !isSaving) ? 'opacity-60' : ''}`}
            >
              <span className="flex items-center justify-center gap-0.5 text-[9px] font-bold uppercase leading-none">
                {isLogged ? <Check size={9} /> : <Clock size={9} />}
                <span className="truncate">{isSaving ? 'Save' : step.shortLabel}</span>
              </span>
              <span className={`mt-0.5 block truncate font-mono text-[8px] leading-none ${isLogged ? 'text-green-700' : 'text-gray-400'}`}>
                {formatShortTime(log?.createdAt)}
              </span>
            </button>
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
    </div>
  );
};
