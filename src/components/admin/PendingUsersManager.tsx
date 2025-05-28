"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { User } from '@/types/user';

export default function PendingUsersManager() {
  // Define all hooks unconditionally at the top level
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState<string>('');
  const [batchRejectionReason, setBatchRejectionReason] = useState<string>('');
  const [showBatchActions, setShowBatchActions] = useState<boolean>(false);
  const { currentUser, loading: authLoading, getPendingUsers, approveUser, rejectUser, batchApproveUsers, batchRejectUsers } = useAuth();

  // Function to load pending users - defined outside of useEffect
  const loadPendingUsers = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    try {
      setLoading(true);
      setError('');
      const users = await getPendingUsers();
      setPendingUsers(users);
    } catch (err) {
      setError('Failed to load pending users. Please try again.');
      console.error('Error loading pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Call loadPendingUsers when auth state changes
  useEffect(() => {
    // Only run when auth is not loading and user is admin
    if (!authLoading && currentUser?.role === 'admin') {
      loadPendingUsers();
    }
  }, [currentUser, authLoading]);

  // loadPendingUsers moved to top of component

  const handleApprove = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      setProcessing(prev => ({ ...prev, [userId]: 'approving' }));
      await approveUser(userId, currentUser.uid);
      setProcessing(prev => ({ ...prev, [userId]: 'approved' }));
      
      // Remove from list after short delay to show success state
      setTimeout(() => {
        setPendingUsers(prev => prev.filter(user => user.uid !== userId));
        setProcessing(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }, 1500);
    } catch (err) {
      setProcessing(prev => ({ ...prev, [userId]: 'error' }));
      console.error('Error approving user:', err);
      
      // Clear error status after a delay
      setTimeout(() => {
        setProcessing(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }, 3000);
    }
  };

  const handleReject = async (userId: string) => {
    if (!currentUser) return;
    
    // Get the rejection reason
    const reason = rejectionReasons[userId] || 'Application rejected by administrator';
    
    try {
      setProcessing(prev => ({ ...prev, [userId]: 'rejecting' }));
      await rejectUser(userId, currentUser.uid, reason);
      setProcessing(prev => ({ ...prev, [userId]: 'rejected' }));
      
      // Remove from list after short delay to show success state
      setTimeout(() => {
        setPendingUsers(prev => prev.filter(user => user.uid !== userId));
        setProcessing(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
        
        // Clear rejection reason
        setRejectionReasons(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }, 1500);
    } catch (err) {
      setProcessing(prev => ({ ...prev, [userId]: 'error' }));
      console.error('Error rejecting user:', err);
      
      // Clear error status after a delay
      setTimeout(() => {
        setProcessing(prev => {
          const newState = { ...prev };
          delete newState[userId];
          return newState;
        });
      }, 3000);
    }
  };

  const handleReasonChange = (userId: string, reason: string) => {
    setRejectionReasons(prev => ({
      ...prev,
      [userId]: reason
    }));
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === pendingUsers.length) {
      // If all are selected, deselect all
      setSelectedUsers([]);
    } else {
      // Otherwise, select all
      setSelectedUsers(pendingUsers.map(user => user.uid));
    }
  };

  const handleBatchApprove = async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    try {
      setBatchProcessing('approving');
      await batchApproveUsers(selectedUsers, currentUser.uid);
      setBatchProcessing('approved');

      // Remove approved users from the list after a delay to show success state
      setTimeout(() => {
        setPendingUsers(prev => prev.filter(user => !selectedUsers.includes(user.uid)));
        setSelectedUsers([]);
        setBatchProcessing('');
      }, 1500);
    } catch (err) {
      setBatchProcessing('error');
      console.error('Error batch approving users:', err);

      // Clear error status after a delay
      setTimeout(() => {
        setBatchProcessing('');
      }, 3000);
    }
  };

  const handleBatchReject = async () => {
    if (!currentUser || selectedUsers.length === 0) return;

    // Use the batch rejection reason
    const reason = batchRejectionReason || 'Application rejected by administrator';

    try {
      setBatchProcessing('rejecting');
      await batchRejectUsers(selectedUsers, currentUser.uid, reason);
      setBatchProcessing('rejected');

      // Remove rejected users from the list after a delay to show success state
      setTimeout(() => {
        setPendingUsers(prev => prev.filter(user => !selectedUsers.includes(user.uid)));
        setSelectedUsers([]);
        setBatchRejectionReason('');
        setBatchProcessing('');
      }, 1500);
    } catch (err) {
      setBatchProcessing('error');
      console.error('Error batch rejecting users:', err);

      // Clear error status after a delay
      setTimeout(() => {
        setBatchProcessing('');
      }, 3000);
    }
  };

  // Show loading state if either auth is loading or component data is loading
  if (authLoading || loading) {
    return <LoadingSpinner size="lg" />;
  }

  // Ensure currentUser exists and is admin before rendering
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800">
        <p className="text-yellow-700 dark:text-yellow-300">Only administrators can access this section.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
        <p>{error}</p>
        <button 
          onClick={loadPendingUsers}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Pending Users</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            All user registrations have been processed. Check back later for new registrations.
          </p>
          <button
            onClick={loadPendingUsers}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // Update showBatchActions whenever selectedUsers changes
  // This is done directly instead of in a useEffect to avoid hook inconsistency issues
  // The dependency array in useEffect can cause problems if the component rerenders differently
  const batchActionsVisible = selectedUsers.length > 0;
  // Only update if the value has changed to avoid unnecessary renders
  if (showBatchActions !== batchActionsVisible) {
    setShowBatchActions(batchActionsVisible);
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Pending User Approvals</h2>
        <div className="flex space-x-2">
          {pendingUsers.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mr-2 flex items-center">
              {selectedUsers.length} of {pendingUsers.length} selected
            </div>
          )}
          <button
            onClick={loadPendingUsers}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Batch Actions Panel */}
      {showBatchActions && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Batch Actions for {selectedUsers.length} Users
              </h3>
              
              {batchProcessing === 'approved' && (
                <div className="text-green-600 dark:text-green-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Users approved successfully!</span>
                </div>
              )}
              
              {batchProcessing === 'rejected' && (
                <div className="text-red-600 dark:text-red-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>Users rejected successfully!</span>
                </div>
              )}
              
              {batchProcessing === 'error' && (
                <div className="text-red-600 dark:text-red-400 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Error processing users. Please try again.</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {(batchProcessing === 'approving' || batchProcessing === 'rejecting') ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">{batchProcessing === 'approving' ? 'Approving...' : 'Rejecting...'}</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleBatchApprove}
                    disabled={batchProcessing !== ''}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Approve All
                  </button>
                  <button
                    onClick={handleBatchReject}
                    disabled={batchProcessing !== ''}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject All
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Batch rejection reason */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Rejection reason for all selected users (optional)"
              value={batchRejectionReason}
              onChange={(e) => setBatchRejectionReason(e.target.value)}
              className="input w-full max-w-lg"
              disabled={batchProcessing !== ''}
            />
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pendingUsers.length > 0 && selectedUsers.length === pendingUsers.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary focus:ring-primary rounded"
                  />
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Registered
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {pendingUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.uid)}
                      onChange={() => handleSelectUser(user.uid)}
                      className="h-4 w-4 text-primary focus:ring-primary rounded"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.displayName || 'No Name'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.role === 'resident' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                    {user.role === 'resident' ? 'Resident' : 'Guard'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {processing[user.uid] ? (
                    <div className="flex items-center space-x-2">
                      {(processing[user.uid] === 'approving' || processing[user.uid] === 'rejecting') && (
                        <>
                          <LoadingSpinner size="sm" />
                          <span>{processing[user.uid] === 'approving' ? 'Approving...' : 'Rejecting...'}</span>
                        </>
                      )}
                      {processing[user.uid] === 'approved' && (
                        <span className="text-green-600 dark:text-green-400">Approved!</span>
                      )}
                      {processing[user.uid] === 'rejected' && (
                        <span className="text-red-600 dark:text-red-400">Rejected</span>
                      )}
                      {processing[user.uid] === 'error' && (
                        <span className="text-red-600 dark:text-red-400">Error - Try again</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(user.uid)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(user.uid)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          placeholder="Rejection reason (optional)"
                          value={rejectionReasons[user.uid] || ''}
                          onChange={(e) => handleReasonChange(user.uid, e.target.value)}
                          className="text-xs input w-full"
                        />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
