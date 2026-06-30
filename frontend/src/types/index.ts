export type IssueCategory = 
  | 'streetlight' | 'garbage' | 'water_leak' | 'pothole'
  | 'road_damage' | 'noise_pollution' | 'illegal_dumping' | 'other';

export type IssueStatus = 
  | 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'rejected';

export type ClusterStatus = 'open' | 'assigned' | 'resolved';

export type UserRole = 'citizen' | 'department_staff' | 'admin';

export interface Cluster {
  id: string;
  category: IssueCategory;
  centroid_lat: number;
  centroid_lng: number;
  report_count: number;
  department_id: string | null;
  department_name: string | null;
  status: ClusterStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  sample_photos?: string[];
}

export interface Report {
  id: string;
  reporter_id: string | null;
  category: IssueCategory;
  description: string | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  address_text: string | null;
  status: IssueStatus;
  cluster_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  category_keys: IssueCategory[];
  contact_email: string | null;
}

export interface StatusUpdate {
  id: string;
  cluster_id: string;
  updated_by: string | null;
  old_status: string;
  new_status: string;
  note: string | null;
  created_at: string;
}

export interface PublicStats {
  total_reports: number;
  total_clusters: number;
  resolved_this_month: number;
  open_clusters: number;
  avg_resolution_hours: number | null;
  by_category: Record<IssueCategory, number>;
  by_department: Array<{
    department: string;
    total: number;
    resolved: number;
  }>;
}

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  streetlight: 'Streetlight',
  garbage: 'Garbage',
  water_leak: 'Water Leak',
  pothole: 'Pothole',
  road_damage: 'Road Damage',
  noise_pollution: 'Noise Pollution',
  illegal_dumping: 'Illegal Dumping',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<IssueCategory, string> = {
  streetlight: '💡',
  garbage: '🗑️',
  water_leak: '💧',
  pothole: '🕳️',
  road_damage: '🚧',
  noise_pollution: '🔊',
  illegal_dumping: '♻️',
  other: '⚠️',
};

export const CATEGORY_COLORS: Record<IssueCategory, string> = {
  streetlight: '#fbbf24',
  garbage: '#84cc16',
  water_leak: '#06b6d4',
  pothole: '#f97316',
  road_damage: '#ef4444',
  noise_pollution: '#a855f7',
  illegal_dumping: '#78716c',
  other: '#6b7280',
};

export const STATUS_LABELS: Record<string, string> = {
  reported: 'Reported',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  open: 'Open',
  assigned: 'Assigned',
};

export const STATUS_COLORS: Record<string, string> = {
  reported: '#6b7280',
  acknowledged: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  rejected: '#ef4444',
  open: '#f59e0b',
  assigned: '#3b82f6',
};
