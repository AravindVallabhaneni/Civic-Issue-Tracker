import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  assigned: '#f97316',
  in_progress: '#f97316',
  resolved: '#9ca3af',
};

const CATEGORY_LABELS: Record<string, string> = {
  streetlight: 'Street Lights',
  garbage: 'Sanitation',
  water_leak: 'Water Leak',
  pothole: 'Potholes',
  road_damage: 'Road Damage',
  noise_pollution: 'Noise',
  illegal_dumping: 'Illegal Dumping',
  other: 'Other',
};

interface Cluster {
  id: string;
  category: string;
  centroid_lat: number;
  centroid_lng: number;
  report_count: number;
  status: string;
  priority: number;
  department_name: string | null;
}

export default function MapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const navigate = useNavigate();

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [avgDays, setAvgDays] = useState<string>('—');
  const [statusFilter, setStatusFilter] = useState({ open: true, in_progress: true, resolved: false });
  const [catFilter, setCatFilter] = useState<Record<string, boolean>>({
    pothole: false, streetlight: false, garbage: false,
    noise_pollution: false, illegal_dumping: false, other: false,
  });

  // Load clusters from the API
  const loadClusters = async () => {
    try {
      const params = new URLSearchParams();
      const statuses: string[] = [];
      if (statusFilter.open) statuses.push('open');
      if (statusFilter.in_progress) statuses.push('assigned', 'in_progress');
      if (statusFilter.resolved) statuses.push('resolved');
      if (statuses.length === 0) { setClusters([]); return; }
      params.set('limit', '200');

      const res = await fetch(`/api/clusters?${params}`);
      if (!res.ok) return;
      const data: Cluster[] = await res.json();

      // Apply filters client-side
      const activeCats = Object.entries(catFilter).filter(([, v]) => v).map(([k]) => k);
      const filtered = data.filter(c => {
        const statusOk = statuses.includes(c.status);
        const catOk = activeCats.length === 0 || activeCats.includes(c.category);
        return statusOk && catOk;
      });
      setClusters(filtered);
    } catch (e) {
      console.error('Failed to load clusters', e);
    }
  };

  // Load public stats
  const loadStats = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/stats/public');
      if (!res.ok) return;
      const data = await res.json();
      setTotalReports(data.total_reports ?? 0);
      if (data.avg_resolution_hours) {
        setAvgDays((data.avg_resolution_hours / 24).toFixed(1));
      }
    } catch (e) { /* silent */ }
  };

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Try to get user location
    navigator.geolocation?.getCurrentPosition(pos => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 13);
    });

    mapRef.current = map;
    loadClusters();
    loadStats();

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw markers whenever clusters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    clusters.forEach(c => {
      if (!c.centroid_lat || !c.centroid_lng) return;
      const color = STATUS_COLORS[c.status] ?? '#9ca3af';

      const marker = L.circleMarker([c.centroid_lat, c.centroid_lng], {
        radius: Math.max(7, Math.min(18, 7 + c.report_count)),
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.85,
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px">${CATEGORY_LABELS[c.category] ?? c.category}</div>
          <div style="font-size:12px;color:#6b7280">${c.report_count} report${c.report_count !== 1 ? 's' : ''}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">${c.department_name ?? 'Unassigned'}</div>
          <button onclick="window.__civicNav('${c.id}')"
            style="margin-top:8px;width:100%;padding:5px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">
            View Details
          </button>
        </div>
      `);

      markersRef.current.push(marker);
    });

    (window as any).__civicNav = (id: string) => navigate(`/issues/${id}`);
  }, [clusters, navigate]);

  // Reload when filters change
  useEffect(() => {
    if (mapRef.current) loadClusters();
  }, [statusFilter, catFilter]);

  const toggleStatus = (key: keyof typeof statusFilter) =>
    setStatusFilter(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleCat = (key: string) =>
    setCatFilter(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 56px)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Filter Panel */}
      <div className="map-filter-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Filters</span>
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 12, color: 'var(--primary)' }}
            onClick={() => {
              setStatusFilter({ open: true, in_progress: true, resolved: false });
              setCatFilter(Object.fromEntries(Object.keys(catFilter).map(k => [k, false])));
            }}>Clear all</button>
        </div>

        <div className="section-title">STATUS</div>
        {[
          { key: 'open', label: 'Open Issues', dotClass: 'dot-open' },
          { key: 'in_progress', label: 'In Progress', dotClass: 'dot-in_progress' },
          { key: 'resolved', label: 'Resolved', dotClass: 'dot-resolved' },
        ].map(({ key, label, dotClass }) => (
          <label key={key} className="checkbox-row">
            <input type="checkbox"
              checked={statusFilter[key as keyof typeof statusFilter]}
              onChange={() => toggleStatus(key as keyof typeof statusFilter)} />
            <span className={`status-dot ${dotClass}`} />
            <span>{label}</span>
          </label>
        ))}

        <div className="divider" />
        <div className="section-title">CATEGORIES</div>
        {Object.entries(CATEGORY_LABELS).slice(0, 6).map(([key, label]) => (
          <label key={key} className="checkbox-row">
            <input type="checkbox" checked={!!catFilter[key]} onChange={() => toggleCat(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="map-stats-bar">
        <div>
          <div className="map-stat-label">Active Reports</div>
          <div className="map-stat-value">{totalReports.toLocaleString()}</div>
        </div>
        <div>
          <div className="map-stat-label">Avg. Response</div>
          <div className="map-stat-value blue">{avgDays === '—' ? '—' : `${avgDays} Days`}</div>
        </div>
      </div>
    </div>
  );
}
