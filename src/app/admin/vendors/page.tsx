"use client";
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { getVendors, addVendor, updateVendor, deleteVendor, getServiceRequests, assignVendor } from '@/services/vendorService';
import { Vendor, ServiceType, ServiceRequest, Household } from '@/types/user';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import StatusGuard from '@/components/auth/StatusGuard';
import ErrorState from '@/components/ui/ErrorState';
import { PLATFORM_VENDORS_ESTATE_ID } from '@/constants/vendors';

const ALL_SERVICE_TYPES: ServiceType[] = ['plumber','electrician','gardener','carpenter','painter','security','cleaner','it_support','other'];
const SERVICE_LABEL: Record<ServiceType,string> = { plumber:'Plumber', electrician:'Electrician', gardener:'Gardener', carpenter:'Carpenter', painter:'Painter', security:'Security', cleaner:'Cleaner', it_support:'IT Support', other:'Other' };
const STATUS_LABEL: Record<string,string> = { pending:'Pending', assigned:'Assigned', in_progress:'In Progress', completed:'Completed', cancelled:'Cancelled' };

type SidebarTab = 'requests' | 'vendors' | 'analytics' | 'estates' | 'community' | 'settings';

const LICENSE_LABEL: Record<string,string> = { verified:'Verified', pending:'Pending', expired:'Expired', none:'None' };

const EMPTY_FORM = { name:'', phone:'', serviceTypes:[] as ServiceType[], notes:'', isAvailable:true, businessName:'', email:'', bankName:'', bankAccount:'', licenseStatus:'none' as 'verified'|'pending'|'expired'|'none', coverageAreas:'', rating:'' };

// COG Contact spreadsheet data for bulk import
const COG_VENDORS = [
  { name: 'Raphael Etim', occupation: 'Civil Works', designation: 'Painter/Screeding', company: 'NIL', contact: '08024175196 / 09052075189' },
  { name: 'Seyi', occupation: 'Mechanical', designation: 'Generator Specialist', company: 'Mantrac', contact: '08160686300' },
  { name: 'Mr Sodiq', occupation: 'Civil Works', designation: 'Scaffolding', company: 'SDQ Edge', contact: '07089265738' },
  { name: 'Sesan', occupation: 'Civil', designation: 'Wood Work Specialist', company: 'S.T.K', contact: '08023901138' },
  { name: 'Segun', occupation: 'Contracting', designation: 'General Services', company: 'Shygo', contact: '08023613499' },
  { name: 'Sodiq Ishola', occupation: 'Electrician', designation: 'Snr Facility Manager', company: 'Rocmod Engineering', contact: '08131365772' },
  { name: 'Segun', occupation: 'Supplier', designation: 'Diesel Supplier', company: 'Minat Diesel', contact: '07067126505' },
  { name: 'Mr Sukanmi', occupation: 'Civil Works', designation: 'Floor and Buffering Professional', company: 'NIL', contact: '08086288464' },
  { name: 'Mr sunny', occupation: 'Pool Management', designation: 'Tiles Flooring and Gen Cleaning', company: 'NIL', contact: '08123840040' },
  { name: 'Elfad Concept', occupation: 'Waste Management', designation: 'Biodigester', company: 'NIL', contact: '08037217936' },
  { name: 'Wasim', occupation: 'Interior Fittings', designation: 'Blinds', company: 'Problind', contact: '09070040399' },
  { name: 'Bolaji', occupation: 'Construction', designation: 'Quantity Surveyor', company: 'NIL', contact: '08134644339' },
  { name: 'Buknor', occupation: 'DSTV', designation: 'DSTV', company: 'NIL', contact: '08025148183' },
  { name: 'Nil', occupation: 'Construction', designation: 'M & E', company: 'NIL', contact: '08056506178' },
  { name: 'Ebube', occupation: 'Dealership', designation: 'Vehicle Dealer', company: 'GO Autos', contact: '07016493154' },
  { name: 'Gift', occupation: 'Electrical Engineering', designation: 'UPS/FM200/Fire System', company: 'Electrified Engineering', contact: '08082999567' },
  { name: 'Sunday Henry', occupation: 'Fabrications', designation: 'Glass Production', company: 'NIL', contact: '08128242773' },
  { name: 'Anthony', occupation: 'Mechanical', designation: 'Gym Equipments', company: 'Everfitness', contact: '08132763579' },
  { name: 'Ayotunde', occupation: 'Janitorial', designation: 'House Cleaning', company: 'Heywhy Cleaning Service', contact: '08023937844' },
  { name: 'Nil', occupation: 'Electrician', designation: 'Kitchen Extractor', company: 'Kitchen and Accessories', contact: '08033089443' },
];

