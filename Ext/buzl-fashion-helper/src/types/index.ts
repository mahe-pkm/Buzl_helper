export type TimerAction =
  | 'generation_start'
  | 'generation_complete'
  | 'qc_correction_start'
  | 'qc_done'
  | 'finish'
  | 'brand_approved'
  | 'site_uploaded'
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
  category?: string | null;
  drive_folder: string;
  reference_link?: string;
  reference_thumbnail_url?: string | null;
  thumbnail_url?: string;
  thumbnail_cached_data?: string | null;
  reference_thumbnail_cached_data?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignedAt?: string | null;
  lastActivityAt?: string | null;
  assigned_to?: string | null;
  assignee?: { id: string; username: string } | null;
  status: 'pending' | 'in-progress' | 'completed' | 'rework';
  current_phase?: 'none' | 'generation' | 'qc' | 'finished' | string;
  regen_image_count?: number;
  generated_image_count?: number;
  full_regen_image_count?: number;
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

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'generation' | 'to-qc' | 'qc' | 'post' | 'completed' | 'rework';
