import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { STATUS_COLORS, STATUS_LABELS, CATEGORY_ICONS, CATEGORY_LABELS } from '../types';
import type { Cluster } from '../types';
import { ClockIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { departmentId, role } = useAuthStore();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchClusters();
    if (departmentId) fetchDeptStats();
  }, [departmentId]);

  const fetchClusters = async () => {
    const params = new URLSearchParams({ limit: '50' });
    if (filter !== 'all') params.set('status', filter);

    const res = await fetch(`/api/clusters?${params}`);
    if (res.ok) {
      const data = await res.json();
      setClusters(data);
    }
    setLoading(false);
  };

  const fetchDeptStats = async () => {
    if (!departmentId) return;
    const res = await fetch(`/api/stats/department/${departmentId}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, [filter]);

  const sortedClusters = [...clusters].sort((a, b) => b.priority - a.priority);

  const getSlaClass = (createdAt: string) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hours > 72) return 'text-red-400';
    if (hours > 24) return 'text-orange-400';
    return 'text-green-400';
  };

  const formatAge = (createdAt: string) => {
    const hours = Math.round((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 pb-8">
        <div className="pt-2 mb-6">
          <h1 className="text-2xl font-bold text-white">Department Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage and resolve civic issues assigned to your department
          </p>
        </div>

        {/* Department KPIs */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Assigned', value: stats.total_clusters || 0, color: 'text-white' },
              { label: 'Open', value: stats.open_clusters || 0, color: 'text-orange-400' },
              { label: 'In Progress', value: stats.assigned_clusters || 0, color: 'text-brand-400' },
              { label: 'Resolved', value: stats.resolved_clusters || 0, color: 'text-green-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="card p-3">
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'assigned', label: 'In Progress' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Clusters table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/5">
                  <tr className="text-left">
                    <th className="text-xs text-slate-500 uppercase px-4 py-3">Issue</th>
                    <th className="text-xs text-slate-500 uppercase px-4 py-3">Reports</th>
                    <th className="text-xs text-slate-500 uppercase px-4 py-3">Priority</th>
                    <th className="text-xs text-slate-500 uppercase px-4 py-3">Status</th>
                    <th className="text-xs text-slate-500 uppercase px-4 py-3">Age (SLA)</th>
                    <th className="text-xs text-slate-500 uppercase px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedClusters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                        No clusters found
                      </td>
                    </tr>
                  ) : (
                    sortedClusters.map((cluster) => (
                      <tr
                        key={cluster.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => navigate(`/clusters/${cluster.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{CATEGORY_ICONS[cluster.category]}</span>
                            <div>
                              <p className="text-white text-sm font-medium">
                                {CATEGORY_LABELS[cluster.category]}
                              </p>
                              <p className="text-slate-600 text-xs font-mono">
                                {cluster.centroid_lat.toFixed(3)}, {cluster.centroid_lng.toFixed(3)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-semibold">{cluster.report_count}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              cluster.priority >= 70
                                ? 'bg-red-500/20 text-red-400'
                                : cluster.priority >= 40
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-green-500/20 text-green-400'
                            }`}
                          >
                            {cluster.priority}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${STATUS_COLORS[cluster.status]}20`,
                              color: STATUS_COLORS[cluster.status],
                            }}
                          >
                            {STATUS_LABELS[cluster.status]}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1 text-sm ${getSlaClass(cluster.created_at)}`}>
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatAge(cluster.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRightIcon className="w-4 h-4 text-slate-600" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
