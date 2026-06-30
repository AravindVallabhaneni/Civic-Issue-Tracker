import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Cluster, IssueCategory, ClusterStatus } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface MapFilters {
  category?: IssueCategory;
  status?: ClusterStatus;
  minLat?: number;
  minLng?: number;
  maxLat?: number;
  maxLng?: number;
}

interface MapState {
  clusters: Cluster[];
  selectedCluster: Cluster | null;
  filters: MapFilters;
  loading: boolean;
  realtimeChannel: RealtimeChannel | null;
  
  fetchClusters: (filters?: MapFilters) => Promise<void>;
  selectCluster: (cluster: Cluster | null) => void;
  setFilters: (filters: MapFilters) => void;
  subscribeToRealtime: () => void;
  unsubscribeFromRealtime: () => void;
  updateClusterInState: (cluster: Partial<Cluster> & { id: string }) => void;
}

export const useMapStore = create<MapState>((set, get) => ({
  clusters: [],
  selectedCluster: null,
  filters: {},
  loading: false,
  realtimeChannel: null,

  fetchClusters: async (filters?: MapFilters) => {
    const activeFilters = filters || get().filters;
    set({ loading: true });

    try {
      const params = new URLSearchParams();
      if (activeFilters.minLat !== undefined) params.set('min_lat', activeFilters.minLat.toString());
      if (activeFilters.minLng !== undefined) params.set('min_lng', activeFilters.minLng.toString());
      if (activeFilters.maxLat !== undefined) params.set('max_lat', activeFilters.maxLat.toString());
      if (activeFilters.maxLng !== undefined) params.set('max_lng', activeFilters.maxLng.toString());
      if (activeFilters.category) params.set('category', activeFilters.category);
      if (activeFilters.status) params.set('status', activeFilters.status);

      const response = await fetch(`/api/clusters?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch clusters');
      
      const data = await response.json();
      set({ clusters: data, loading: false });
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      set({ loading: false });
    }
  },

  selectCluster: (cluster) => set({ selectedCluster: cluster }),

  setFilters: (filters) => {
    set({ filters });
    get().fetchClusters(filters);
  },

  subscribeToRealtime: () => {
    const channel = supabase
      .channel('issue_clusters_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issue_clusters' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT') {
            // New cluster created — need to fetch full data with lat/lng
            get().fetchClusters();
          } else if (eventType === 'UPDATE' && newRecord) {
            get().updateClusterInState(newRecord as Partial<Cluster> & { id: string });
          } else if (eventType === 'DELETE' && oldRecord) {
            set((state) => ({
              clusters: state.clusters.filter((c) => c.id !== (oldRecord as { id: string }).id),
            }));
          }
        }
      )
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromRealtime: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  updateClusterInState: (updated) => {
    set((state) => ({
      clusters: state.clusters.map((c) =>
        c.id === updated.id ? { ...c, ...updated } : c
      ),
      selectedCluster: state.selectedCluster?.id === updated.id
        ? { ...state.selectedCluster, ...updated }
        : state.selectedCluster,
    }));
  },
}));
