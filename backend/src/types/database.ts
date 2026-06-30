// Auto-generated from Supabase schema — update as schema evolves
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type IssueCategory = 
  | 'streetlight' 
  | 'garbage' 
  | 'water_leak' 
  | 'pothole' 
  | 'road_damage'
  | 'noise_pollution'
  | 'illegal_dumping'
  | 'other';

export type IssueStatus = 
  | 'reported' 
  | 'acknowledged' 
  | 'in_progress' 
  | 'resolved' 
  | 'rejected';

export type ClusterStatus = 'open' | 'assigned' | 'resolved';

export type UserRole = 'citizen' | 'department_staff' | 'admin';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          department_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
          department_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: UserRole;
          department_id?: string | null;
          created_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          category_keys: IssueCategory[];
          contact_email: string | null;
          jurisdiction_geom: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          category_keys: IssueCategory[];
          contact_email?: string | null;
          jurisdiction_geom?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          category_keys?: IssueCategory[];
          contact_email?: string | null;
          jurisdiction_geom?: string | null;
        };
      };
      issue_reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          category: IssueCategory;
          description: string | null;
          photo_url: string | null;
          location: string; // PostGIS geometry as WKT/GeoJSON
          address_text: string | null;
          status: IssueStatus;
          cluster_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          category: IssueCategory;
          description?: string | null;
          photo_url?: string | null;
          location: string;
          address_text?: string | null;
          status?: IssueStatus;
          cluster_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string | null;
          category?: IssueCategory;
          description?: string | null;
          photo_url?: string | null;
          location?: string;
          address_text?: string | null;
          status?: IssueStatus;
          cluster_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      issue_clusters: {
        Row: {
          id: string;
          category: IssueCategory;
          centroid: string; // PostGIS geometry as WKT/GeoJSON
          report_count: number;
          department_id: string | null;
          status: ClusterStatus;
          priority: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category: IssueCategory;
          centroid: string;
          report_count?: number;
          department_id?: string | null;
          status?: ClusterStatus;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category?: IssueCategory;
          centroid?: string;
          report_count?: number;
          department_id?: string | null;
          status?: ClusterStatus;
          priority?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      status_updates: {
        Row: {
          id: string;
          cluster_id: string | null;
          updated_by: string | null;
          old_status: string | null;
          new_status: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cluster_id?: string | null;
          updated_by?: string | null;
          old_status?: string | null;
          new_status?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cluster_id?: string | null;
          updated_by?: string | null;
          old_status?: string | null;
          new_status?: string | null;
          note?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      find_nearby_clusters: {
        Args: { p_category: string; p_lat: number; p_lng: number; p_radius_meters: number };
        Returns: Array<{
          id: string;
          category: string;
          report_count: number;
          department_id: string | null;
          status: string;
          priority: number;
          created_at: string;
          distance_meters: number;
        }>;
      };
      create_cluster: {
        Args: { p_category: string; p_lat: number; p_lng: number; p_department_id?: string | null; p_priority?: number };
        Returns: Array<{ id: string }>;
      };
      update_cluster_centroid: {
        Args: { p_cluster_id: string };
        Returns: void;
      };
      create_report: {
        Args: { p_id: string; p_reporter_id: string | null; p_category: string; p_description: string | null; p_photo_url: string | null; p_lat: number; p_lng: number; p_address_text: string };
        Returns: Array<{ id: string; created_at: string }>;
      };
      get_report_by_id: {
        Args: { p_id: string };
        Returns: Array<{
          id: string; reporter_id: string | null; category: string; description: string | null;
          photo_url: string | null; lat: number; lng: number; address_text: string | null;
          status: string; cluster_id: string | null; created_at: string; updated_at: string;
        }>;
      };
      get_reports_geojson: {
        Args: { p_cluster_id?: string | null; p_limit?: number; p_offset?: number };
        Returns: Array<{
          id: string; reporter_id: string | null; category: string; description: string | null;
          photo_url: string | null; lat: number; lng: number; address_text: string | null;
          status: string; cluster_id: string | null; created_at: string;
        }>;
      };
      get_clusters_in_viewport: {
        Args: { p_min_lat?: number; p_min_lng?: number; p_max_lat?: number; p_max_lng?: number; p_category?: string | null; p_status?: string | null; p_limit?: number; p_offset?: number };
        Returns: Array<{
          id: string; category: string; centroid_lat: number; centroid_lng: number;
          report_count: number; department_id: string | null; department_name: string | null;
          status: string; priority: number; created_at: string; updated_at: string;
        }>;
      };
      get_cluster_detail: {
        Args: { p_cluster_id: string };
        Returns: Array<{
          id: string; category: string; centroid_lat: number; centroid_lng: number;
          report_count: number; department_id: string | null; department_name: string | null;
          status: string; priority: number; sample_photos: string[] | null;
          created_at: string; updated_at: string;
        }>;
      };
      get_public_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      get_department_stats: {
        Args: { p_department_id: string };
        Returns: Json;
      };
    };
  };
}

// API response shapes
export interface ClusterWithLocation {
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
}

export interface ReportWithLocation {
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
  updated_at: string;
}
