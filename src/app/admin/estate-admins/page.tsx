"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import { listEstates } from '@/services/estateService';
import { listEstateAdmins, createEstateAdmin, removeEstateAdmin } from '@/services/estateAdminService';
import type { User, Estate } from '@/types/user';

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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading estate admins...</p>
          </div>
        </div>
      </StatusGuard>
    );
  }

  return (
    <StatusGuard requireRole="admin">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <Link
            href="/admin/dashboard"
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
                Estate Admins
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage estate-level administrators who can approve users and assign HoH status
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn-primary"
            >
              {showCreateForm ? 'Cancel' : 'Create Estate Admin'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 whitespace-pre-wrap">{success}</p>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Create New Estate Admin
            </h2>
            <form onSubmit={handleCreateEstateAdmin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input w-full"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="input w-full"
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label htmlFor="estateId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign to Estate *
                </label>
                <select
                  id="estateId"
                  value={formData.estateId}
                  onChange={(e) => setFormData({ ...formData, estateId: e.target.value })}
                  className="input w-full"
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
                  className="btn-primary"
                >
                  {isProcessing ? 'Creating...' : 'Create Estate Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ email: '', displayName: '', estateId: '' });
                  }}
                  className="btn-secondary"
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
          <div className="card p-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              No Estate Admins Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create estate admins to delegate user approval and management tasks
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create First Estate Admin
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Assigned Estate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {estateAdmins.map((admin) => (
                    <tr key={admin.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-white">
                            {admin.displayName || admin.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {admin.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {getEstateName(admin.estateId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {admin.canApproveUsers && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Approve Users
                            </span>
                          )}
                          {admin.canAssignHoH && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Assign HoH
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleRemoveEstateAdmin(admin.uid, admin.email)}
                          disabled={isProcessing}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total: {estateAdmins.length} estate admin(s)
              </p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Estate Admin Capabilities:</p>
              <ul className="list-disc list-inside space-y-1">
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
    </StatusGuard>
  );
}
