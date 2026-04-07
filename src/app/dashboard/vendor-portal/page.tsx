"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceRequestsForVendor, updateRequestStatus } from '@/services/vendorService';
import { ServiceRequest } from '@/types/user';

const STATUS_COLOR: Record<string,string> = {
  assigned:'text-blue-400 bg-blue-500/15 border-blue-500/30',
  in_progress:'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
  completed:'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  cancelled:'text-gray-400 bg-gray-500/15 border-gray-500/30',
};

export default function VendorPortalPage() {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string|null>(null);

  const load = useCallback(async () => {
    if (!currentUser?.estateId) return;
    setLoading(true);
    try {
      const all = await getServiceRequestsForVendor(currentUser.estateId, currentUser.uid);
      setJobs(all);
    } finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  async function handleStart(jobId: string) {
    if (!currentUser?.estateId) return;
    setActionLoading(jobId);
    try { await updateRequestStatus(currentUser.estateId, jobId, 'in_progress'); await load(); }
    finally { setActionLoading(null); }
  }

  async function handleComplete(jobId: string) {
    if (!currentUser?.estateId) return;
    setActionLoading(jobId);
    try { await updateRequestStatus(currentUser.estateId, jobId, 'completed', { vendorCompletedAt: Date.now(), completedAt: Date.now() }); await load(); }
    finally { setActionLoading(null); }
  }

  const active = jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const done = jobs.filter(j => j.status === 'completed' || j.status === 'cancelled');

  return (
    <div className="min-h-screen bg-[#080d1a] text-white" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="sticky top-0 z-10 bg-[#080d1a]/90 backdrop-blur-xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold">My Jobs</h1>
            <p className="text-gray-500 text-xs">Your assigned service requests</p>
          </div>
          <button onClick={load} className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-5 py-6">

      {/* Stats bar */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{label:'Active',val:active.length,color:'text-blue-400 bg-blue-500/10 border-blue-500/20'},{label:'In Progress',val:active.filter(j=>j.status==='in_progress').length,color:'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'},{label:'Completed',val:done.filter(j=>j.status==='completed').length,color:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}].map(s=>(
            <div key={s.label} className={`rounded-2xl border px-3 py-2.5 text-center ${s.color}`}>
              <div className="text-xl font-bold">{s.val}</div>
              <div className="text-xs opacity-70 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.08]">
          <div className="text-4xl mb-3">🛠️</div>
          <p className="text-gray-400 font-medium">No jobs assigned yet</p>
          <p className="text-gray-600 text-sm mt-1">Jobs will appear here once an operator assigns them to you</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Active</h2>
                <span className="text-xs text-gray-500 ml-auto">{active.length} job{active.length!==1?'s':''}</span>
              </div>
              <div className="space-y-3">
                {active.map(job => (
                  <div key={job.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden hover:border-white/[0.14] transition-colors">
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white capitalize">{job.serviceType.replace('_',' ')}</p>
                          <p className="text-gray-500 text-xs mt-0.5">👤 {job.residentName} · Assigned {new Date(job.assignedAt||job.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[job.status]||''}`}>{job.status.replace('_',' ')}</span>
                      </div>
                      {job.description && <p className="text-gray-400 text-sm leading-relaxed">{job.description}</p>}
                      {job.imageUrls && job.imageUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                          {job.imageUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/[0.08] hover:border-white/[0.20] transition-colors">
                              <img src={url} alt={`Issue photo ${i+1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-4 pb-4">
                      {job.status === 'assigned' && (
                        <button onClick={() => handleStart(job.id)} disabled={actionLoading === job.id}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-sm font-semibold disabled:opacity-50 hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
                          {actionLoading === job.id ? 'Starting...' : '▶ Start Work'}
                        </button>
                      )}
                      {job.status === 'in_progress' && (
                        <button onClick={() => handleComplete(job.id)} disabled={actionLoading === job.id}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-sm font-semibold disabled:opacity-50 hover:from-emerald-500 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                          {actionLoading === job.id ? 'Completing...' : '✓ Mark Complete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">History</h2>
                <span className="text-xs text-gray-600 ml-auto">{done.length} total</span>
              </div>
              <div className="space-y-2">
                {done.map(job => (
                  <div key={job.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-gray-300 text-sm capitalize font-medium">{job.serviceType.replace('_',' ')}</p>
                      <p className="text-gray-600 text-xs">{new Date(job.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short',year:'numeric'})}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[job.status]||'text-gray-400 bg-gray-500/10 border-gray-500/20'}`}>{job.status}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      </div>
    </div>
  );
}
