export type TimerAction =
  | 'generation_start'
  | 'generation_complete'
  | 'qc_correction_start'
  | 'finish'
  | 'regeneration';

export interface ProductActionLog {
  id: string;
  action: TimerAction;
  createdAt: string;
  user?: { id: string; username: string } | null;
}

export interface Product {
  id: string;
  product_name: string;
  drive_folder: string;
  reference_link?: string;
  thumbnail_url?: string;
  createdAt?: string;
  updatedAt?: string;
  assigned_to?: string | null;
  assignee?: { id: string; username: string } | null;
  status: 'pending' | 'in-progress' | 'completed' | 'rework';
  actionLogs?: ProductActionLog[];
  last_action?: string | null;
  completed: boolean;
  nameCopied: boolean;
  driveCopied: boolean;
  referenceCopied: boolean;
  driveOpened: boolean;
  referenceOpened: boolean;
  notes: string;
}

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'completed' | 'rework';
