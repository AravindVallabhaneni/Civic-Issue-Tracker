import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const CATEGORY_LABELS: Record<string, string> = {
  streetlight: 'Street Light', garbage: 'Sanitation', water_leak: 'Water Leak',
  pothole: 'Pothole', road_damage: 'Road Damage', noise_pollution: 'Noise Pollution',
  illegal_dumping: 'Illegal Dumping', other: 'Other',
};


interface Report {
  id: string;
  reporter_id: string;
  category: string;
  description: string | null;
  photo_url: string | null;
  address_text: string | null;
  status: string;
  cluster_id: string | null;
  created_at: string;
}

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function IssuesPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // Fetch this user's reports with auth token
    const loadReports = async () => {
      try {
        const { supabase } = await import('../lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

        const res = await fetch(`/api/reports?reporter_id=${user.id}&limit=100`, { headers });
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [user]);


  // Not logged in
  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: '80px auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your Issue Reports</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          Sign in to see the issues you have reported and track their status.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link to="/auth?redirect=/issues" className="btn btn-primary">Sign In</Link>
          <Link to="/" className="btn btn-outline">View Public Map</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>My Reported Issues</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
            {reports.length} issue{reports.length !== 1 ? 's' : ''} reported by you
          </p>
        </div>
        <Link to="/report" className="btn btn-primary">⊕ Report New Issue</Link>
      </div>


      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
        </div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>You haven't reported any issues yet.</p>
          <Link to="/report" className="btn btn-primary" style={{ display: 'inline-flex' }}>
            Report Your First Issue
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.map(r => (
            <div key={r.id} className="card" style={{ padding: 20, display: 'grid', gridTemplateColumns: r.photo_url ? '72px 1fr auto' : '1fr auto', gap: 16, alignItems: 'center' }}>
              {r.photo_url && (
                <img src={r.photo_url} alt="Issue" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{CATEGORY_LABELS[r.category] ?? r.category}</span>
                </div>
                {r.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  {r.address_text && <span>📍 {r.address_text}</span>}
                  <span>🕐 {timeAgo(r.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                {r.cluster_id ? (
                  <Link to={`/issues/${r.cluster_id}`} className="btn btn-outline btn-sm">Track Issue</Link>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Processing…</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
