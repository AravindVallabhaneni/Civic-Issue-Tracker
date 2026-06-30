import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import L from 'leaflet';

const CATEGORY_LABELS: Record<string, string> = {
  streetlight: 'Street Light', garbage: 'Sanitation', water_leak: 'Water Leak',
  pothole: 'Pothole', road_damage: 'Road Damage', noise_pollution: 'Noise Pollution',
  illegal_dumping: 'Illegal Dumping', other: 'Other',
};

const DEPT_CONTACT: Record<string, { division: string; dept: string; hotline: string }> = {
  'Electrical Department': { division: 'Street Lighting & Traffic Signals Division', dept: 'Electrical Dept', hotline: '3-1-1' },
  'Sanitation Department': { division: 'Waste Management Division', dept: 'Sanitation', hotline: '3-1-1' },
  'Water & Sewage Department': { division: 'Water & Sewage Division', dept: 'Public Works', hotline: '3-1-1' },
  'Roads & Infrastructure': { division: 'Roads & Infrastructure Division', dept: 'Public Works', hotline: '3-1-1' },
  'Environment & Noise Control': { division: 'Environmental Control Division', dept: 'Environment Dept', hotline: '3-1-1' },
};

const STATUS_STEPS = ['reported', 'acknowledged', 'in_progress', 'resolved'];
const STATUS_LABELS = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];

function priorityLabel(p: number) {
  if (p >= 70) return 'Critical';
  if (p >= 40) return 'High';
  if (p >= 20) return 'Medium';
  return 'Low';
}

export default function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const isStaff = profile?.role === 'department_staff' || profile?.role === 'admin';

  const [cluster, setCluster] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');

  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/clusters/${id}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/reports?cluster_id=${id}&limit=20`).then(r => r.ok ? r.json() : []),
    ]).then(([combined, r]) => {
      if (combined) {
        setCluster(combined.cluster ?? combined);
        setStatusHistory(combined.status_history ?? []);
      }
      setReports(Array.isArray(r) ? r : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Mini map
  useEffect(() => {
    if (!cluster || !miniMapRef.current || miniMapInstance.current) return;
    const { centroid_lat: lat, centroid_lng: lng } = cluster;
    if (!lat || !lng) return;

    const map = L.map(miniMapRef.current, { center: [lat, lng], zoom: 15, zoomControl: false, dragging: false, scrollWheelZoom: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.circleMarker([lat, lng], { radius: 10, fillColor: '#2563eb', color: '#fff', weight: 2, fillOpacity: 1 }).addTo(map);
    miniMapInstance.current = map;
    return () => { map.remove(); miniMapInstance.current = null; };
  }, [cluster]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !id) return;
    setUpdating(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/clusters/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ status: newStatus, note }),
      });
      if (res.ok) {
        // Refresh cluster and history
        const combined = await fetch(`/api/clusters/${id}`).then(r => r.ok ? r.json() : null);
        if (combined) {
          setCluster(combined.cluster ?? combined);
          setStatusHistory(combined.status_history ?? []);
        }
        setNote('');
        setNewStatus('');
      }
    } finally { setUpdating(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
    </div>
  );

  if (!cluster) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary)' }}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <p style={{ marginTop: 12 }}>Issue not found.</p>
      <Link to="/issues" className="btn btn-outline" style={{ marginTop: 16, display: 'inline-flex' }}>← All Issues</Link>
    </div>
  );

  const issueNum = `CIV-${id?.slice(-5).toUpperCase()}`;
  const stepIndex = STATUS_STEPS.indexOf(cluster.status);
  const contact = DEPT_CONTACT[cluster.department_name] ?? { division: 'Municipal Services Division', dept: 'General Affairs', hotline: '3-1-1' };
  const pLabel = priorityLabel(cluster.priority);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
      {/* Back */}
      <Link to="/issues" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20, textDecoration: 'none' }}>
        ← Back to All Issues
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>ISSUE #{issueNum}</span>
              <span className={`badge badge-${cluster.status === 'assigned' ? 'in_progress' : cluster.status}`}>
                {cluster.status === 'open' ? 'Open' : cluster.status === 'assigned' || cluster.status === 'in_progress' ? 'In Progress' : 'Resolved'}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
              {CATEGORY_LABELS[cluster.category] ?? cluster.category}
            </h1>

            {/* Progress */}
            <div className="progress-steps" style={{ marginBottom: 20 }}>
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className="step-item">
                  <div className={`step-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'active' : ''}`} />
                  {i < STATUS_STEPS.length - 1 && <div className={`step-line ${i < stepIndex ? 'done' : ''}`} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {STATUS_LABELS.map(l => <span key={l}>{l}</span>)}
            </div>

            {/* Photo */}
            {reports[0]?.photo_url && (
              <img src={reports[0].photo_url} alt="Issue photo"
                style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8, marginBottom: 20, border: '1px solid var(--border)' }} />
            )}

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Description</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {reports[0]?.description ?? 'No description provided.'}
                </p>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Address</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {reports[0]?.address_text ?? `${cluster.centroid_lat?.toFixed(5)}, ${cluster.centroid_lng?.toFixed(5)}`}
                </p>
              </div>
            </div>

            {/* Reporter count */}
            {cluster.report_count > 1 && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                {cluster.report_count} people reported this issue
              </div>
            )}

            {/* Staff update */}
            {isStaff && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Update Status</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <select className="form-select" style={{ maxWidth: 200 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    <option value="">Choose status...</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <textarea className="form-textarea" placeholder="Add a note (optional)"
                    style={{ minHeight: 60, flex: 1 }} value={note} onChange={e => setNote(e.target.value)} />
                  <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={updating || !newStatus}>
                    {updating ? <span className="spinner" /> : 'Update'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status History */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Status History</h2>
            {statusHistory.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
                <div style={{ marginBottom: 8 }}>📋 Initial Report Submitted</div>
                <div style={{ fontSize: 13 }}>Citizen report received via CivicLink.</div>
              </div>
            ) : (
              <div className="timeline">
                {statusHistory.map((h: any, i: number) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-time">
                      {new Date(h.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>
                      <div className="timeline-title">
                        Status changed to {h.new_status?.replace('_', ' ')}
                      </div>
                      {h.note && <div className="timeline-desc">{h.note}</div>}
                    </div>
                  </div>
                ))}
                <div className="timeline-item">
                  <div className="timeline-time">{new Date(cluster.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  <div>
                    <div className="timeline-title">Initial Report Submitted</div>
                    <div className="timeline-desc">Citizen report received via CivicLink.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Mini Map */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div ref={miniMapRef} style={{ height: 160, width: '100%' }} />
            <div style={{ padding: '10px 14px' }}>
              <a href={`https://www.openstreetmap.org/?mlat=${cluster.centroid_lat}&mlon=${cluster.centroid_lng}&zoom=16`}
                target="_blank" rel="noreferrer"
                style={{ color: 'var(--primary)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Open in Maps
              </a>
            </div>
          </div>

          {/* Municipal Contact */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
              <svg width="16" height="16" fill="none" stroke="var(--primary)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Municipal Contact
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              This issue is being handled by the <strong style={{ color: 'var(--text)' }}>{contact.division}</strong>. For urgent safety concerns, please call the 24/7 hotline.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 8, borderTop: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Hotline</span>
              <span style={{ fontWeight: 600 }}>{contact.hotline}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Department</span>
              <span style={{ fontWeight: 600 }}>{contact.dept}</span>
            </div>
          </div>

          {/* Priority */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" fill="none" stroke="var(--text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{pLabel} Priority</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Score: {cluster.priority}/100</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
