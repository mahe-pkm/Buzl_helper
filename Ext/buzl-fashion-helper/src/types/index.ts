export interface Product {
  id: string;
  product_name: string;
  drive_folder: string;
  reference_link?: string;
  thumbnail_url?: string;
  assigned_to?: string | null;
  assignee?: { id: string; username: string } | null;
  status: 'pending' | 'in-progress' | 'completed' | 'rework';
  completed: boolean;
  nameCopied: boolean;
  driveCopied: boolean;
  referenceCopied: boolean;
  driveOpened: boolean;
  referenceOpened: boolean;
  notes: string;
}

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'completed' | 'rework';
