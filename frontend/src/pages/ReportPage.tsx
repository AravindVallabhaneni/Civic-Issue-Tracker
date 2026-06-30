import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import L from 'leaflet';

const CATEGORIES = [
  { value: 'streetlight', label: 'Street Light' },
  { value: 'garbage', label: 'Garbage / Sanitation' },
  { value: 'water_leak', label: 'Water Leak' },
  { value: 'pothole', label: 'Pothole' },
  { value: 'road_damage', label: 'Road Damage' },
  { value: 'noise_pollution', label: 'Noise Pollution' },
  { value: 'illegal_dumping', label: 'Illegal Dumping' },
  { value: 'other', label: 'Other' },
];

export default function ReportPage() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  // Admins cannot submit reports — redirect to admin panel
  useEffect(() => {
    if (profile?.role === 'admin') navigate('/admin', { replace: true });
  }, [profile, navigate]);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('Detecting location...');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; clusterId: string | null } | null>(null);
  const [dragging, setDragging] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reverse geocode
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const a = data.address || {};
      const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.county, a.state].filter(Boolean);
      setAddress(parts.length ? parts.join(', ') : data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, []);

  const updateMarker = useCallback((lat: number, lng: number) => {
    setLat(lat); setLng(lng);
    reverseGeocode(lat, lng);
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    mapRef.current?.panTo([lat, lng]);
  }, [reverseGeocode]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], zoom: 13, zoomControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO', maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
      iconSize: [24, 24], iconAnchor: [12, 24], className: '',
    });

    const marker = L.marker([20.5937, 78.9629], { icon, draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updateMarker(pos.lat, pos.lng);
    });

    map.on('click', (e) => updateMarker(e.latlng.lat, e.latlng.lng));

    mapRef.current = map;
    markerRef.current = marker;

    // Auto-detect location
    setAddress('Detecting location...');
    navigator.geolocation?.getCurrentPosition(
      pos => updateMarker(pos.coords.latitude, pos.coords.longitude),
      () => { setAddress('Location not detected — click map to set'); setLat(null); setLng(null); },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, [updateMarker]);

  const handlePhotoSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/auth?redirect=/report'); return; }
    if (!category) { setError('Please select a category.'); return; }
    if (!lat || !lng) { setError('Please set your location on the map.'); return; }

    setSubmitting(true); setError(null);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      if (description.trim()) formData.append('description', description.trim());
      if (photo) formData.append('photo', photo);

      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/reports', { method: 'POST', body: formData, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setSuccess({ id: data.id, clusterId: data.cluster_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 24 }}>
        <div className="card p-6" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Report Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Your issue has been logged{success.clusterId ? ' and grouped with nearby reports' : ''}.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-outline" onClick={() => navigate('/')}>View Map</button>
            {success.clusterId && (
              <button className="btn btn-primary" onClick={() => navigate(`/issues/${success.clusterId}`)}>
                Track Issue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: 'calc(100vh - 56px)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Report an Issue</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          Your reports help us maintain a safer and cleaner community environment.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Photo Evidence */}
            <div>
              <label className="form-label">Photo Evidence</label>
              {photoPreview ? (
                <div style={{ position: 'relative' }}>
                  <img src={photoPreview} alt="Preview"
                    style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                  <button type="button"
                    onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className={`upload-area ${dragging ? 'dragging' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handlePhotoSelect(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderColor: dragging ? 'var(--primary)' : undefined }}
                >
                  <div className="upload-icon">
                    <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  </div>
                  <div className="upload-text">Tap to upload or drag photo here</div>
                  <div className="upload-hint">MAX 5MB • JPG, PNG</div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f); }} />
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Location</label>
                <button type="button" style={{ fontSize: 13, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    setAddress('Detecting...');
                    navigator.geolocation?.getCurrentPosition(
                      pos => updateMarker(pos.coords.latitude, pos.coords.longitude),
                      () => setAddress('Could not detect location')
                    );
                  }}>
                  Adjust Pin
                </button>
              </div>
              <div ref={mapContainerRef} style={{ height: 180, borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span>{address}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="form-label">Short Description</label>
              <textarea className="form-textarea" placeholder="Describe the issue in a few words..."
                value={description} onChange={e => setDescription(e.target.value)}
                style={{ minHeight: 90 }} />
            </div>

            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            {!user && (
              <div className="alert alert-info">
                <span>You must <Link to="/auth?redirect=/report" style={{ fontWeight: 600 }}>login or sign up</Link> to submit a report.</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting || !user}
              style={{ justifyContent: 'center' }}>
              {submitting ? <><span className="spinner" />Submitting...</> : 'Submit Report ➤'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
