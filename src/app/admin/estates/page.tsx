"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { Estate, User } from '@/types/user';
import { listEstates, createEstate, toggleEstateLock } from '@/services/estateService';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import PageLoading from '@/components/ui/PageLoading';

export default function AdminEstatesPage() {
  const { currentUser, loading } = useAuth();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEstate, setSelectedEstate] = useState<string | null>(null);
  const [estateMembers, setEstateMembers] = useState<Record<string, User[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      setError(null);
      const items = await listEstates();
      setEstates(items);
    } catch (e) {
      console.error(e);
      setError('Failed to load estates');
    }
  };

  const loadEstateMembers = async (estateId: string) => {
    try {
      setLoadingMembers(prev => ({ ...prev, [estateId]: true }));
      const db = await getFirebaseDatabase();
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users: User[] = [];
        snapshot.forEach((child) => {
          const user = child.val() as User;
          if (user.estateId === estateId) {
            users.push(user);
          }
        });
        setEstateMembers(prev => ({ ...prev, [estateId]: users }));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load estate members');
    } finally {
      setLoadingMembers(prev => ({ ...prev, [estateId]: false }));
    }
  };

  const toggleEstateView = (estateId: string) => {
    if (selectedEstate === estateId) {
      setSelectedEstate(null);
    } else {
      setSelectedEstate(estateId);
      if (!estateMembers[estateId]) {
        loadEstateMembers(estateId);
      }
    }
  };

  useEffect(() => {
    if (!loading && currentUser?.role === 'admin') {
      load();
    }
  }, [loading, currentUser]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser?.uid) return;
    try {
      setBusy(true);
      await createEstate(name.trim(), currentUser.uid);
      setName('');
      await load();
    } catch (e) {
      console.error(e);
      setError('Failed to create estate');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleLock = async (estateId: string, currentLockState: boolean) => {
    try {
      await toggleEstateLock(estateId, !currentLockState);
      await load();
    } catch (e) {
      console.error(e);
      setError('Failed to toggle estate lock');
    }
  };

  if (loading || !currentUser) {
    return (
      <PageLoading
        accent="indigo"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      />
    );
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
            aria-label="Back to dashboard"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Manage Estates</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Super Admin &middot; {estates.length} estates</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Create Estate</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Estate name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <button className="w-full px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50" disabled={busy || !name.trim()}>
                {busy ? 'Creating...' : 'Create Estate'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">All Estates</h2>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors" onClick={load}>Refresh</button>
            </div>
            {estates.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">No estates yet.</p>
            ) : (
              <ul className="space-y-3">
                {estates.map((e) => (
                  <li key={e.id} className="border border-gray-100 dark:border-gray-700 rounded-xl px-3 py-3 overflow-hidden">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">{e.name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">ID: {e.id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        {e.isLocked ? (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded">Locked</span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">Active</span>
                        )}
                        <button
                          onClick={() => handleToggleLock(e.id, e.isLocked || false)}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            e.isLocked
                              ? 'bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400'
                              : 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400'
                          }`}
                        >
                          {e.isLocked ? 'Unlock' : 'Lock'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(e.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={() => toggleEstateView(e.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {selectedEstate === e.id ? 'Hide' : 'View'} Members
                      </button>
                    </div>
                    
                    {selectedEstate === e.id && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        {loadingMembers[e.id] ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Loading members...</div>
                        ) : estateMembers[e.id]?.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              {estateMembers[e.id].length} Member(s)
                            </div>
                            {estateMembers[e.id].map((member) => (
                              <div key={member.uid} className="flex items-start gap-2 text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-hidden">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-800 dark:text-white truncate">{member.displayName}</div>
                                  <div className="text-gray-500 dark:text-gray-400 truncate">{member.email}</div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-xs">
                                    {member.role}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    member.status === 'approved' 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                      : member.status === 'pending'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                  }`}>
                                    {member.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">No members in this estate yet.</div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      </div>
    </StatusGuard>
  );
}
