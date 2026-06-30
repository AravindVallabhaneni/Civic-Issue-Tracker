import { useMapStore } from '../store/mapStore';
import { CATEGORY_LABELS } from '../types';
import type { IssueCategory, ClusterStatus } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';

const CATEGORY_OPTIONS: { value: IssueCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'streetlight', label: '💡 Streetlight' },
  { value: 'garbage', label: '🗑️ Garbage' },
  { value: 'water_leak', label: '💧 Water Leak' },
  { value: 'pothole', label: '🕳️ Pothole' },
  { value: 'road_damage', label: '🚧 Road Damage' },
  { value: 'noise_pollution', label: '🔊 Noise' },
  { value: 'illegal_dumping', label: '♻️ Illegal Dumping' },
  { value: 'other', label: '⚠️ Other' },
];

const STATUS_OPTIONS: { value: ClusterStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'resolved', label: 'Resolved' },
];

interface Props {
  onClose: () => void;
}

export default function MapFiltersPanel({ onClose }: Props) {
  const { filters, setFilters } = useMapStore();

  return (
    <div className="card p-4 w-72 shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-sm">Filter Issues</h3>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-500 hover:text-white transition-all"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">Category</label>
          <select
            className="input-field"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: (e.target.value as IssueCategory) || undefined })}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Status</label>
          <select
            className="input-field"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: (e.target.value as ClusterStatus) || undefined })}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setFilters({})}
          className="btn-secondary w-full text-sm"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
