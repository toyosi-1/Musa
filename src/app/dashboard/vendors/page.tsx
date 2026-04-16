"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createServiceRequest, getServiceRequests, uploadServiceRequestImages, submitVendorReview } from '@/services/vendorService';
import { ServiceRequest, ServiceType } from '@/types/user';

// SVG icon paths for each vendor service type
const SERVICE_ICONS: Record<ServiceType, { path: string; viewBox?: string }> = {
  plumber: { path: 'M10 3v2H8C6.9 5 6 5.9 6 7v2.17c0 .53.21 1.04.59 1.41L8 12h8l1.41-1.41c.38-.38.59-.89.59-1.42V7c0-1.1-.9-2-2-2h-2V3h-4zM6 14v7h2v-4h8v4h2v-7H6z' },
  electrician: { path: 'M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z' },
  gardener: { path: 'M17.12 10a4.47 4.47 0 00-1.57-2.32A4.89 4.89 0 0012 6.5c-1.35 0-2.54.51-3.55 1.18A4.47 4.47 0 006.88 10a3.37 3.37 0 00-.38 1.57c0 1.14.5 2.16 1.28 2.87A3.94 3.94 0 0011 16h2a3.94 3.94 0 003.22-1.56 3.88 3.88 0 001.28-2.87c0-.55-.14-1.08-.38-1.57zM12 2C9.79 2 8 3.79 8 6h2c0-1.1.9-2 2-2s2 .9 2 2h2c0-2.21-1.79-4-4-4zm0 16c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2z' },
  carpenter: { path: 'M13.78 3.51L8.16 9.14l.71.71L3.51 15.2a1 1 0 000 1.41l3.89 3.89a1 1 0 001.41 0l5.35-5.35.71.71 5.63-5.63-6.72-6.72zM6.2 19.09l-1.29-1.3 4.6-4.6 1.29 1.3-4.6 4.6z' },
  painter: { path: 'M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0112 22zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8c.28 0 .5-.22.5-.5a.54.54 0 00-.14-.35c-.41-.46-.63-1.05-.63-1.65a2.5 2.5 0 012.5-2.5H16c2.21 0 4-1.79 4-4 0-3.86-3.59-7-8-7zM6.5 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3-4a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm3 4a1.5 1.5 0 110-3 1.5 1.5 0 010 3z' },
  security: { path: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' },
  cleaner: { path: 'M16 11h-1V4c0-1.66-1.34-3-3-3S9 2.34 9 4v7H8c-1.1 0-2 .9-2 2v8c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-8c0-1.1-.9-2-2-2zm-5-7c0-.55.45-1 1-1s1 .45 1 1v7h-2V4z' },
  it_support: { path: 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z' },
  other: { path: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' },
};

const SERVICE_GRADIENTS: Record<ServiceType, string> = {
  plumber: 'from-blue-500 to-blue-700',
  electrician: 'from-amber-400 to-yellow-600',
  gardener: 'from-emerald-500 to-green-700',
  carpenter: 'from-orange-500 to-amber-700',
  painter: 'from-pink-500 to-rose-700',
  security: 'from-indigo-500 to-purple-700',
  cleaner: 'from-cyan-400 to-teal-600',
  it_support: 'from-violet-500 to-purple-700',
  other: 'from-gray-400 to-gray-600',
};

const SERVICE_GLOW: Record<ServiceType, string> = {
  plumber: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
  electrician: 'hover:border-yellow-500/50 hover:shadow-yellow-500/10',
  gardener: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
  carpenter: 'hover:border-orange-500/50 hover:shadow-orange-500/10',
  painter: 'hover:border-pink-500/50 hover:shadow-pink-500/10',
  security: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
  cleaner: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
  it_support: 'hover:border-violet-500/50 hover:shadow-violet-500/10',
  other: 'hover:border-gray-400/50 hover:shadow-gray-500/10',
};

const SERVICES: { type: ServiceType; label: string }[] = [
  { type: 'plumber', label: 'Plumber' },
  { type: 'electrician', label: 'Electrician' },
  { type: 'gardener', label: 'Gardener' },
  { type: 'carpenter', label: 'Carpenter' },
  { type: 'painter', label: 'Painter' },
  { type: 'security', label: 'Security' },
  { type: 'cleaner', label: 'Cleaner' },
  { type: 'it_support', label: 'IT Support' },
  { type: 'other', label: 'Other' },
];

function ServiceIcon({ type, className = 'w-7 h-7' }: { type: ServiceType; className?: string }) {
  const icon = SERVICE_ICONS[type];
  return (
    <svg className={className} viewBox={icon.viewBox || '0 0 24 24'} fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}

const STATUS_LABEL: Record<string,string> = { pending:'Pending', assigned:'Vendor Assigned', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' };
const STATUS_COLOR: Record<string,string> = { pending:'text-amber-400 bg-amber-500/15 border-amber-500/30', assigned:'text-blue-400 bg-blue-500/15 border-blue-500/30', in_progress:'text-indigo-400 bg-indigo-500/15 border-indigo-500/30', completed:'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', cancelled:'text-gray-500 bg-gray-500/10 border-gray-500/20' };
const STATUS_ICON: Record<string,string> = { pending:'⏳', assigned:'👤', in_progress:'🔄', completed:'✅', cancelled:'✕' };

export default function VendorRequestPage() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'select'|'describe'|'done'>('select');
  const [selected, setSelected] = useState<ServiceType|null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [history, setHistory] = useState<ServiceRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [ratingRequestId, setRatingRequestId] = useState<string|null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

  useEffect(() => {
    if (!currentUser?.estateId) { setLoadingHistory(false); return; }
    getServiceRequests(currentUser.estateId)
      .then(all => setHistory(all.filter(r => r.residentId === currentUser.uid)))
      .catch(err => console.error('Error loading service request history:', err))
      .finally(() => setLoadingHistory(false));
  }, [currentUser]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const total = selectedFiles.length + files.length;
    if (total > 4) { setError('Maximum 4 photos allowed'); return; }
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);
    // Generate previews
    const newPreviews = [...filePreviews];
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newPreviews.push(ev.target?.result as string);
        setFilePreviews([...newPreviews]);
      };
      reader.readAsDataURL(f);
    });
    setError('');
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!currentUser?.estateId) {
      setError('You must be assigned to an estate before requesting a service. Please contact your administrator.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      // Create request first
      const requestId = await createServiceRequest({ estateId: currentUser.estateId, residentId: currentUser.uid, residentName: currentUser.displayName || currentUser.email || 'Resident', householdId: currentUser.householdId, serviceType: selected, description: description.trim(), status: 'pending' });
      // Upload images if any
      if (selectedFiles.length > 0) {
        setUploadProgress(`Uploading ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}...`);
        const urls = await uploadServiceRequestImages(currentUser.estateId, requestId, selectedFiles);
        // Update request with image URLs
        const { getFirebaseDatabase } = await import('@/lib/firebase');
        const { ref, update } = await import('firebase/database');
        const db = await getFirebaseDatabase();
        await update(ref(db, `serviceRequests/${currentUser.estateId}/${requestId}`), { imageUrls: urls });
      }
      const all = await getServiceRequests(currentUser.estateId);
      setHistory(all.filter(r => r.residentId === currentUser.uid));
      setSelectedFiles([]); setFilePreviews([]); setUploadProgress('');
      // Log service request to activity
      try {
        const { logActivity } = await import('@/services/activityService');
        await logActivity({
          type: 'service_request',
          description: `Requested ${SERVICES.find(s => s.type === selected)?.label || selected} service${description.trim() ? `: "${description.trim().slice(0, 60)}"` : ''}`,
          timestamp: Date.now(),
          userId: currentUser.uid,
          estateId: currentUser.estateId,
          householdId: currentUser.householdId || '',
          metadata: { serviceType: selected },
        });
      } catch (e) { console.warn('Activity log failed:', e); }
      setStep('done');
    } catch { setError('Failed to submit. Please try again.'); setUploadProgress(''); }
    finally { setSubmitting(false); }
  }

  async function handleSubmitRating(r: ServiceRequest) {
    if (!ratingStars || !currentUser?.estateId || !r.vendorId) return;
    setSubmittingRating(true); setRatingError('');
    try {
      await submitVendorReview(
        currentUser.estateId, r.id, r.vendorId,
        currentUser.uid, currentUser.displayName || 'Resident',
        ratingStars, ratingComment.trim(), r.serviceType,
      );
      const all = await getServiceRequests(currentUser.estateId);
      setHistory(all.filter(req => req.residentId === currentUser.uid));
      setRatingRequestId(null); setRatingStars(0); setRatingComment(''); setRatingHover(0);
    } catch { setRatingError('Failed to submit rating. Try again.'); }
    finally { setSubmittingRating(false); }
  }

  const serviceLabel = SERVICES.find(s => s.type === selected);

  return (
    <div className="max-w-2xl mx-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/dashboard/resident" className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors flex-shrink-0">
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Request a Service</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Book a technician for your home</p>
        </div>
        <div className="flex items-center gap-1.5">
          {(['select','describe','done'] as const).map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
              step === s ? 'w-5 bg-blue-500' : i < (['select','describe','done'] as const).indexOf(step) ? 'w-3 bg-emerald-500' : 'w-3 bg-gray-200 dark:bg-gray-700'
            }`} />
          ))}
        </div>
      </div>
      <div>

      {step === 'select' && (
        <div>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">What do you need?</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Choose a service type to get started</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SERVICES.map(s => (
              <button key={s.type} onClick={() => { setSelected(s.type); setStep('describe'); }}
                className={`group flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97] ${SERVICE_GLOW[s.type]}`}>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${SERVICE_GRADIENTS[s.type]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <ServiceIcon type={s.type} className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'describe' && (() => { const svc = SERVICES.find(s => s.type === selected); return (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Describe the issue</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">The more detail, the better</p>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
            {selected && (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${SERVICE_GRADIENTS[selected]} flex items-center justify-center shadow-md flex-shrink-0`}>
                <ServiceIcon type={selected} className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-semibold text-sm">{svc?.label}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Selected service</p>
            </div>
            <button type="button" onClick={() => setStep('select')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 transition-colors">
              Change
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description <span className="text-gray-400 dark:text-gray-600 font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="e.g. Kitchen tap is leaking badly under the sink..."
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none text-sm transition-colors" />
          </div>
          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos <span className="text-gray-400 dark:text-gray-600 font-normal">(up to 4)</span></label>
            {filePreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {filePreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 group">
                    <img src={src} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedFiles.length < 4 && (
              <label className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/25 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Add photos of the issue</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">Tap to take a photo or choose from gallery</p>
                </div>
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
              {error}
            </div>
          )}
          <button type="submit" disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 transition-all duration-200">
            {submitting ? (uploadProgress || 'Submitting...') : 'Submit Request'}
          </button>
        </form>
      ); })()}

      {step === 'done' && (
        <div className="text-center py-14 space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-emerald-100 dark:bg-emerald-500/20 animate-ping opacity-40" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center">
              <svg className="w-9 h-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">An operator will assign a vendor shortly. Track your request below.</p>
          </div>
          <button onClick={() => { setStep('select'); setSelected(null); setDescription(''); setSelectedFiles([]); setFilePreviews([]); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            New Request
          </button>
        </div>
      )}

      {/* Request History */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">My Requests</h2>
          {history.length > 0 && <span className="text-xs text-gray-500 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">{history.length} total</span>}
        </div>
        {loadingHistory ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 animate-pulse" />)}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No requests yet.</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Submitted requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map(r => {
              const svc = SERVICES.find(s => s.type === r.serviceType);
              return (
                <div key={r.id} className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {svc && <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${SERVICE_GRADIENTS[svc.type]} flex items-center justify-center shadow-md flex-shrink-0`}><ServiceIcon type={svc.type} className="w-4 h-4 text-white" /></div>}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{r.serviceType.replace('_',' ')}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[r.status]}`}>{STATUS_ICON[r.status]} {STATUS_LABEL[r.status]}</span>
                  </div>
                  {r.description && <p className="text-gray-600 dark:text-gray-400 text-xs mt-2 leading-relaxed">{r.description}</p>}
                  {r.imageUrls && r.imageUrls.length > 0 && (
                    <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                      {r.imageUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                          <img src={url} alt={`Issue photo ${i+1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {r.vendorName && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
                          <svg className="w-3 h-3 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{r.vendorName}</span>
                        {r.vendorPhone && <span className="text-gray-500">· {r.vendorPhone}</span>}
                      </div>

                      {/* Rating section for completed requests */}
                      {r.status === 'completed' && r.vendorId && (
                        r.reviewedAt ? (
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(s => (
                                <svg key={s} className={`w-4 h-4 ${s <= (r.rating||0) ? 'text-amber-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                              ))}
                            </div>
                            {r.reviewComment && <p className="text-[11px] text-gray-500 truncate">&ldquo;{r.reviewComment}&rdquo;</p>}
                          </div>
                        ) : ratingRequestId === r.id ? (
                          <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Rate {r.vendorName}</p>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} type="button"
                                  onMouseEnter={() => setRatingHover(s)} onMouseLeave={() => setRatingHover(0)}
                                  onClick={() => setRatingStars(s)}
                                  className="p-0.5 transition-transform hover:scale-125">
                                  <svg className={`w-7 h-7 transition-colors ${s <= (ratingHover || ratingStars) ? 'text-amber-400' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                </button>
                              ))}
                              {ratingStars > 0 && <span className="text-xs text-gray-400 self-center ml-1">{ratingStars}/5</span>}
                            </div>
                            <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} rows={2}
                              placeholder="Leave a comment about the work done..."
                              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 text-xs focus:outline-none focus:border-blue-500/60 resize-none" />
                            {ratingError && <p className="text-xs text-red-400">{ratingError}</p>}
                            <div className="flex gap-2">
                              <button onClick={() => handleSubmitRating(r)} disabled={!ratingStars || submittingRating}
                                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40 transition-colors">
                                {submittingRating ? 'Submitting...' : 'Submit Rating'}
                              </button>
                              <button onClick={() => { setRatingRequestId(null); setRatingStars(0); setRatingComment(''); setRatingHover(0); setRatingError(''); }}
                                className="px-4 py-2 rounded-xl text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setRatingRequestId(r.id); setRatingStars(0); setRatingComment(''); }}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                            Rate this vendor
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
