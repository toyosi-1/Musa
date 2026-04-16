"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusGuard from '@/components/auth/StatusGuard';
import { User, UserRole } from '@/types/user';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { getFirebaseDatabase, ref, get, update } from '@/lib/firebase';
import { Estate } from '@/types/estate';

export default function AdminUsersPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [estates, setEstates] = useState<Estate[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('resident');
  const [selectedEstateId, setSelectedEstateId] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    // Only allow admins to access this page
    if (!loading && currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = await getFirebaseDatabase();
        
        // Fetch all users
        const usersSnapshot = await get(ref(db, 'users'));
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const usersList = Object.entries(usersData).map(([uid, data]: [string, any]) => ({
            uid,
            ...data
          })) as User[];
          setUsers(usersList);
        }
        
        // Fetch estates
        const estatesSnapshot = await get(ref(db, 'estates'));
        if (estatesSnapshot.exists()) {
          const estatesData = estatesSnapshot.val();
          const estatesList = Object.entries(estatesData).map(([id, data]: [string, any]) => ({
            id,
            ...data
          })) as Estate[];
          setEstates(estatesList);
        }
        
        setLoadingUsers(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoadingUsers(false);
      }
    };
    
    if (currentUser?.role === 'admin') {
      fetchData();
    }
  }, [currentUser]);
  
  const handleEditRole = (user: User) => {
    setEditingUserId(user.uid);
    setSelectedRole(user.role);
    setSelectedEstateId(user.estateId || '');
  };
  
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setSelectedRole('resident');
    setSelectedEstateId('');
  };
  
  const handleSaveRole = async (userId: string) => {
    if (updating) return;
    
    try {
      setUpdating(true);
      const db = await getFirebaseDatabase();
      const userRef = ref(db, `users/${userId}`);
      
      console.log('=== PROMOTION DEBUG ===');
      console.log('User ID:', userId);
      console.log('Selected Role:', selectedRole);
      console.log('Selected Estate ID:', selectedEstateId);
      
      const updates: any = {
        role: selectedRole,
        updatedAt: Date.now()
      };
      
      // If promoting to estate_admin or guard, require estate assignment
      if (selectedRole === 'estate_admin' || selectedRole === 'guard') {
        if (!selectedEstateId) {
          toast.error(`Please select an estate for the ${selectedRole === 'estate_admin' ? 'estate admin' : 'guard'}`);
          setUpdating(false);
          return;
        }
        updates.estateId = selectedEstateId;
        console.log('Adding estateId to updates:', updates.estateId);
      } else if (selectedRole === 'admin') {
        // Admins don't need estate assignment
        updates.estateId = null;
        console.log('Removing estateId for admin role');
      }
      // For residents, keep their existing estateId (from registration)
      
      console.log('Updates object:', JSON.stringify(updates, null, 2));
      console.log('Firebase path:', `users/${userId}`);
      
      await update(userRef, updates);
      console.log('✅ Firebase update completed successfully');
      
      // Verify the update by reading back
      const verifySnapshot = await get(userRef);
      if (verifySnapshot.exists()) {
        const userData = verifySnapshot.val();
        console.log('✅ Verified user data after update:', {
          role: userData.role,
          estateId: userData.estateId
        });
      }
      
      // Update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId 
          ? { ...u, role: selectedRole, estateId: (selectedRole === 'estate_admin' || selectedRole === 'guard') ? selectedEstateId : undefined }
          : u
      ));
      
      toast.success(`Successfully promoted user to ${selectedRole}${selectedRole === 'estate_admin' ? ' for estate ' + selectedEstateId : ''}`);
      
      setEditingUserId(null);
      setSelectedRole('resident');
      setSelectedEstateId('');
    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      toast.error(`Failed to update user role: ${error?.message || 'Unknown error'}`);
    } finally {
      setUpdating(false);
    }
  };
  
  // Filter and search users
  const filteredUsers = users.filter(user => {
    // Apply status filter
    if (filterStatus !== 'all' && user.status !== filterStatus) {
      return false;
    }
    
    // Apply search term
    if (searchTerm) {
      const nameMatch = user.displayName ? user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      const emailMatch = user.email ? user.email.toLowerCase().includes(searchTerm.toLowerCase()) : false;
      if (!nameMatch && !emailMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  if (loading || !currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">User Management</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Super Admin &middot; {users.length} users</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search users..."
              className="pl-9 pr-4 py-2.5 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Users</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
          
        {loadingUsers ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading users...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-3 sm:p-4 overflow-hidden">
                {/* User info */}
                <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold flex-shrink-0 text-sm">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                      {user.displayName || user.email || 'N/A'}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email || 'No email'}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold rounded ${
                        user.status === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : user.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                      {(user.role === 'estate_admin' || user.role === 'guard') && user.estateId && (
                        <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {estates.find(e => e.id === user.estateId)?.name || 'Unknown Estate'}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit mode or action button */}
                {editingUserId === user.uid ? (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2 ml-12 sm:ml-14">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="resident">Resident</option>
                        <option value="guard">Guard</option>
                        <option value="estate_admin">Estate Admin</option>
                      </select>
                      {(selectedRole === 'estate_admin' || selectedRole === 'guard') && (
                        <select
                          value={selectedEstateId}
                          onChange={(e) => setSelectedEstateId(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Estate</option>
                          {estates.map(estate => (
                            <option key={estate.id} value={estate.id}>{estate.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveRole(user.uid)}
                        disabled={updating}
                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-lg shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={updating}
                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  user.status === 'approved' && user.uid !== currentUser?.uid && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 ml-12 sm:ml-14">
                      <button
                        onClick={() => handleEditRole(user)}
                        className="px-3 py-1.5 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        Change Role
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}

            {/* Summary */}
            <div className="text-center py-2">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">No Users Found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">No users found matching your filters</p>
          </div>
        )}
      </div>
      </div>
    </StatusGuard>
  );
}
