"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { Estate, User } from '@/types/user';
import { listEstates, createEstate, toggleEstateLock } from '@/services/estateService';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

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
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Estates</h1>
          <Link href="/admin/dashboard" className="btn-outline">Back</Link>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Create Estate</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                className="input w-full"
                placeholder="Estate name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <button className="btn-primary" disabled={busy || !name.trim()}>
                {busy ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Estates</h2>
              <button className="btn-outline text-sm" onClick={load}>Refresh</button>
            </div>
            {estates.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">No estates yet.</p>
            ) : (
              <ul className="space-y-3">
                {estates.map((e) => (
                  <li key={e.id} className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 dark:text-white">{e.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ID: {e.id}</div>
                      </div>
                      <div className="flex items-center gap-2">
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
                        className="text-xs text-primary hover:underline flex items-center gap-1"
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
                              <div key={member.uid} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-800 dark:text-white">{member.displayName}</div>
                                  <div className="text-gray-500 dark:text-gray-400">{member.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
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
    </StatusGuard>
  );
}
