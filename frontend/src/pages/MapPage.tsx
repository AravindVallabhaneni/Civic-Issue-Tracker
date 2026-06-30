import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useMapStore } from '../store/mapStore';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../types';
import type { Cluster, IssueCategory, ClusterStatus } from '../types';
import ClusterPopup from '../components/ClusterPopup';
import MapFiltersPanel from '../components/MapFiltersPanel';
import RealtimeBadge from '../components/RealtimeBadge';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Default center: Bengaluru, India (change to your city)
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

function ClusterMarkers() {
  const { clusters, selectCluster, selectedCluster } = useMapStore();
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    // Remove markers for clusters that no longer exist
    markersRef.current.forEach((marker, id) => {
      if (!clusters.find((c) => c.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add/update markers
    clusters.forEach((cluster) => {
      const existing = markersRef.current.get(cluster.id);

      if (existing) {
        // Update position (centroid may have changed)
        existing.setLatLng([cluster.centroid_lat, cluster.centroid_lng]);
        // Update icon
        const icon = createClusterIcon(cluster);
        existing.setIcon(icon);
        return;
      }

      const icon = createClusterIcon(cluster);
      const marker = L.marker([cluster.centroid_lat, cluster.centroid_lng], { icon });

      marker.on('click', () => selectCluster(cluster));
      marker.addTo(map);
      markersRef.current.set(cluster.id, marker);
    });

    return () => {
      // Cleanup on unmount
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
    };
  }, [clusters, map, selectCluster]);

  return null;
}

function createClusterIcon(cluster: Cluster): L.DivIcon {
  const color = CATEGORY_COLORS[cluster.category];
  const emoji = CATEGORY_ICONS[cluster.category];
  const size = Math.max(36, Math.min(56, 36 + Math.log2(cluster.report_count + 1) * 6));
  const isPriority = cluster.priority >= 60;

  return L.divIcon({
    html: `
      <div class="cluster-marker ${isPriority ? 'priority-critical' : ''}" 
           style="width:${size}px;height:${size}px;background:${color};font-size:${Math.max(14, size * 0.35)}px;"
           title="${CATEGORY_LABELS[cluster.category]} — ${cluster.report_count} reports">
        ${emoji}
        ${cluster.report_count > 1 ? `<span style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #0a0f1e">${cluster.report_count > 99 ? '99+' : cluster.report_count}</span>` : ''}
      </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapEventHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  useMapEvents({
    moveend: (e) => {
      onBoundsChange((e.target as L.Map).getBounds());
    },
    zoomend: (e) => {
      onBoundsChange((e.target as L.Map).getBounds());
    },
  });
  return null;
}

export default function MapPage() {
  const { clusters, fetchClusters, selectedCluster, selectCluster, subscribeToRealtime, unsubscribeFromRealtime, loading } = useMapStore();
  const [showFilters, setShowFilters] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClusters();
    subscribeToRealtime();
    return () => unsubscribeFromRealtime();
  }, []);

  useEffect(() => {
    setLiveCount(clusters.length);
  }, [clusters.length]);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    fetchClusters({
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    });
  }, [fetchClusters]);

  return (
    <div className="relative h-full">
      {/* Map */}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          maxZoom={19}
        />
        <MapEventHandler onBoundsChange={handleBoundsChange} />
        <ClusterMarkers />
      </MapContainer>

      {/* Top-left: stats overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <RealtimeBadge count={liveCount} loading={loading} />
      </div>

      {/* Top-right: filter button */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2 shadow-xl"
          id="filter-toggle-btn"
        >
          <FunnelIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
        </button>
        <button
          onClick={() => navigate('/report')}
          className="btn-primary flex items-center gap-2 shadow-xl"
          id="report-issue-btn"
        >
          <span className="text-lg leading-none">＋</span>
          <span className="hidden sm:inline">Report Issue</span>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] glass rounded-xl p-3 max-w-xs hidden md:block">
        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Categories</p>
        <div className="grid grid-cols-2 gap-1">
          {(Object.entries(CATEGORY_COLORS) as [IssueCategory, string][]).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-slate-400">{CATEGORY_LABELS[cat]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="absolute top-14 right-4 z-[1000] animate-fade-in">
          <MapFiltersPanel onClose={() => setShowFilters(false)} />
        </div>
      )}

      {/* Selected cluster popup */}
      {selectedCluster && (
        <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-96 z-[1000] animate-slide-up">
          <ClusterPopup
            cluster={selectedCluster}
            onClose={() => selectCluster(null)}
            onViewDetails={() => navigate(`/clusters/${selectedCluster.id}`)}
          />
        </div>
      )}
    </div>
  );
}
