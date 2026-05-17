export interface Product {
  id: string;
  product_name: string;
  drive_folder: string;
  reference_link?: string | null;
  status: string; // "pending" | "in-progress" | "completed"
  assigned_to?: string | null;
  assignee?: { id: string; username: string } | null;
  notes?: string | null;
  thumbnail_url?: string | null;
  last_action?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Worker {
  id: string;
  username: string;
  role: string;
}

export type FilterStatus = 'all' | 'pending' | 'in-progress' | 'completed';
