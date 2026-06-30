import { CATEGORY_ICONS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../types';
import type { Cluster } from '../types';
import { XMarkIcon, ArrowTopRightOnSquareIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';

interface Props {
  cluster: Cluster;
  onClose: () => void;
  onViewDetails: () => void;
}

export default function ClusterPopup({ cluster, onClose, onViewDetails }: Props) {
  const ageHours = Math.round((Date.now() - new Date(cluster.created_at).getTime()) / (1000 * 60 * 60));
  const ageStr = ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`;

  const priorityLabel =
    cluster.priority >= 70 ? 'Critical' : cluster.priority >= 40 ? 'High' : 'Normal';
  const priorityColor =
    cluster.priority >= 70 ? 'text-red-400' : cluster.priority >= 40 ? 'text-orange-400' : 'text-green-400';

  return (
    <div className="card shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{CATEGORY_ICONS[cluster.category]}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{CATEGORY_LABELS[cluster.category]}</h3>
            <p className="text-slate-500 text-xs">
              {cluster.department_name || 'Unassigned'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <UserGroupIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-white font-bold">{cluster.report_count}</span>
            </div>
            <p className="text-slate-500 text-xs">reports</p>
          </div>
          <div className="text-center">
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-0.5"
              style={{
                backgroundColor: `${STATUS_COLORS[cluster.status]}20`,
                color: STATUS_COLORS[cluster.status],
              }}
            >
              {STATUS_LABELS[cluster.status]}
            </div>
          </div>
          <div className="text-center">
            <p className={`font-bold text-sm ${priorityColor}`}>{priorityLabel}</p>
            <p className="text-slate-500 text-xs">priority</p>
          </div>
        </div>

        {/* Photos */}
        {cluster.sample_photos && cluster.sample_photos.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {cluster.sample_photos.slice(0, 3).map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-20 h-16 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* Location & age */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
          <span className="font-mono">
            {cluster.centroid_lat.toFixed(4)}, {cluster.centroid_lng.toFixed(4)}
          </span>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-3.5 h-3.5" />
            {ageStr}
          </div>
        </div>

        <button
          onClick={onViewDetails}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          id="view-cluster-details-btn"
        >
          View Details
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
