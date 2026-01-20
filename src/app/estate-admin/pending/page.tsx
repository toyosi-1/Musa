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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading pending users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <Link
          href="/estate-admin/dashboard"
          className="inline-flex items-center text-primary hover:text-primary-dark mb-4 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Pending Approvals
            </h1>
            {estate && (
              <p className="text-gray-600 dark:text-gray-400">
                Estate: <span className="font-semibold text-primary">{estate.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {pendingUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            No Pending Users
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            All users have been processed. New applications will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">{selectedUsers.size}</span> user(s) selected
                </p>
                <button
                  onClick={handleApproveSelected}
                  disabled={isProcessing}
                  className="btn-primary"
                >
                  {isProcessing ? 'Processing...' : `Approve Selected (${selectedUsers.size})`}
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === pendingUsers.length && pendingUsers.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Head of Household
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.uid)}
                          onChange={() => handleSelectUser(user.uid)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            {user.displayName || user.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'resident' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.role === 'resident' && (
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hohStatus[user.uid] || false}
                              onChange={() => handleToggleHoH(user.uid)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Yes</span>
                          </label>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleApproveUser(user.uid, hohStatus[user.uid] || false)}
                          disabled={isProcessing}
                          className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                        >
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-1">Head of Household (HoH) Privileges:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Can create households and invite members</li>
                  <li>Can generate access codes for visitors</li>
                  <li>Has additional device authorization security</li>
                </ul>
                <p className="mt-2">Only assign HoH status to verified property owners or primary residents.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
