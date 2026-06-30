import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  total_reports: number;
  total_clusters: number;
  open_clusters: number;
  resolved_this_month: number;
  avg_resolution_hours: number | null;
  by_category: Record<string, number> | null;
  by_department: Array<{ department: string; total: number; resolved: number }> | null;
  monthly_reports: Array<{ name: string; value: number }> | null;
}

const CAT_LABELS: Record<string, string> = {
  streetlight: 'Street Lights', garbage: 'Sanitation', water_leak: 'Water Leak',
  pothole: 'Potholes', road_damage: 'Road Damage', noise_pollution: 'Noise',
  illegal_dumping: 'Illegal Dumping', other: 'Other',
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/public')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const resolutionRate = stats && stats.total_clusters > 0
    ? ((stats.resolved_this_month / stats.total_clusters) * 100).toFixed(1)
    : '0.0';

  const avgDays = stats?.avg_resolution_hours
    ? (stats.avg_resolution_hours / 24).toFixed(1)
    : null;

  const catData = stats?.by_category
    ? Object.entries(stats.by_category).map(([k, v]) => ({ name: CAT_LABELS[k] ?? k, value: v })).sort((a, b) => b.value - a.value)
    : [];

  const monthlyData = stats?.monthly_reports ?? [];
  const deptData = stats?.by_department ?? [];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 40px' }}>

      <div id="overview">
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Municipal Performance Report</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32, maxWidth: 600 }}>
          This report outlines the responsiveness and resolution efficacy of city services based on community-reported issues.
        </p>

        {/* KPI Cards */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            KEY PERFORMANCE INDICATORS
          </div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total Issues Reported</div>
              <div className="kpi-value">{(stats?.total_reports ?? 0).toLocaleString()}</div>
              <div className="kpi-sub">All time</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Resolution Rate</div>
              <div className="kpi-value blue">{resolutionRate}%</div>
              <div className="kpi-sub">This month</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Avg. Response Time</div>
              <div className="kpi-value blue">{avgDays ? `${avgDays} Days` : '—'}</div>
              <div className="kpi-sub">{avgDays ? 'Since first report' : 'No resolved issues yet'}</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Monthly Reports */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Monthly Reports</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Volume of issues submitted per month</div>
            {monthlyData.length === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyData} margin={{ bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {monthlyData.map((_, i) => <Cell key={i} fill={i === monthlyData.length - 2 ? '#2563eb' : '#93c5fd'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Open vs Resolved */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Issue Status Overview</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Open vs. Resolved clusters</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
              {[
                { label: 'Open Issues', value: stats?.open_clusters ?? 0, color: '#ef4444' },
                { label: 'Resolved This Month', value: stats?.resolved_this_month ?? 0, color: '#10b981' },
                { label: 'Total Clusters', value: stats?.total_clusters ?? 0, color: '#2563eb' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', background: color, borderRadius: 4,
                      width: stats?.total_clusters ? `${Math.min(100, (value / stats.total_clusters) * 100)}%` : '0%',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Department Performance */}
        <div className="card">
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Department Performance</span>
          </div>
          {deptData.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>No department data available yet.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>DEPARTMENT</th>
                  <th>ACTIVE</th>
                  <th>RESOLVED</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {deptData.map((d: any, i: number) => {
                  const rate = d.total > 0 ? (d.resolved / d.total) * 100 : 0;
                  const status = rate > 80 ? 'OPTIMAL' : rate > 50 ? 'STABLE' : 'LAGGING';
                  const badgeColor = status === 'OPTIMAL' ? '#d1fae5' : status === 'STABLE' ? '#dbeafe' : '#fee2e2';
                  const textColor = status === 'OPTIMAL' ? '#065f46' : status === 'STABLE' ? '#1e40af' : '#b91c1c';
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{d.department ?? 'Unassigned'}</td>
                      <td>{(d.total - d.resolved).toLocaleString()}</td>
                      <td>{d.resolved.toLocaleString()}</td>
                      <td>{d.total.toLocaleString()}</td>
                      <td>
                        <span style={{ background: badgeColor, color: textColor, padding: '2px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div style={{ padding: '12px 16px', background: 'var(--bg)', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            * Data is updated in real time. "Resolved" indicates the issue has been addressed by municipal crews.
          </div>
        </div>
      </div>
    </div>
  );
}
