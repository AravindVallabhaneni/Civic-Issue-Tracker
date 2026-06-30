import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import type { PublicStats } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';

const RADIAN = Math.PI / 180;

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number; innerRadius: number;
  outerRadius: number; percent: number;
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return percent > 0.05 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
}

export default function StatsPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/public')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const mockStats: PublicStats = stats || {
    total_reports: 1247,
    total_clusters: 384,
    resolved_this_month: 89,
    open_clusters: 201,
    avg_resolution_hours: 48.5,
    by_category: {
      streetlight: 210, garbage: 380, water_leak: 95, pothole: 287,
      road_damage: 142, noise_pollution: 63, illegal_dumping: 45, other: 25,
    },
    by_department: [
      { department: 'Roads & Infrastructure', total: 429, resolved: 120 },
      { department: 'Sanitation Department', total: 425, resolved: 180 },
      { department: 'Electrical Department', total: 210, resolved: 95 },
      { department: 'Water & Sewage', total: 95, resolved: 40 },
      { department: 'Environment & Noise', total: 63, resolved: 25 },
    ],
  };

  const categoryData = Object.entries(mockStats.by_category).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] || cat,
    value: count,
    color: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] || '#6b7280',
  }));

  const deptData = mockStats.by_department.map((d) => ({
    name: d.department.replace(' Department', '').replace(' & ', '/'),
    total: d.total,
    resolved: d.resolved,
    open: d.total - d.resolved,
  }));

  const resolutionRate = mockStats.total_clusters > 0
    ? ((mockStats.resolved_this_month / mockStats.total_clusters) * 100).toFixed(1)
    : '0';

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 pb-8">
        <div className="pt-2 mb-6">
          <h1 className="text-2xl font-bold text-white">Public Transparency Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time civic issue statistics for your city</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Reports', value: mockStats.total_reports.toLocaleString(), color: 'text-brand-400', icon: '📋' },
            { label: 'Active Clusters', value: mockStats.open_clusters.toLocaleString(), color: 'text-orange-400', icon: '🔵' },
            { label: 'Resolved This Month', value: mockStats.resolved_this_month.toLocaleString(), color: 'text-green-400', icon: '✅' },
            { label: 'Avg Resolution', value: mockStats.avg_resolution_hours ? `${mockStats.avg_resolution_hours}h` : 'N/A', color: 'text-purple-400', icon: '⏱️' },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{kpi.icon}</span>
                <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
              </div>
              <p className="text-slate-500 text-xs">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Resolution rate bar */}
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-white">Overall Resolution Rate</p>
            <span className="text-brand-400 font-bold">{resolutionRate}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${resolutionRate}%` }}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Category pie chart */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Issues by Category</h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={CustomLabel}
                  outerRadius={100}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Department bar chart */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-white mb-4">By Department</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{ background: '#1a2234', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[0, 4, 4, 0]} />
                <Bar dataKey="open" name="Open" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department table */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Department Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-xs text-slate-500 uppercase pb-3 pr-4">Department</th>
                  <th className="text-xs text-slate-500 uppercase pb-3 pr-4">Total</th>
                  <th className="text-xs text-slate-500 uppercase pb-3 pr-4">Resolved</th>
                  <th className="text-xs text-slate-500 uppercase pb-3">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {mockStats.by_department.map((dept, i) => {
                  const rate = ((dept.resolved / dept.total) * 100).toFixed(0);
                  return (
                    <tr key={i} className="group">
                      <td className="py-2.5 pr-4 text-white text-sm">{dept.department}</td>
                      <td className="py-2.5 pr-4 text-slate-400 text-sm">{dept.total}</td>
                      <td className="py-2.5 pr-4 text-green-400 text-sm">{dept.resolved}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-20">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-xs">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
