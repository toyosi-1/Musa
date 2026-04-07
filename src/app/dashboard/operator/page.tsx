"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceRequests, getVendors, assignVendor, updateRequestStatus } from '@/services/vendorService';
import { ServiceRequest, Vendor, ServiceRequestStatus } from '@/types/user';

const STATUS_COLOR: Record<string,string> = {
  pending:'text-amber-400 bg-amber-500/15 border-amber-500/30',
  assigned:'text-blue-400 bg-blue-500/15 border-blue-500/30',
  in_progress:'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
  completed:'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  cancelled:'text-gray-400 bg-gray-500/15 border-gray-500/30',
};
const STATUS_LABEL: Record<string,string> = { pending:'Pending', assigned:'Assigned', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' };

export default function OperatorDashboard() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceRequestStatus|'all'>('all');
  const [assigning, setAssigning] = useState<string|null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Record<string,string>>({});
  const [actionLoading, setActionLoading] = useState<string|null>(null);

  const load = useCallback(async () => {
    if (!currentUser?.estateId) return;
    setLoading(true);
    const [reqs, vens] = await Promise.all([
      getServiceRequests(currentUser.estateId),
      getVendors(currentUser.estateId),
    ]);
    setRequests(reqs);
    setVendors(vens);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  async function handleAssign(requestId: string) {
    const vendorId = selectedVendor[requestId];
    if (!vendorId || !currentUser?.estateId) return;
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return;
    setActionLoading(requestId);
    try {
      await assignVendor(currentUser.estateId, requestId, vendor, currentUser.uid);
      await load();
      setAssigning(null);
    } finally { setActionLoading(null); }
  }

  async function handleCancel(requestId: string) {
    if (!currentUser?.estateId) return;
    setActionLoading(requestId);
    try { await updateRequestStatus(currentUser.estateId, requestId, 'cancelled'); await load(); }
    finally { setActionLoading(null); }
  }

  const tabs: (ServiceRequestStatus|'all')[] = ['all','pending','assigned','in_progress','completed'];
  const counts: Record<string, number> = { all: requests.length, pending: requests.filter(r=>r.status==='pending').length, assigned: requests.filter(r=>r.status==='assigned').length, in_progress: requests.filter(r=>r.status==='in_progress').length, completed: requests.filter(r=>r.status==='completed').length, cancelled: requests.filter(r=>r.status==='cancelled').length };

  return (
    <div className="min-h-screen bg-[#080d1a] text-white" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#080d1a]/90 backdrop-blur-xl border-b border-white/[0.06] px-5 py-3.5">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-bold">Operator Dashboard</h1>
            <p className="text-gray-500 text-xs">Assign vendors to service requests</p>
          </div>
          <button onClick={load} className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] flex items-center justify-center transition-colors" title="Refresh">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-5 py-6">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[{label:'Pending',val:counts.pending,color:'text-amber-400 bg-amber-500/10 border-amber-500/20'},{label:'In Progress',val:counts.in_progress,color:'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'},{label:'Completed',val:counts.completed,color:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}].map(s => (
          <div key={s.label} className={`rounded-2xl border px-3 py-2.5 text-center ${s.color}`}>
            <div className="text-xl font-bold">{s.val}</div>
            <div className="text-xs opacity-70 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              filter===tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.09] border border-white/[0.08]'
            }`}>
            {tab === 'all' ? 'All' : STATUS_LABEL[tab]}
            {counts[tab] > 0 && <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter===tab ? 'bg-white/20' : 'bg-white/10'}`}>{counts[tab]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-white/[0.08]">
          <div className="text-3xl mb-3">📭</div>
          <p className="text-gray-500 text-sm">No {filter === 'all' ? '' : STATUS_LABEL[filter].toLowerCase()+' '}requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] overflow-hidden transition-colors">
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white capitalize text-sm">{r.serviceType.replace('_',' ')}</p>
                    <p className="text-gray-500 text-xs mt-0.5">by {r.residentName} · {new Date(r.createdAt).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                {r.description && <p className="text-gray-400 text-sm leading-relaxed">{r.description}</p>}
                {r.imageUrls && r.imageUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {r.imageUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/[0.08] hover:border-white/[0.20] transition-colors">
                        <img src={url} alt={`Issue photo ${i+1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {r.vendorName && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    </div>
                    <span className="text-gray-300">{r.vendorName}</span>
                    {r.vendorPhone && <span className="text-gray-500">· {r.vendorPhone}</span>}
                  </div>
                )}
              </div>
              {/* Actions */}
              {(r.status === 'pending' || r.status === 'assigned') && (
                <div className="px-4 pb-4">
                  {assigning === r.id ? (
                    <div className="flex gap-2">
                      <select value={selectedVendor[r.id]||''} onChange={e => setSelectedVendor(p => ({...p,[r.id]:e.target.value}))}
                        className="flex-1 h-10 px-3 rounded-xl bg-white/[0.08] border border-white/[0.15] text-white text-sm focus:outline-none focus:border-blue-500/50">
                        <option value="">Select vendor...</option>
                        {vendors.filter(v => v.isAvailable && v.serviceTypes.includes(r.serviceType)).map(v => (
                          <option key={v.id} value={v.id}>{v.name} · {v.phone}</option>
                        ))}
                      </select>
                      <button onClick={() => handleAssign(r.id)} disabled={!selectedVendor[r.id] || actionLoading === r.id}
                        className="px-4 h-10 rounded-xl bg-blue-600 text-sm font-semibold disabled:opacity-50 hover:bg-blue-500 transition-colors">
                        {actionLoading === r.id ? '...' : 'Assign'}
                      </button>
                      <button onClick={() => setAssigning(null)} className="px-3 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm hover:bg-white/[0.10] transition-colors">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setAssigning(r.id)}
                        className="flex-1 h-9 rounded-xl bg-blue-600/80 text-xs font-semibold hover:bg-blue-600 transition-colors">
                        {r.vendorId ? 'Reassign Vendor' : 'Assign Vendor'}
                      </button>
                      <button onClick={() => handleCancel(r.id)} disabled={actionLoading === r.id}
                        className="px-4 h-9 rounded-xl bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
