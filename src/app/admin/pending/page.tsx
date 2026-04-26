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
import PageLoading from '@/components/ui/PageLoading';

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
    return (
      <PageLoading
        accent="amber"
        icon={
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Super Admin &middot; {pendingUsers.length} pending</p>
            </div>
          </div>
          {pendingUsers.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
              {pendingUsers.length}
            </span>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {pendingUsers.length > 0 && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 sm:p-4">
            <div className="space-y-3">
              {/* Row 1: Select all + filter */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-amber-600 bg-white border-2 border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {selectedUsers.size > 0 ? `${selectedUsers.size} selected` : 'Select All'}
                  </span>
                </label>

                <select
                  value={filterEstate}
                  onChange={(e) => setFilterEstate(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 truncate"
                >
                  <option value="all">All Estates</option>
                  {estates.map(estate => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name} {estate.isLocked && '(Locked)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 2: Bulk assign + approve (only when users selected) */}
              {selectedUsers.size > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkEstateId}
                      onChange={(e) => setBulkEstateId(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 truncate"
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
                      className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  <button
                    onClick={handleBulkApprove}
                    disabled={busy}
                    className="w-full px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {busy ? 'Approving...' : `Approve ${selectedUsers.size} User(s)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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

        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">All Caught Up</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">No pending approvals. All users have been processed.</p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 sm:p-5 overflow-hidden">
                {/* Top: Checkbox + User Info */}
                <div className="flex items-start gap-2.5 sm:gap-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.uid)}
                    onChange={() => toggleUserSelection(user.uid)}
                    className="mt-1 w-4 h-4 text-amber-600 bg-white border-2 border-gray-300 rounded cursor-pointer focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:border-gray-600 flex-shrink-0"
                  />
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold flex-shrink-0 text-sm sm:text-base">
                      {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                        {user.displayName || 'No Name'}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                        <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom: Actions — always stacked below on mobile */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 ml-6 sm:ml-8">
                  <select
                    value={selectedEstates[user.uid] || ''}
                    onChange={(e) => handleEstateSelect(user.uid, e.target.value)}
                    className="w-full sm:w-auto sm:flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={busy}
                  >
                    <option value="">Select Estate</option>
                    {estates.map((estate) => (
                      <option key={estate.id} value={estate.id} disabled={estate.isLocked}>
                        {estate.name} {estate.isLocked ? '(Locked)' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    {user.role === 'resident' && (
                      <label className="flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={hohStatus[user.uid] || false}
                          onChange={(e) => setHohStatus(prev => ({ ...prev, [user.uid]: e.target.checked }))}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">HoH</span>
                      </label>
                    )}

                    <button
                      onClick={() => handleApprove(user)}
                      disabled={!selectedEstates[user.uid] || busy}
                      className="flex-1 sm:flex-none px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-lg sm:rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {busy ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </StatusGuard>
  );
}
