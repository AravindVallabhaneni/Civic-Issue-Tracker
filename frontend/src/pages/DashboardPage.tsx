import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const CATEGORY_LABELS: Record<string, string> = {
  streetlight: 'Infrastructure', garbage: 'Sanitation', water_leak: 'Utilities',
  pothole: 'Infrastructure', road_damage: 'Infrastructure', noise_pollution: 'Public Safety',
  illegal_dumping: 'Sanitation', other: 'General',
};

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ${Math.floor(mins % 60)}s`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function priorityBadge(p: number) {
  if (p >= 70) return { label: 'CRITICAL', bg: '#fca5a5', color: '#7f1d1d' };
  if (p >= 40) return { label: 'HIGH', bg: '#93c5fd', color: '#1e3a8a' };
  if (p >= 20) return { label: 'MEDIUM', bg: '#d1d5db', color: '#374151' };
  return { label: 'LOW', bg: '#e5e7eb', color: '#6b7280' };
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '') + '/api/clusters?limit=100')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setClusters(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = clusters.filter(c => {
    const matchCat = catFilter === 'all' || CATEGORY_LABELS[c.category] === catFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && (c.status === 'open' || c.status === 'assigned')) ||
      (statusFilter === 'resolved' && c.status === 'resolved');
    return matchCat && matchStatus;
  }).sort((a, b) => b.priority - a.priority);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const pending = clusters.filter(c => c.status === 'open').length;
  const resolved24h = clusters.filter(c => {
    if (c.status !== 'resolved') return false;
    return Date.now() - new Date(c.updated_at).getTime() < 86400000;
  }).length;

  return (
    <div className="sidebar-layout">
      {/* Sidebar */}
      <div className="sidebar" style={{ width: 220 }}>
        <div style={{ padding: '0 16px 4px' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Issue Tracker</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>City Services Portal</div>
        </div>
        <div className="divider" style={{ margin: '12px 0' }} />
        <Link to="/dashboard" className="sidebar-link active">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          All Issues
        </Link>
        <Link to="/" className="sidebar-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
          Map View
        </Link>
        <Link to="/stats" className="sidebar-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          Statistics
        </Link>

        <div className="divider" />
        <div className="sidebar-section-label">QUICK SUMMARY</div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Pending', value: pending, color: 'var(--text)' },
            { label: 'Due Today', value: Math.min(pending, 8), color: '#ef4444' },
            { label: 'Resolved 24h', value: resolved24h, color: 'var(--primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontWeight: 700, color }}>{String(value).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="sidebar-content">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Assigned Issue Clusters</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
            Managing operational maintenance and public safety reports.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Category</label>
            <select className="form-select" style={{ width: 160 }} value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="all">All Categories</option>
              {['Infrastructure', 'Sanitation', 'Utilities', 'Public Safety', 'General'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status Filter</label>
            <select className="form-select" style={{ width: 180 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="active">Active / Pending</option>
              <option value="all">All</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="spinner" style={{ width: 28, height: 28, borderColor: 'var(--border)', borderTopColor: 'var(--primary)', margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No clusters found.</div>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>LOCATION</th>
                    <th>REPORTS</th>
                    <th>STATUS</th>
                    <th>AGE</th>
                    <th>PRIORITY</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((c: any) => {
                    const badge = priorityBadge(c.priority);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{CATEGORY_LABELS[c.category] ?? 'General'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {c.centroid_lat?.toFixed(3)}, {c.centroid_lng?.toFixed(3)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{c.report_count}</td>
                        <td>
                          {c.status === 'open' ? (
                            <span style={{ color: '#ef4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                              Urgent ↓
                            </span>
                          ) : c.status === 'assigned' || c.status === 'in_progress' ? (
                            <span style={{ color: '#f97316', fontWeight: 500, fontSize: 13 }}>In Progress</span>
                          ) : (
                            <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>Resolved</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{timeAgo(c.created_at)}</td>
                        <td>
                          <span style={{ background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                            {badge.label}
                          </span>
                        </td>
                        <td>
                          <Link to={`/issues/${c.id}`} style={{ color: 'var(--primary)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                            View Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} clusters</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  <button className="btn btn-outline btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 20, borderLeft: '4px solid var(--primary)', paddingLeft: 14, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          "Priority is automatically calculated based on report frequency, hazard level, and cluster age."
        </div>
      </div>
    </div>
  );
}