async function getHousehold(householdId: string): Promise<Household | null> {
  try {
    const db = await getFirebaseDatabase();
    const snap = await get(ref(db, `households/${householdId}`));
    return snap.exists() ? snap.val() as Household : null;
  } catch { return null; }
}

export default function AdminVendorsPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>('requests');
  // Vendors
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Request detail
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest|null>(null);
  const [householdInfo, setHouseholdInfo] = useState<Household|null>(null);
  const [loadingHousehold, setLoadingHousehold] = useState(false);
  const [assigningVendorId, setAssigningVendorId] = useState<string|null>(null);
  // Vendor directory filter
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<ServiceType|'all'>('all');
  const [requestFilter, setRequestFilter] = useState<'all'|'pending'|'assigned'|'in_progress'|'completed'>('all');
  const [photoIdx, setPhotoIdx] = useState(0);

  // Super admins ('admin' role) manage the platform-wide vendor directory
  // rather than a single estate, so when they have no personal estateId we
  // route CRUD/seed operations through the shared `__platform__` bucket.
  const estateId = currentUser?.estateId
    || (currentUser?.role === 'admin' ? PLATFORM_VENDORS_ESTATE_ID : '');
  const isPlatformBucket = estateId === PLATFORM_VENDORS_ESTATE_ID;

  const load = useCallback(async () => {
    if (!estateId) return;
    setLoading(true);
    try {
      // Service requests are scoped to real estates only — the platform bucket
      // exists purely for the vendor directory.
      const [v, r] = await Promise.all([
        getVendors(estateId),
        isPlatformBucket ? Promise.resolve([] as ServiceRequest[]) : getServiceRequests(estateId),
      ]);
      setVendors(v);
      setRequests(r);
    } finally { setLoading(false); }
  }, [estateId, isPlatformBucket]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selectedRequest?.householdId) {
      setLoadingHousehold(true);
      getHousehold(selectedRequest.householdId).then(h => { setHouseholdInfo(h); setLoadingHousehold(false); });
    } else { setHouseholdInfo(null); }
    setPhotoIdx(0);
  }, [selectedRequest]);

  // Vendor form
  function toggleService(type: ServiceType) {
    setForm(f => ({ ...f, serviceTypes: f.serviceTypes.includes(type) ? f.serviceTypes.filter(s=>s!==type) : [...f.serviceTypes, type] }));
  }

  function startEdit(v: Vendor) {
    setEditingId(v.id);
    setForm({ name: v.name, phone: v.phone, serviceTypes: v.serviceTypes, notes: v.notes||'', isAvailable: v.isAvailable, businessName: v.businessName||'', email: v.email||'', bankName: v.bankName||'', bankAccount: v.bankAccount||'', licenseStatus: v.licenseStatus||'none', coverageAreas: (v.coverageAreas||[]).join(', '), rating: v.rating?.toString()||'' });
    setShowAddVendor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || form.serviceTypes.length === 0) {
      setError('Name, phone and at least one service type are required.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name, phone: form.phone, serviceTypes: form.serviceTypes, notes: form.notes, isAvailable: form.isAvailable,
        businessName: form.businessName, email: form.email, bankName: form.bankName, bankAccount: form.bankAccount,
        licenseStatus: form.licenseStatus as 'verified'|'pending'|'expired'|'none',
        coverageAreas: form.coverageAreas.split(',').map(s => s.trim()).filter(Boolean),
        rating: form.rating ? parseFloat(form.rating) : undefined,
      };
      if (editingId) {
        await updateVendor(estateId, editingId, payload);
      } else {
        await addVendor(estateId, { ...payload, estateId, addedBy: currentUser!.uid, addedAt: Date.now() });
      }
      await load();
      setShowAddVendor(false); setEditingId(null); setForm(EMPTY_FORM);
    } catch { setError('Failed to save vendor.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this vendor?')) return;
    await deleteVendor(estateId, id);
    await load();
  }

  async function handleAssignVendor(vendor: Vendor) {
    if (!selectedRequest || !currentUser) return;
    setAssigningVendorId(vendor.id);
    try {
      // Always assign against the request's own estate — the vendor may come
      // from the platform directory but the service request lives in the
      // resident's estate.
      await assignVendor(selectedRequest.estateId, selectedRequest.id, vendor, currentUser.uid);
      await load();
      setSelectedRequest(null);
    } finally { setAssigningVendorId(null); }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const filteredRequests = requestFilter === 'all' ? requests : requests.filter(r => r.status === requestFilter);
  const initiatedRequests = filteredRequests.filter(r => r.status === 'pending');
  const assignedFilteredRequests = filteredRequests.filter(r => r.status !== 'pending');

  const filteredVendors = vendors.filter(v => {
    const matchSearch = !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || (v.businessName||'').toLowerCase().includes(vendorSearch.toLowerCase());
    const matchType = vendorFilter === 'all' || v.serviceTypes.includes(vendorFilter);
    return matchSearch && matchType;
  });

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min${mins>1?'s':''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs>1?'s':''} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days>1?'s':''} ago`;
  }

  // Sidebar items
  const sidebarItems: { key: SidebarTab; label: string; icon: JSX.Element; href?: string }[] = [
    { key: 'requests', label: 'Requests', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> },
    { key: 'vendors', label: 'Vendors', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg> },
    { key: 'analytics', label: 'Analytics', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
    { key: 'estates', label: 'Estates', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>, href: '/admin/estates' },
    { key: 'community', label: 'Community', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg> },
    { key: 'settings', label: 'Settings', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, href: '/admin/settings' },
  ];

  const availableVendorsForRequest = selectedRequest ? vendors.filter(v => v.isAvailable && v.serviceTypes.includes(selectedRequest.serviceType)) : [];

  const [importing, setImporting] = useState(false);

  async function handleBulkImport() {
    console.log('[BulkImport] Starting. estateId=', estateId, 'user=', currentUser?.uid);
    if (!estateId) { toast.error('No estate ID found. Make sure you are logged in as admin.'); return; }
    if (!currentUser) { toast.error('Not logged in.'); return; }
    setImporting(true);
    const toastId = toast.loading('Importing vendors...');
    try {
      const res = await fetchWithAuth('/api/vendors/seed', {
        method: 'POST',
        body: JSON.stringify({ estateId, vendors: COG_VENDORS }),
      });
      console.log('[BulkImport] Response status:', res.status);
      const data = await res.json();
      console.log('[BulkImport] Response:', data);
      if (data.success) {
        toast.success(`Imported ${data.count} vendors!`, { id: toastId });
        await load();
      } else {
        toast.error(`Import failed: ${data.message || 'Unknown error'}`, { id: toastId });
      }
    } catch (err: any) {
      console.error('[BulkImport] Error:', err);
      toast.error(`Import error: ${err?.message || 'Network error'}`, { id: toastId });
    }
    finally { setImporting(false); }
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col md:flex-row safe-area-inset-top">
      {/* ─── Left Sidebar (hidden on mobile) ─── */}
      <aside className="hidden md:flex w-[180px] bg-[#e8e6df] border-r border-[#d5d3cc] flex-col flex-shrink-0 sticky top-0 h-screen">
        <div className="px-4 pt-5 pb-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4a7c59] flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2d2d2d] leading-tight">Musa Estate</p>
              <p className="text-[9px] text-[#7a7a6e]">Management</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-2.5 space-y-0.5">
          {sidebarItems.map(item => {
            const isActive = activeTab === item.key;
            const cls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${isActive ? 'bg-[#4a7c59] text-white shadow-sm' : 'text-[#5a5a50] hover:bg-[#dddbd4] hover:text-[#2d2d2d]'}`;
            if (item.href) return <Link key={item.key} href={item.href} className={cls}>{item.icon}{item.label}</Link>;
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)} className={cls}>
                {item.icon}{item.label}
                {item.key === 'requests' && pendingRequests.length > 0 && (
                  <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25 text-white' : 'bg-[#4a7c59]/10 text-[#4a7c59]'}`}>{pendingRequests.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[#d5d3cc]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#4a7c59] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#2d2d2d] truncate">{currentUser?.displayName || 'Admin'}</p>
              <p className="text-[9px] text-[#7a7a6e]">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header
          className="h-12 bg-white border-b border-[#e5e5e0] px-5 flex items-center justify-between flex-shrink-0 sticky z-20"
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
        >
          <h1 className="text-[15px] font-bold text-[#2d2d2d]">Vendors &amp; Requests</h1>
          <div className="flex items-center gap-2.5">
            <button onClick={load} className="p-1.5 rounded-lg text-[#7a7a6e] hover:bg-[#f0f0eb] transition-colors" title="Refresh">
              <svg className={`w-4 h-4 ${loading?'animate-spin':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
            <button className="p-1.5 rounded-lg text-[#7a7a6e] hover:bg-[#f0f0eb] transition-colors relative">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {pendingRequests.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500"/>}
            </button>
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#e5e5e0]">
              <div className="w-7 h-7 rounded-full bg-[#4a7c59] flex items-center justify-center text-white text-[10px] font-bold">
                {currentUser?.displayName?.charAt(0).toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-medium text-[#2d2d2d]">{currentUser?.displayName?.split(' ')[0] || 'Admin'}</span>
              <svg className="w-3 h-3 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* ─── Requests Feed ─── */}
          <div className="flex-1 min-w-0 border-r border-[#e5e5e0] overflow-y-auto relative">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#2d2d2d]">Requests Feed</h2>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setRequestFilter('all')} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${requestFilter==='all' ? 'bg-[#4a7c59] text-white' : 'bg-[#f0f0eb] text-[#5a5a50] hover:bg-[#e5e5e0]'}`}>All</button>
                  <select value={requestFilter === 'all' ? '' : requestFilter} onChange={e => setRequestFilter((e.target.value || 'all') as typeof requestFilter)}
                    className="text-[11px] h-7 px-2 rounded-lg border border-[#d5d3cc] bg-white text-[#5a5a50] focus:outline-none focus:border-[#4a7c59]">
                    <option value="">Filter</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-32 rounded-xl bg-[#e8e6df] animate-pulse" />)}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Initiated from Musa */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-[#7a7a6e] mb-2.5">Initiated from Musa</h3>
                    <div className="space-y-2.5">
                      {initiatedRequests.length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-[#d5d3cc]"><p className="text-[11px] text-[#999]">No pending requests</p></div>
                      ) : initiatedRequests.map(r => (
                        <button key={r.id} onClick={() => setSelectedRequest(r)} className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md ${
                          selectedRequest?.id === r.id ? 'border-[#4a7c59] bg-[#4a7c59]/5 shadow-md' : 'border-[#e5e5e0] bg-white hover:border-[#c5c5c0]'
                        }`}>
                          <p className="text-[13px] font-semibold text-[#2d2d2d] capitalize leading-tight">{r.serviceType.replace('_',' ')} Repair</p>
                          <p className="text-[11px] text-[#5a5a50] line-clamp-1 mt-0.5">{r.description || 'No description'}</p>
                          <p className="text-[10px] text-[#999] mt-1">{r.residentName}</p>
                          <p className="text-[10px] text-[#bbb] mt-0.5">Received: {timeAgo(r.createdAt)}</p>
                          {r.imageUrls && r.imageUrls.length > 0 && (
                            <div className="flex gap-1.5 mt-2">
                              {r.imageUrls.slice(0, 2).map((url, idx) => (
                                <div key={idx} className="relative">
                                  <div className="w-16 h-12 rounded-lg overflow-hidden border border-[#e5e5e0]"><img src={url} alt="" className="w-full h-full object-cover" /></div>
                                  <span className={`absolute -bottom-1 left-0 right-0 text-center text-[8px] font-medium px-1 py-0.5 rounded ${idx===0 ? 'bg-[#4a7c59]/90 text-white' : 'bg-[#c44b3f]/90 text-white'}`}>{idx===0?'Original photo':'Tapped Photo'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assigned */}
                  <div>
                    <h3 className="text-[11px] font-semibold text-[#7a7a6e] mb-2.5">Assigned</h3>
                    <div className="space-y-2.5">
                      {assignedFilteredRequests.length === 0 ? (
                        <div className="text-center py-8 rounded-xl border border-dashed border-[#d5d3cc]"><p className="text-[11px] text-[#999]">No assigned requests</p></div>
                      ) : assignedFilteredRequests.map(r => (
                        <button key={r.id} onClick={() => setSelectedRequest(r)} className={`w-full text-left p-3 rounded-xl border transition-all hover:shadow-md ${
                          selectedRequest?.id === r.id ? 'border-[#4a7c59] bg-[#4a7c59]/5 shadow-md' : 'border-[#e5e5e0] bg-white hover:border-[#c5c5c0]'
                        }`}>
                          <div className="flex items-start justify-between gap-1.5">
                            <p className="text-[13px] font-semibold text-[#2d2d2d] capitalize leading-tight">{r.serviceType.replace('_',' ')} Repair</p>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                              r.status==='assigned'?'bg-blue-100 text-blue-700':r.status==='in_progress'?'bg-indigo-100 text-indigo-700':r.status==='completed'?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-600'
                            }`}>{STATUS_LABEL[r.status]}</span>
                          </div>
                          <p className="text-[11px] text-[#5a5a50] line-clamp-1 mt-0.5">{r.description || 'No description'}</p>
                          <p className="text-[10px] text-[#999] mt-1">{r.residentName}{r.vendorName && <span className="text-[#4a7c59] font-medium"> &rarr; {r.vendorName}</span>}</p>
                          <p className="text-[10px] text-[#bbb] mt-0.5">Received: {timeAgo(r.createdAt)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Request Detail Overlay (floats over feed) ─── */}
            {selectedRequest && (
              <div className="absolute inset-0 z-10 bg-[#f5f5f0]/80 backdrop-blur-sm flex items-start justify-center pt-6 pb-6 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl border border-[#e5e5e0] w-full max-w-[380px] mx-4 max-h-[calc(100%-48px)] overflow-y-auto">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-[#f8f8f5] border border-[#e5e5e0] flex-1 mr-2">
                        <p className="text-[11px] font-semibold text-[#4a7c59] mb-0.5">Full Household Info</p>
                        {loadingHousehold ? <div className="h-6 rounded bg-[#e8e6df] animate-pulse" /> : householdInfo ? (
                          <p className="text-[12px] font-medium text-[#2d2d2d]">{householdInfo.name}{householdInfo.address ? ` — ${householdInfo.address}` : ''}</p>
                        ) : <p className="text-[11px] text-[#999]">No household linked</p>}
                      </div>
                      <button onClick={() => setSelectedRequest(null)} className="w-6 h-6 rounded-lg bg-[#f0f0eb] hover:bg-[#e5e5e0] flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[#7a7a6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>

                    <div className="mb-3 p-2.5 rounded-xl bg-[#f8f8f5] border border-[#e5e5e0]">
                      <p className="text-[11px] font-semibold text-[#4a7c59]">Contact {selectedRequest.residentName}</p>
                    </div>

                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-[#2d2d2d] mb-1">Full Issue Description</p>
                      <p className="text-[12px] text-[#5a5a50] leading-relaxed">{selectedRequest.description || 'No description provided.'}</p>
                      {selectedRequest.imageUrls && selectedRequest.imageUrls.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] text-[#999] mb-1.5">Photo attached.</p>
                          <div className="relative rounded-xl overflow-hidden border border-[#e5e5e0] aspect-video">
                            <img src={selectedRequest.imageUrls[photoIdx]} alt="Issue" className="w-full h-full object-cover" />
                            {selectedRequest.imageUrls.length > 1 && (
                              <>
                                <button onClick={() => setPhotoIdx(i => i > 0 ? i-1 : selectedRequest.imageUrls!.length-1)} className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                                </button>
                                <button onClick={() => setPhotoIdx(i => i < selectedRequest.imageUrls!.length-1 ? i+1 : 0)} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-[#2d2d2d] mb-2">Available vendors</p>
                      <div className="space-y-1.5">
                        {availableVendorsForRequest.length === 0 ? (
                          <p className="text-[11px] text-[#999] py-3 text-center">No vendors available for {SERVICE_LABEL[selectedRequest.serviceType]}</p>
                        ) : availableVendorsForRequest.map(v => (
                          <div key={v.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[#e5e5e0] hover:border-[#4a7c59] transition-all group">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-[#4a7c59]/10 flex items-center justify-center text-[#4a7c59] text-[10px] font-bold">{v.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <p className="text-[12px] font-medium text-[#2d2d2d]">{SERVICE_LABEL[selectedRequest.serviceType]}</p>
                                <p className="text-[10px] text-[#999]">{v.businessName || v.name}</p>
                              </div>
                            </div>
                            {selectedRequest.vendorId === v.id ? (
                              <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#4a7c59]/10 text-[#4a7c59]">Assigned</span>
                            ) : (
                              <button onClick={() => handleAssignVendor(v)} disabled={assigningVendorId === v.id}
                                className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[#4a7c59] text-white hover:bg-[#3d6a4b] disabled:opacity-50 transition-colors opacity-0 group-hover:opacity-100">
                                {assigningVendorId === v.id ? '...' : 'Assign'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Vendor Directory (always visible) ─── */}
          <div className="w-full lg:w-[400px] flex-shrink-0 overflow-y-auto bg-white border-t lg:border-t-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[13px] font-bold text-[#2d2d2d]">Vendor Directory</h2>
                <div className="flex items-center gap-1.5">
                  <button onClick={handleBulkImport} disabled={importing}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                    {importing ? 'Importing...' : 'Import COG Vendors'}
                  </button>
                  <button onClick={() => { setShowAddVendor(true); setEditingId(null); setForm(EMPTY_FORM); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#4a7c59] text-white text-[11px] font-semibold hover:bg-[#3d6a4b] transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                    Add vendor
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 mb-3">
                <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value as ServiceType | 'all')}
                  className="h-7 px-2 rounded-lg border border-[#d5d3cc] text-[11px] text-[#5a5a50] bg-white focus:outline-none focus:border-[#4a7c59]">
                  <option value="all">Filter</option>
                  {ALL_SERVICE_TYPES.map(t => <option key={t} value={t}>{SERVICE_LABEL[t]}</option>)}
                </select>
                <div className="relative flex-1">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#999]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} placeholder="Search"
                    className="w-full h-7 pl-7 pr-2.5 rounded-lg border border-[#d5d3cc] text-[11px] text-[#2d2d2d] bg-white focus:outline-none focus:border-[#4a7c59] placeholder:text-[#999]" />
                </div>
              </div>

              <div className="border border-[#e5e5e0] rounded-xl overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-[#f8f8f5]">
                      <th className="text-left text-[9px] font-semibold text-[#7a7a6e] uppercase tracking-wider px-2.5 py-2"></th>
                      <th className="text-left text-[9px] font-semibold text-[#7a7a6e] uppercase tracking-wider px-2 py-2">Service Type</th>
                      <th className="text-left text-[9px] font-semibold text-[#7a7a6e] uppercase tracking-wider px-2 py-2">License Status</th>
                      <th className="text-left text-[9px] font-semibold text-[#7a7a6e] uppercase tracking-wider px-2 py-2">Estate Coverage</th>
                      <th className="text-left text-[9px] font-semibold text-[#7a7a6e] uppercase tracking-wider px-2 py-2">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0eb]">
                    {filteredVendors.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-[11px] text-[#999]">No vendors found</td></tr>
                    ) : filteredVendors.map(v => (
                      <tr key={v.id} className="hover:bg-[#fafaf8] transition-colors cursor-pointer group" onClick={() => startEdit(v)}>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-[#4a7c59]/10 flex items-center justify-center text-[#4a7c59] text-[10px] font-bold flex-shrink-0">{v.name.charAt(0).toUpperCase()}</div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-[#2d2d2d] truncate">{v.name}</p>
                              <p className="text-[9px] text-[#999] truncate">{v.phone}{v.businessName ? ` · ${v.businessName}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium whitespace-nowrap">{SERVICE_LABEL[v.serviceTypes[0]]}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium whitespace-nowrap ${
                            v.licenseStatus === 'verified' ? 'text-emerald-600' : v.licenseStatus === 'pending' ? 'text-amber-600' : v.licenseStatus === 'expired' ? 'text-red-500' : 'text-[#999]'
                          }`}>
                            {v.licenseStatus === 'verified' && <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            {LICENSE_LABEL[v.licenseStatus || 'none']}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          <p className="text-[10px] text-[#5a5a50] whitespace-nowrap truncate max-w-[90px]">{(v.coverageAreas||[]).join(', ') || '—'}</p>
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-0.5">
                            {v.rating ? (
                              <>
                                <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                <span className="text-[10px] font-medium text-[#2d2d2d]">{v.rating.toFixed(1)}</span>
                              </>
                            ) : <span className="text-[10px] text-[#ccc]">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Add/Edit Vendor Modal ─── */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowAddVendor(false); setEditingId(null); setError(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#e5e5e0] flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2d2d2d]">{editingId ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button onClick={() => { setShowAddVendor(false); setEditingId(null); setError(''); }}
                className="w-8 h-8 rounded-lg bg-[#f0f0eb] hover:bg-[#e5e5e0] flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-[#7a7a6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Phone <span className="text-red-500">*</span></label>
                  <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} required
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="08012345678" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Business Name</label>
                  <input value={form.businessName} onChange={e=>setForm(f=>({...f,businessName:e.target.value}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="e.g. Joe Plumbing Ltd" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="vendor@email.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Bank Name</label>
                  <input value={form.bankName} onChange={e=>setForm(f=>({...f,bankName:e.target.value}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="e.g. GTBank" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Bank Account Number</label>
                  <input value={form.bankAccount} onChange={e=>setForm(f=>({...f,bankAccount:e.target.value.replace(/\D/g,'')}))} maxLength={10}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="0123456789" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5a5a50] mb-2">Service Types <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SERVICE_TYPES.map(type => (
                    <button type="button" key={type} onClick={() => toggleService(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        form.serviceTypes.includes(type)
                          ? 'bg-[#4a7c59] text-white shadow-sm'
                          : 'bg-[#f0f0eb] text-[#5a5a50] hover:bg-[#e5e5e0] border border-[#d5d3cc]'
                      }`}>
                      {SERVICE_LABEL[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">License Status</label>
                  <select value={form.licenseStatus} onChange={e=>setForm(f=>({...f,licenseStatus:e.target.value as typeof form.licenseStatus}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59]">
                    <option value="none">None</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Coverage Areas</label>
                  <input value={form.coverageAreas} onChange={e=>setForm(f=>({...f,coverageAreas:e.target.value}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="e.g. Banana Island, Ikoyi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Rating</label>
                  <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}
                    className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="4.8" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5a5a50] mb-1.5">Notes <span className="text-[#bbb] font-normal">(optional)</span></label>
                <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  className="w-full h-10 px-3 rounded-xl border border-[#d5d3cc] text-sm text-[#2d2d2d] focus:outline-none focus:border-[#4a7c59] focus:ring-1 focus:ring-[#4a7c59]/20 placeholder:text-[#bbb]" placeholder="Any additional info..." />
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setForm(f => ({ ...f, isAvailable: !f.isAvailable }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${form.isAvailable ? 'bg-[#4a7c59]' : 'bg-gray-300'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${form.isAvailable ? 'translate-x-5' : ''}`}/>
                </button>
                <span className="text-sm text-[#5a5a50]">Available for assignments</span>
              </div>
              {error && <ErrorState compact title={error} description={null} />}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-[#4a7c59] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[#3d6a4b] transition-colors shadow-sm">
                  {saving ? 'Saving...' : editingId ? 'Update Vendor' : 'Save Vendor'}
                </button>
                {editingId && (
                  <button type="button" onClick={() => { handleDelete(editingId); setShowAddVendor(false); setEditingId(null); }}
                    className="px-4 h-10 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium hover:bg-red-100 transition-colors">Remove</button>
                )}
                <button type="button" onClick={() => { setShowAddVendor(false); setEditingId(null); setError(''); }}
                  className="px-5 h-10 rounded-xl border border-[#d5d3cc] text-sm text-[#5a5a50] hover:bg-[#f0f0eb] transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </StatusGuard>
  );
}
