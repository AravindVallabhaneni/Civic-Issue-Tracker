import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Tab = 'overview' | 'clusters' | 'reports' | 'departments' | 'users';

const CATEGORY_LABELS: Record<string, string> = {
  streetlight: 'Street Light', garbage: 'Sanitation', water_leak: 'Water Leak',
  pothole: 'Pothole', road_damage: 'Road Damage', noise_pollution: 'Noise',
  illegal_dumping: 'Illegal Dumping', other: 'Other',
};

function timeAgo(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function adminFetch(path: string, opts?: RequestInit) {
  const { supabase } = await import('../lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      ...opts?.headers,
    },
  });
}

/* ─── Overview Tab ─── */
function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    adminFetch('/api/admin/overview').then(r => r.ok ? r.json() : null).then(setStats);
  }, []);

  if (!stats) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;

  const cards = [
    { label: 'Total Reports', value: stats.total_reports, sub: `+${stats.reports_today} today`, color: '#2563eb' },
    { label: 'Open Clusters', value: stats.open_clusters, sub: `${stats.assigned_clusters} assigned`, color: '#ef4444' },
    { label: 'Resolved Clusters', value: stats.resolved_clusters, sub: 'All time', color: '#10b981' },
    { label: 'High Priority', value: stats.high_priority, sub: 'Needs attention', color: '#f97316' },
    { label: 'Total Users', value: stats.total_users, sub: `${stats.staff_users} staff · ${stats.admin_users} admin`, color: '#8b5cf6' },
    { label: 'Reports This Week', value: stats.reports_this_week, sub: 'Last 7 days', color: '#0891b2' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Admin Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.value?.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/issues" className="btn btn-outline btn-sm">View All Issues</Link>
          <Link to="/" className="btn btn-outline btn-sm">Open Map</Link>
          <Link to="/stats" className="btn btn-outline btn-sm">Statistics</Link>
          <Link to="/report" className="btn btn-primary btn-sm">Report an Issue</Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Clusters Tab ─── */
function ClustersTab() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/clusters?limit=200').then(r => r.ok ? r.json() : [])
      .then(d => { setClusters(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const doUpdate = async (id: string) => {
    if (!newStatus) return;
    setUpdating(id);
    await adminFetch(`/api/clusters/${id}/status`, {
      method: 'PATCH', body: JSON.stringify({ status: newStatus, note: statusNote }),
    });
    setUpdating(null); setEditing(null); setNewStatus(''); setStatusNote('');
    load();
  };

  const filtered = clusters.filter(c =>
    filter === 'all' || c.status === filter || (filter === 'in_progress' && c.status === 'assigned')
  ).sort((a, b) => b.priority - a.priority);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Issue Clusters ({filtered.length})</h2>
        <select className="form-select" style={{ width: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>CATEGORY</th><th>LOCATION</th><th>REPORTS</th>
                <th>STATUS</th><th>PRIORITY</th><th>AGE</th><th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <>
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{CATEGORY_LABELS[c.category] ?? c.category}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.centroid_lat?.toFixed(4)}, {c.centroid_lng?.toFixed(4)}</td>
                    <td style={{ fontWeight: 600 }}>{c.report_count}</td>
                    <td>
                      <span className={`badge badge-${c.status === 'assigned' ? 'in_progress' : c.status}`}>
                        {c.status === 'open' ? 'Open' : c.status === 'assigned' || c.status === 'in_progress' ? 'In Progress' : 'Resolved'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.priority >= 70 ? '#b91c1c' : c.priority >= 40 ? '#1d4ed8' : c.priority >= 20 ? '#374151' : '#9ca3af' }}>
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeAgo(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/issues/${c.id}`)}>View</button>
                        <button className="btn btn-primary btn-sm"
                          onClick={() => { setEditing(editing === c.id ? null : c.id); setNewStatus(''); setStatusNote(''); }}>
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editing === c.id && (
                    <tr key={`${c.id}-edit`} style={{ background: '#f8fafc' }}>
                      <td colSpan={7} style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select className="form-select" style={{ width: 180 }} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                            <option value="">Select new status…</option>
                            <option value="acknowledged">Acknowledged</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <input className="form-input" style={{ flex: 1, minWidth: 200 }} placeholder="Add a note (optional)"
                            value={statusNote} onChange={e => setStatusNote(e.target.value)} />
                          <button className="btn btn-primary btn-sm" onClick={() => doUpdate(c.id)} disabled={!newStatus || updating === c.id}>
                            {updating === c.id ? <span className="spinner" /> : 'Save'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Reports Tab ─── */
function ReportsTab() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports?limit=100').then(r => r.ok ? r.json() : [])
      .then(d => { setReports(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>All Reports ({reports.length})</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>
        ) : reports.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No reports yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>CATEGORY</th><th>STATUS</th><th>LOCATION</th><th>ADDRESS</th><th>PHOTO</th><th>SUBMITTED</th></tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{CATEGORY_LABELS[r.category] ?? r.category}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address_text ?? '—'}</td>
                  <td>
                    {r.photo_url
                      ? <a href={r.photo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>View Photo</a>
                      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No photo</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Departments Tab ─── */
function DepartmentsTab() {
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', contact_email: '', category_keys: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    adminFetch('/api/admin/departments').then(r => r.ok ? r.json() : [])
      .then(d => { setDepts(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    setSaving(true); setError('');
    const res = await adminFetch('/api/admin/departments', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        contact_email: form.contact_email || undefined,
        category_keys: form.category_keys.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) { setAdding(false); setForm({ name: '', contact_email: '', category_keys: '' }); load(); }
    else { const d = await res.json(); setError(d.error || 'Failed to create'); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Departments</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(!adding)}>+ Add Department</button>
      </div>

      {adding && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>New Department</div>
          {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="form-label">Contact Email</label>
              <input className="form-input" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
            <div style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Category Keys (comma separated)</label>
              <input className="form-input" placeholder="e.g. pothole, road_damage" value={form.category_keys} onChange={e => setForm(f => ({ ...f, category_keys: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={saving || !form.name}>
              {saving ? <span className="spinner" /> : 'Create Department'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>NAME</th><th>CATEGORIES</th><th>EMAIL</th><th>ACTIVE</th><th>RESOLVED</th></tr></thead>
            <tbody>
              {depts.map((d: any) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td style={{ fontSize: 12 }}>{(d.category_keys ?? []).join(', ') || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.contact_email ?? '—'}</td>
                  <td style={{ fontWeight: 600, color: '#ef4444' }}>{d.open ?? 0}</td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>{d.resolved ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { profile: myProfile } = useAuthStore();

  const load = () => {
    Promise.all([
      adminFetch('/api/admin/users').then(r => r.ok ? r.json() : []),
      adminFetch('/api/admin/departments').then(r => r.ok ? r.json() : []),
    ]).then(([u, d]) => { setUsers(Array.isArray(u) ? u : []); setDepts(Array.isArray(d) ? d : []); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, changes: any) => {
    setSaving(id);
    await adminFetch(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
    setSaving(null); load();
  };

  const roleBadge = (role: string) => {
    const map: Record<string, [string, string]> = {
      admin: ['#fde68a', '#92400e'],
      department_staff: ['#dbeafe', '#1e40af'],
      citizen: ['#f3f4f6', '#6b7280'],
    };
    const [bg, color] = map[role] ?? ['#f3f4f6', '#6b7280'];
    return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{role.replace('_', ' ').toUpperCase()}</span>;
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Users ({users.length})</h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div> : (
          <table className="table">
            <thead><tr><th>USER</th><th>ROLE</th><th>DEPARTMENT</th><th>JOINED</th><th>CHANGE ROLE</th></tr></thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.full_name || '(no name)'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</div>
                  </td>
                  <td>{roleBadge(u.role)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.department_name ?? '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{timeAgo(u.created_at)}</td>
                  <td>
                    {u.id === myProfile?.id ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(you)</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="form-select" style={{ width: 160, fontSize: 12, padding: '4px 8px' }}
                          defaultValue={u.role}
                          onChange={e => update(u.id, {
                            role: e.target.value,
                            department_id: e.target.value === 'citizen' ? null : u.department_id,
                          })}>
                          <option value="citizen">Citizen</option>
                          <option value="department_staff">Department Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        {(u.role === 'department_staff') && (
                          <select className="form-select" style={{ width: 160, fontSize: 12, padding: '4px 8px' }}
                            defaultValue={u.department_id ?? ''}
                            onChange={e => update(u.id, { department_id: e.target.value || null })}>
                            <option value="">No dept</option>
                            {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        )}
                        {saving === u.id && <span className="spinner" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Main Admin Page ─── */
export default function AdminPage() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!user || (profile && profile.role !== 'admin')) navigate('/', { replace: true });
  }, [user, profile, navigate]);

  if (!user || !profile) return null;
  if (profile.role !== 'admin') return null;

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'clusters', label: 'Issue Clusters', icon: '📍' },
    { id: 'reports', label: 'All Reports', icon: '📋' },
    { id: 'departments', label: 'Departments', icon: '🏛️' },
    { id: 'users', label: 'Users', icon: '👥' },
  ];

  return (
    <div className="sidebar-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: '0 16px 4px' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Admin Panel</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>CivicLink Administration</div>
        </div>
        <div className="divider" style={{ margin: '12px 0' }} />

        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`sidebar-link${tab === t.id ? ' active' : ''}`}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}

        <div className="divider" />
        <div style={{ padding: '0 16px' }}>
          <Link to="/" className="btn btn-outline btn-sm w-full" style={{ justifyContent: 'center' }}>← Public Site</Link>
        </div>
      </div>

      {/* Content */}
      <div className="sidebar-content">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'clusters' && <ClustersTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'departments' && <DepartmentsTab />}
        {tab === 'users' && <UsersTab />}
      </div>
    </div>
  );
}
