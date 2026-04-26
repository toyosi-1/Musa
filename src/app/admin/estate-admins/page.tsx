"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import { listEstates } from '@/services/estateService';
import { listEstateAdmins, createEstateAdmin, removeEstateAdmin } from '@/services/estateAdminService';
import type { User, Estate } from '@/types/user';
import EmptyState from '@/components/ui/EmptyState';
import PageLoading from '@/components/ui/PageLoading';

export default function EstateAdminsPage() {
  const { currentUser } = useAuth();
  const [estateAdmins, setEstateAdmins] = useState<User[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    displayName: '',
    estateId: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const [adminsData, estatesData] = await Promise.all([
        listEstateAdmins(currentUser.uid),
        listEstates()
      ]);

      setEstateAdmins(adminsData);
      setEstates(estatesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load estate admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEstateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser?.uid) return;
    if (!formData.email || !formData.estateId) {
      setError('Email and estate are required');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createEstateAdmin(
        formData.email,
        formData.estateId,
        currentUser.uid,
        formData.displayName || undefined
      );

      setSuccess(`Estate admin created successfully! Temporary password: ${result.tempPassword}`);
      setFormData({ email: '', displayName: '', estateId: '' });
      setShowCreateForm(false);
      
      // Reload data
      setTimeout(() => {
        loadData();
        setSuccess(null);
      }, 5000);
    } catch (err) {
      console.error('Error creating estate admin:', err);
      setError(err instanceof Error ? err.message : 'Failed to create estate admin');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveEstateAdmin = async (uid: string, email: string) => {
    if (!currentUser?.uid) return;
    
    if (!confirm(`Are you sure you want to remove estate admin: ${email}?`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await removeEstateAdmin(uid, currentUser.uid, 'delete');
      setSuccess('Estate admin removed successfully');
      
      setTimeout(() => {
        loadData();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Error removing estate admin:', err);
      setError('Failed to remove estate admin');
    } finally {
      setIsProcessing(false);
    }
  };

  const getEstateName = (estateId?: string) => {
    if (!estateId) return 'Unknown';
    const estate = estates.find(e => e.id === estateId);
    return estate?.name || 'Unknown';
  };

  if (loading) {
    return (
      <StatusGuard requireRole="admin">
        <PageLoading
          accent="purple"
          label="Loading estate admins..."
          icon={
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
      </StatusGuard>
    );
  }

  return (
    <StatusGuard requireRole="admin">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md shadow-purple-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Estate Admins</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Manage estate-level administrators</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
              showCreateForm
                ? 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-md shadow-purple-500/20'
            }`}
          >
            {showCreateForm ? 'Cancel' : '+ Create Admin'}
          </button>
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

        {success && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 whitespace-pre-wrap">{success}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Create New Estate Admin</h2>
            </div>
            <form onSubmit={handleCreateEstateAdmin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label htmlFor="displayName" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Display Name (Optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label htmlFor="estateId" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                  Assign to Estate *
                </label>
                <select
                  id="estateId"
                  value={formData.estateId}
                  onChange={(e) => setFormData({ ...formData, estateId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  disabled={isProcessing}
                >
                  <option value="">Select an estate...</option>
                  {estates.map((estate) => (
                    <option key={estate.id} value={estate.id}>
                      {estate.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Creating...' : 'Create Estate Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ email: '', displayName: '', estateId: '' });
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Estate Admins List */}
        {estateAdmins.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            title="No Estate Admins Yet"
            description="Create estate admins to delegate user approval and management tasks"
          >
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl shadow-md shadow-purple-500/20 transition-all"
            >
              Create First Estate Admin
            </button>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {estateAdmins.map((admin) => (
              <div key={admin.uid} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 sm:p-4 overflow-hidden">
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold flex-shrink-0 text-sm">
                    {(admin.displayName || admin.email)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                      {admin.displayName || admin.email}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{admin.email}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {getEstateName(admin.estateId)}
                      </span>
                      {admin.canApproveUsers && (
                        <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Approve
                        </span>
                      )}
                      {admin.canAssignHoH && (
                        <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          HoH
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveEstateAdmin(admin.uid, admin.email)}
                    disabled={isProcessing}
                    className="flex-shrink-0 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="text-center py-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Total: {estateAdmins.length} estate admin(s)
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-bold mb-1">Estate Admin Capabilities:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600 dark:text-blue-400">
                <li>Review and approve/reject pending users for their estate</li>
                <li>Assign Head of Household (HoH) status to residents</li>
                <li>Manage existing users within their estate</li>
                <li>Cannot access other estates or create new estates</li>
                <li>Cannot create or modify other administrators</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      </div>
    </StatusGuard>
  );
}
