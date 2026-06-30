import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CATEGORY_ICONS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../types';
import type { Cluster, Report, StatusUpdate } from '../types';
import { MapPinIcon, ClockIcon, UserGroupIcon, ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuthStore();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [history, setHistory] = useState<StatusUpdate[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchClusterDetail();
    fetchReports();
  }, [id]);

  const fetchClusterDetail = async () => {
    try {
      const res = await fetch(`/api/clusters/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setCluster(data.cluster);
      setHistory(data.status_history);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    const res = await fetch(`/api/reports?cluster_id=${id}&limit=10`);
    if (res.ok) {
      const data = await res.json();
      setReports(data);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !cluster) return;
    setUpdatingStatus(true);

    try {
      const res = await fetch(`/api/clusters/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus, note: statusNote || undefined }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      await fetchClusterDetail();
      setStatusNote('');
      setSelectedStatus('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const priorityClass =
    cluster?.priority && cluster.priority >= 70
      ? 'text-red-400 bg-red-500/20'
      : cluster?.priority && cluster.priority >= 40
      ? 'text-orange-400 bg-orange-500/20'
      : 'text-green-400 bg-green-500/20';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!cluster) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{CATEGORY_ICONS[cluster.category]}</span>
              <h1 className="text-xl font-bold text-white">{CATEGORY_LABELS[cluster.category]}</h1>
            </div>
            <p className="text-slate-500 text-sm font-mono">{cluster.id.slice(0, 16)}...</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {/* Status */}
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: `${STATUS_COLORS[cluster.status]}20`,
                color: STATUS_COLORS[cluster.status],
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[cluster.status] }}
              />
              {STATUS_LABELS[cluster.status]}
            </div>
          </div>

          {/* Reports */}
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Reports</p>
            <div className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-brand-400" />
              <span className="text-2xl font-bold text-white">{cluster.report_count}</span>
              <span className="text-slate-500 text-sm">people reported</span>
            </div>
          </div>

          {/* Priority */}
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Priority Score</p>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-bold ${priorityClass}`}>
              {cluster.priority >= 70 ? '🔴' : cluster.priority >= 40 ? '🟡' : '🟢'}
              {cluster.priority}/100
            </div>
          </div>
        </div>

        {/* Location & Department */}
        <div className="card p-4 mb-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Location</p>
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-mono">
                    {cluster.centroid_lat.toFixed(5)}, {cluster.centroid_lng.toFixed(5)}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${cluster.centroid_lat},${cluster.centroid_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 text-xs hover:underline"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Department</p>
              <div className="flex items-start gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <p className="text-white text-sm">
                  {cluster.department_name || <span className="text-slate-500">Unassigned</span>}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Opened</p>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <p className="text-white text-sm">
                  {new Date(cluster.created_at).toLocaleDateString()} —{' '}
                  {Math.round(
                    (Date.now() - new Date(cluster.created_at).getTime()) / (1000 * 60 * 60 * 24)
                  )}{' '}
                  days ago
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sample photos */}
        {cluster.sample_photos && cluster.sample_photos.length > 0 && (
          <div className="card p-4 mb-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Photos</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cluster.sample_photos.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Report photo ${i + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Status update (staff/admin only) */}
        {(role === 'department_staff' || role === 'admin') && cluster.status !== 'resolved' && (
          <div className="card p-4 mb-4 border-brand-600/30">
            <p className="text-sm font-semibold text-brand-400 mb-3">Update Status</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">New Status</label>
                <select
                  className="input-field"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="">Select status...</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Add a public note..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </div>
            <button
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || updatingStatus}
              className="btn-primary w-full sm:w-auto"
              id="update-status-btn"
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        )}

        {/* Status history */}
        {history.length > 0 && (
          <div className="card p-4 mb-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-3">Status History</p>
            <div className="space-y-3">
              {history.map((update) => (
                <div key={update.id} className="flex items-start gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: STATUS_COLORS[update.new_status] || '#6b7280' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">
                        {STATUS_LABELS[update.new_status] || update.new_status}
                      </span>
                      <span className="text-slate-600">←</span>
                      <span className="text-slate-500 text-sm">
                        {STATUS_LABELS[update.old_status || ''] || update.old_status}
                      </span>
                    </div>
                    {update.note && (
                      <p className="text-slate-400 text-sm mt-0.5">{update.note}</p>
                    )}
                    <p className="text-slate-600 text-xs mt-0.5">
                      {new Date(update.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent reports */}
        {reports.length > 0 && (
          <div className="card p-4">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-3">
              Member Reports ({cluster.report_count})
            </p>
            <div className="space-y-2">
              {reports.map((report) => (
                <div key={report.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                  {report.photo_url && (
                    <img
                      src={report.photo_url}
                      alt="Report"
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{report.description || 'No description'}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{report.address_text}</p>
                    <p className="text-slate-600 text-xs">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
