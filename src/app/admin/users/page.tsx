"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusGuard from '@/components/auth/StatusGuard';
import { User } from '@/types/user';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function AdminUsersPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  useEffect(() => {
    // Only allow admins to access this page
    if (!loading && currentUser && currentUser.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [currentUser, loading, router]);
  
  useEffect(() => {
    // Simulate loading users from database
    const fetchUsers = async () => {
      try {
        // This would normally be an API call to get all users
        // For now, we'll create some dummy data
        setTimeout(() => {
          setUsers([
            {
              uid: '1',
              email: 'resident1@example.com',
              displayName: 'John Resident',
              role: 'resident',
              status: 'approved',
              isEmailVerified: true,
              createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
              approvedBy: currentUser?.uid,
              approvedAt: Date.now() - 29 * 24 * 60 * 60 * 1000
            },
            {
              uid: '2',
              email: 'resident2@example.com',
              displayName: 'Sarah Resident',
              role: 'resident',
              status: 'approved',
              isEmailVerified: true,
              createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
              approvedBy: currentUser?.uid,
              approvedAt: Date.now() - 19 * 24 * 60 * 60 * 1000
            },
            {
              uid: '3',
              email: 'guard1@example.com',
              displayName: 'Michael Guard',
              role: 'guard',
              status: 'approved',
              isEmailVerified: true,
              createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
              approvedBy: currentUser?.uid,
              approvedAt: Date.now() - 14 * 24 * 60 * 60 * 1000
            },
            {
              uid: '4',
              email: 'pending@example.com',
              displayName: 'Pending User',
              role: 'resident',
              status: 'pending',
              isEmailVerified: false,
              createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000
            },
            {
              uid: '5',
              email: 'rejected@example.com',
              displayName: 'Rejected User',
              role: 'resident',
              status: 'rejected',
              isEmailVerified: false,
              createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
              rejectedBy: currentUser?.uid,
              rejectedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
              rejectionReason: 'Information could not be verified'
            }
          ]);
          setLoadingUsers(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoadingUsers(false);
      }
    };
    
    if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser]);
  
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
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
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
                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3">
                              View
                            </button>
                            {user.status === 'pending' && (
                              <>
                                <button className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3">
                                  Approve
                                </button>
                                <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                                  Reject
                                </button>
                              </>
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
