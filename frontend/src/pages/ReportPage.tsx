import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types';
import type { IssueCategory } from '../types';
import {
  MapPinIcon, CameraIcon, CheckCircleIcon,
  ExclamationCircleIcon, ArrowLeftIcon
} from '@heroicons/react/24/outline';

const CATEGORIES: IssueCategory[] = [
  'streetlight', 'garbage', 'water_leak', 'pothole',
  'road_damage', 'noise_pollution', 'illegal_dumping', 'other',
];

type Step = 'location' | 'details' | 'photo' | 'submit';

export default function ReportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState<Step>('location');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; clusterId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualAddress, setManualAddress] = useState('');

  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationLoading(false);
      },
      (err) => {
        setError('Could not detect location. Please try again or enter manually.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleSubmit = async () => {
    if (!category || !lat || !lng) {
      setError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      if (description) formData.append('description', description);
      if (photo) formData.append('photo', photo);

      const headers: Record<string, string> = {};
      const session = user ? (await import('../lib/supabase')).supabase.auth.getSession() : null;
      // Note: auth token would be retrieved from the store in production

      const response = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
        headers,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      setSuccess({ id: data.id, clusterId: data.cluster_id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Report Submitted!</h2>
          <p className="text-slate-400 text-sm mb-1">
            Your issue has been logged and{' '}
            {success.clusterId ? 'grouped with nearby reports.' : 'is being processed.'}
          </p>
          {success.clusterId && (
            <p className="text-slate-500 text-xs mb-6">
              Cluster ID: <span className="font-mono text-brand-400">{success.clusterId.slice(0, 8)}...</span>
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => navigate('/')} className="btn-primary flex-1">
              View on Map
            </button>
            {success.clusterId && (
              <button
                onClick={() => navigate(`/clusters/${success.clusterId}`)}
                className="btn-secondary flex-1"
              >
                Track Issue
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Report an Issue</h1>
            <p className="text-slate-500 text-sm">Help improve your neighborhood</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex gap-2 mb-6">
          {(['location', 'details', 'photo', 'submit'] as Step[]).map((s, i) => (
            <div key={s} className="flex-1 flex flex-col gap-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  step === s
                    ? 'bg-brand-500'
                    : ['location', 'details', 'photo', 'submit'].indexOf(step) > i
                    ? 'bg-brand-700'
                    : 'bg-white/10'
                }`}
              />
              <span className="text-xs text-slate-500 capitalize">{s}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Step: Location */}
        {step === 'location' && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-brand-400" />
              Where is the issue?
            </h2>

            {lat && lng ? (
              <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-green-400 font-medium text-sm">✓ Location detected</p>
                <p className="text-slate-400 text-xs mt-1 font-mono">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              </div>
            ) : (
              <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-slate-400 text-sm">No location set yet</p>
              </div>
            )}

            <button
              onClick={detectLocation}
              disabled={locationLoading}
              className="btn-primary w-full mb-3 flex items-center justify-center gap-2"
              id="detect-location-btn"
            >
              <MapPinIcon className="w-4 h-4" />
              {locationLoading ? 'Detecting...' : lat ? 'Re-detect Location' : 'Detect My Location'}
            </button>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="label">Latitude</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="12.9716"
                  value={lat ?? ''}
                  onChange={(e) => setLat(parseFloat(e.target.value) || null)}
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="77.5946"
                  value={lng ?? ''}
                  onChange={(e) => setLng(parseFloat(e.target.value) || null)}
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!lat || !lng) { setError('Please set a location first.'); return; }
                setError(null);
                setStep('details');
              }}
              className="btn-primary w-full"
              disabled={!lat || !lng}
            >
              Next: Describe the Issue →
            </button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white mb-4">What's the issue?</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${
                    category === cat
                      ? 'border-brand-500 bg-brand-600/20 text-white'
                      : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-xs font-medium text-center leading-tight">{CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>

            <div className="mb-5">
              <label className="label">Description <span className="text-slate-500">(optional)</span></label>
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="Describe the issue in detail — the more specific the better..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{description.length}/1000</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('location')} className="btn-secondary flex-1">
                ← Back
              </button>
              <button
                onClick={() => {
                  if (!category) { setError('Please select a category.'); return; }
                  setError(null);
                  setStep('photo');
                }}
                className="btn-primary flex-1"
                disabled={!category}
              >
                Next: Add Photo →
              </button>
            </div>
          </div>
        )}

        {/* Step: Photo */}
        {step === 'photo' && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CameraIcon className="w-5 h-5 text-brand-400" />
              Add a photo <span className="text-slate-500 text-base font-normal">(optional)</span>
            </h2>

            {photoPreview ? (
              <div className="mb-4 relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl"
                />
                <button
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-500/50 hover:bg-brand-600/5 transition-all mb-4 cursor-pointer"
              >
                <CameraIcon className="w-10 h-10 text-slate-600" />
                <p className="text-slate-500 text-sm">Click to upload photo</p>
                <p className="text-slate-600 text-xs">JPEG, PNG, WebP — max 10MB</p>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <div className="flex gap-3">
              <button onClick={() => setStep('details')} className="btn-secondary flex-1">
                ← Back
              </button>
              <button onClick={() => setStep('submit')} className="btn-primary flex-1">
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step: Submit */}
        {step === 'submit' && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white mb-4">Review & Submit</h2>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-slate-400 text-sm">Location</span>
                <span className="text-white text-sm font-mono">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-slate-400 text-sm">Category</span>
                <span className="text-white text-sm flex items-center gap-1.5">
                  {category && CATEGORY_ICONS[category]} {category && CATEGORY_LABELS[category]}
                </span>
              </div>
              {description && (
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-slate-400 text-sm mb-1">Description</p>
                  <p className="text-white text-sm">{description}</p>
                </div>
              )}
              {photoPreview && (
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-slate-400 text-sm mb-2">Photo</p>
                  <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('photo')} className="btn-secondary flex-1">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                id="submit-report-btn"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
