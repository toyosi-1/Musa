"use client";

import { useState, useEffect } from 'react';
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
          alert(`Please select an estate for the ${selectedRole === 'estate_admin' ? 'estate admin' : 'guard'}`);
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
      
      alert(`Successfully promoted user to ${selectedRole}${selectedRole === 'estate_admin' ? ' for estate ' + selectedEstateId : ''}`);
      
      setEditingUserId(null);
      setSelectedRole('resident');
      setSelectedEstateId('');
    } catch (error: any) {
      console.error('❌ Error updating user role:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      alert(`Failed to update user role: ${error?.message || 'Unknown error'}`);
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
          <Link 
            href="/admin/dashboard" 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 space-y-4 md:space-y-0">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
              <select
                className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-2 px-3"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          
          {loadingUsers ? (
            <div className="flex justify-center my-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Joined
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredUsers.map((user) => (
                        <tr key={user.uid}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {/* Placeholder for avatar - you can use an Image component or initials */}
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-semibold">
                                {user.displayName ? user.displayName.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?')}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.displayName || user.email || 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email || 'No email'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUserId === user.uid ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  value={selectedRole}
                                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="resident">Resident</option>
                                  <option value="guard">Guard</option>
                                  <option value="estate_admin">Estate Admin</option>
                                </select>
                                {(selectedRole === 'estate_admin' || selectedRole === 'guard') && (
                                  <select
                                    value={selectedEstateId}
                                    onChange={(e) => setSelectedEstateId(e.target.value)}
                                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  >
                                    <option value="">Select Estate</option>
                                    {estates.map(estate => (
                                      <option key={estate.id} value={estate.id}>{estate.name}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                                {(user.role === 'estate_admin' || user.role === 'guard') && user.estateId && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {estates.find(e => e.id === user.estateId)?.name || 'Unknown Estate'}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.status === 'approved' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : user.status === 'pending' 
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {editingUserId === user.uid ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSaveRole(user.uid)}
                                  disabled={updating}
                                  className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                                >
                                  {updating ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={updating}
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              user.status === 'approved' && user.uid !== currentUser?.uid && (
                                <button
                                  onClick={() => handleEditRole(user)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                >
                                  Change Role
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No users found matching your filters</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </StatusGuard>
  );
}
