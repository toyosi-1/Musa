"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { approveUserWithEstate } from '@/services/userService';
import type { User, Estate } from '@/types/user';

export default function EstateAdminPendingPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hohStatus, setHohStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    if (currentUser.role !== 'estate_admin') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [currentUser, router]);

  const loadData = async () => {
    if (!currentUser?.estateId) {
      console.error('Estate admin missing estateId');
      setLoading(false);
      setError('Estate not assigned to your account. Please contact administrator.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const db = await getFirebaseDatabase();

      // Load estate details
      const estateRef = ref(db, `estates/${currentUser.estateId}`);
      const estateSnapshot = await get(estateRef);
      if (estateSnapshot.exists()) {
        setEstate(estateSnapshot.val() as Estate);
      }

      // Load all users and filter for pending in this estate
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users: User[] = [];
        snapshot.forEach((child) => {
          const user = child.val() as User;
          // Show pending users in this estate
          if (user.status === 'pending' && user.estateId === currentUser.estateId) {
            users.push(user);
            console.log('Found pending user:', user.email, 'for estate:', user.estateId);
          }
        });
        setPendingUsers(users);
        console.log(`Loaded ${users.length} pending users for estate admin in estate: ${currentUser.estateId}`);
      } else {
        setPendingUsers([]);
        console.log('No users found in database');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (uid: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(uid)) {
      newSelected.delete(uid);
    } else {
      newSelected.add(uid);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === pendingUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pendingUsers.map(u => u.uid)));
    }
  };

  const handleToggleHoH = (uid: string) => {
    setHohStatus(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const handleApproveSelected = async () => {
    if (selectedUsers.size === 0) {
      setError('Please select at least one user to approve');
      return;
    }

    if (!currentUser?.estateId) {
      setError('Estate not assigned');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const approvalPromises = Array.from(selectedUsers).map(uid => 
        approveUserWithEstate(
          uid,
          currentUser.estateId!,
          currentUser.uid,
          hohStatus[uid] || false
        )
      );

      await Promise.all(approvalPromises);

      setSuccessMessage(`Successfully approved ${selectedUsers.size} user(s)`);
      setSelectedUsers(new Set());
      setHohStatus({});

      // Reload data
      setTimeout(() => {
        loadData();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error approving users:', err);
      setError('Failed to approve users. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveUser = async (uid: string, isHoH: boolean) => {
    if (!currentUser?.estateId) return;

    setIsProcessing(true);
    setError(null);

    try {
      await approveUserWithEstate(uid, currentUser.estateId, currentUser.uid, isHoH);
      setSuccessMessage('User approved successfully');
      
      setTimeout(() => {
        loadData();
        setSuccessMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="w-5 h-5 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading pending users...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/estate-admin/dashboard"
          className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
          aria-label="Back to dashboard"
        >
          <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Pending Approvals</h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">{estate?.name || 'Estate Management'}</p>
          </div>
        </div>
        {pendingUsers.length > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold">
            {pendingUsers.length}
          </span>
        )}
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

      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{successMessage}</p>
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">All Caught Up</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending users. New applications will appear here.</p>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center justify-between">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                <span className="font-bold">{selectedUsers.size}</span> user{selectedUsers.size !== 1 ? 's' : ''} selected
              </p>
              <button
                onClick={handleApproveSelected}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : `Approve Selected (${selectedUsers.size})`}
              </button>
            </div>
          )}

          {/* Users List */}
          <div className="space-y-3">
            {/* Select All */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={selectedUsers.size === pendingUsers.length && pendingUsers.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {selectedUsers.size > 0 ? `${selectedUsers.size} of ${pendingUsers.length} selected` : 'Select All'}
              </span>
            </div>

            {pendingUsers.map((user) => (
              <div key={user.uid} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 sm:p-4 overflow-hidden">
                {/* User info row */}
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.uid)}
                    onChange={() => handleSelectUser(user.uid)}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded ${
                        user.role === 'resident' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {user.role}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 ml-6 sm:ml-7">
                  {user.role === 'resident' && (
                    <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={hohStatus[user.uid] || false}
                        onChange={() => handleToggleHoH(user.uid)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">HoH</span>
                    </label>
                  )}
                  <button
                    onClick={() => handleApproveUser(user.uid, hohStatus[user.uid] || false)}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-lg shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-bold mb-1">Head of Household (HoH) Privileges:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                  <li>Can create households and invite members</li>
                  <li>Can generate access codes for visitors</li>
                  <li>Has additional device authorization security</li>
                </ul>
                <p className="mt-1.5 text-blue-500 dark:text-blue-400">Only assign HoH to verified property owners.</p>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
