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
  reference_link?: string | null;
  reference_thumbnail_url?: string | null;
  status: string; // "pending" | "in-progress" | "completed"
  current_phase?: 'none' | 'generation' | 'qc' | 'finished' | string;
  regen_image_count?: number;
  generated_image_count?: number;
  full_regen_image_count?: number;
  assigned_to?: string | null;
  assignedAt?: string | null;
  lastActivityAt?: string | null;
  assignee?: { id: string; username: string } | null;
  notes?: string | null;
  thumbnail_url?: string | null;
  thumbnail_cached_data?: string | null;
  reference_thumbnail_cached_data?: string | null;
  last_action?: string | null;
  actionLogs?: ProductActionLog[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Worker {
  id: string;
  username: string;
  role: string;
}

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'completed';
