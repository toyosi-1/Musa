"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { User, Estate } from '@/types/user';
import { listEstates } from '@/services/estateService';
import { approveUserWithEstate } from '@/services/userService';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';

export default function AdminPendingPage() {
  const { currentUser, loading } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [selectedEstates, setSelectedEstates] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEstate, setFilterEstate] = useState<string>('all');
  const [bulkEstateId, setBulkEstateId] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [hohStatus, setHohStatus] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setLoadingData(true);
      setError(null);

      // Load estates
      const estateList = await listEstates();
      setEstates(estateList);

      // Load all users and filter for pending status client-side
      // This avoids needing database index for the query
      const db = await getFirebaseDatabase();
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users: User[] = [];
        snapshot.forEach((child) => {
          const user = child.val() as User;
          // Only include users with pending status
          if (user.status === 'pending') {
            users.push(user);
          }
        });
        setPendingUsers(users);
        console.log(`Loaded ${users.length} pending users`);
      } else {
        setPendingUsers([]);
        console.log('No users found in database');
      }
    } catch (e) {
      console.error('Error loading data:', e);
      setError('Failed to load pending users');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading && currentUser?.role === 'admin') {
      loadData();
    }
  }, [loading, currentUser]);

  const handleEstateSelect = (userId: string, estateId: string) => {
    setSelectedEstates(prev => ({ ...prev, [userId]: estateId }));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.uid)));
    }
  };

  const applyBulkEstate = () => {
    if (!bulkEstateId) return;
    const newSelections = { ...selectedEstates };
    selectedUsers.forEach(userId => {
      newSelections[userId] = bulkEstateId;
    });
    setSelectedEstates(newSelections);
  };

  const handleBulkApprove = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select users to approve');
      return;
    }

    // Check if all selected users have estates assigned
    const usersWithoutEstate = Array.from(selectedUsers).filter(uid => !selectedEstates[uid]);
    if (usersWithoutEstate.length > 0) {
      setError('All selected users must have an estate assigned before approval');
      return;
    }

    if (!currentUser?.uid) return;

    try {
      setBusy(true);
      setError(null);
      
      // Approve users one by one
      for (const userId of Array.from(selectedUsers)) {
        const estateId = selectedEstates[userId];
        const estate = estates.find(e => e.id === estateId);
        
        if (estate?.isLocked) {
          console.warn(`Skipping user ${userId}: Estate "${estate.name}" is locked`);
          continue;
        }
        
        await approveUserWithEstate(userId, estateId, currentUser.uid, hohStatus[userId] || false);
      }
      
      setSelectedUsers(new Set());
      setSelectedEstates({});
      setHohStatus({});
      await loadData();
    } catch (e) {
      console.error('Error bulk approving users:', e);
      setError('Failed to approve some users');
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = filterEstate === 'all' 
    ? pendingUsers 
    : pendingUsers.filter(u => selectedEstates[u.uid] === filterEstate);

  const handleApprove = async (user: User) => {
    const estateId = selectedEstates[user.uid];
    if (!estateId) {
      setError('Please select an estate before approving');
      return;
    }

    // Check if estate is locked
    const estate = estates.find(e => e.id === estateId);
    if (estate?.isLocked) {
      setError(`Cannot approve user: Estate "${estate.name}" is currently locked`);
      return;
    }

    if (!currentUser?.uid) return;

    try {
      setBusy(true);
      setError(null);
      await approveUserWithEstate(user.uid, estateId, currentUser.uid, hohStatus[user.uid] || false);
      await loadData(); // Reload to refresh list
    } catch (e) {
      console.error('Error approving user:', e);
      setError('Failed to approve user');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !currentUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Pending Approvals</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {pendingUsers.length} pending user(s)
            </p>
          </div>
          <Link href="/admin/dashboard" className="btn-outline">Back</Link>
        </div>

        {/* Bulk Actions Bar */}
        {pendingUsers.length > 0 && (
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:checked:bg-blue-600 dark:checked:border-blue-600 checked:bg-blue-600 checked:border-blue-600 hover:border-blue-500 transition-all"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : 'Select All'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterEstate}
                  onChange={(e) => setFilterEstate(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  <option value="all">All Estates</option>
                  {estates.map(estate => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name} {estate.isLocked && '(Locked)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUsers.size > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkEstateId}
                      onChange={(e) => setBulkEstateId(e.target.value)}
                      className="input text-sm py-1.5"
                    >
                      <option value="">Assign Estate to Selected</option>
                      {estates.map(estate => (
                        <option key={estate.id} value={estate.id}>
                          {estate.name} {estate.isLocked && '(Locked)'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={applyBulkEstate}
                      disabled={!bulkEstateId}
                      className="btn-outline text-sm py-1.5 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>

                  <button
                    onClick={handleBulkApprove}
                    disabled={busy}
                    className="btn-primary text-sm py-1.5"
                  >
                    {busy ? 'Approving...' : `Approve ${selectedUsers.size} User(s)`}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Loading...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">No pending approvals</p>
              <p className="text-sm mt-1">All users have been processed</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="card p-5">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.uid)}
                    onChange={() => toggleUserSelection(user.uid)}
                    className="mt-1 w-5 h-5 text-blue-600 bg-white border-2 border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-500 dark:checked:bg-blue-600 dark:checked:border-blue-600 checked:bg-blue-600 checked:border-blue-600 hover:border-blue-500 transition-all"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold flex-shrink-0">
                          {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {user.displayName || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Registered: {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <select
                          value={selectedEstates[user.uid] || ''}
                          onChange={(e) => handleEstateSelect(user.uid, e.target.value)}
                          className="input text-sm py-2 min-w-[200px]"
                          disabled={busy}
                        >
                          <option value="">Select Estate</option>
                          {estates.map((estate) => (
                            <option key={estate.id} value={estate.id} disabled={estate.isLocked}>
                              {estate.name} {estate.isLocked ? '(Locked)' : ''}
                            </option>
                          ))}
                        </select>

                        {user.role === 'resident' && (
                          <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <input
                              type="checkbox"
                              checked={hohStatus[user.uid] || false}
                              onChange={(e) => setHohStatus(prev => ({ ...prev, [user.uid]: e.target.checked }))}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">HoH</span>
                          </label>
                        )}

                        <button
                          onClick={() => handleApprove(user)}
                          disabled={!selectedEstates[user.uid] || busy}
                          className="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {busy ? 'Processing...' : 'Approve'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </StatusGuard>
  );
}
