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
    return (
      <div className="p-8 flex flex-col items-center justify-center bg-musa-bg dark:bg-gray-900 rounded-2xl">
        <LoadingSpinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading pending users...</p>
      </div>
    );
  }

  // Ensure currentUser exists and is admin before rendering
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl border-l-4 border-yellow-400 dark:border-yellow-500 shadow-card">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-yellow-700 dark:text-yellow-300 font-medium">Only administrators can access this section.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/30 rounded-2xl border-l-4 border-red-500 shadow-card">
        <div className="flex items-start mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
        <button 
          onClick={loadPendingUsers}
          className="btn-danger ml-9"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (pendingUsers.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <div className="relative mx-auto mb-6">
            <div className="w-24 h-24 bg-green-50 dark:bg-green-900/30 rounded-full shadow-md flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">All Caught Up!</h3>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            All user registrations have been processed. Check back later for new registrations.
          </p>
          
          <button
            onClick={loadPendingUsers}
            className="btn-outline mt-8 flex items-center mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Check for New Registrations
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
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pending Approvals</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{pendingUsers.length} users waiting for approval</p>
        </div>
        <div className="flex space-x-2">
          {pendingUsers.length > 0 && (
            <div className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 py-1 px-3 rounded-full mr-2 flex items-center">
              <span className="font-medium">{selectedUsers.length}</span>
              <span className="mx-1">of</span>
              <span className="font-medium">{pendingUsers.length}</span>
              <span className="ml-1">selected</span>
            </div>
          )}
          <button
            onClick={loadPendingUsers}
            className="btn-outline py-2 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Batch Actions Panel */}
      {showBatchActions && (
        <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl shadow-card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                Batch Process {selectedUsers.length} Users
              </h3>
              
              {batchProcessing === 'approved' && (
                <div className="text-green-600 dark:text-green-400 flex items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-xl mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Users approved successfully!</span>
                </div>
              )}
              
              {batchProcessing === 'rejected' && (
                <div className="text-red-600 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-xl mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>Users rejected successfully!</span>
                </div>
              )}
              
              {batchProcessing === 'error' && (
                <div className="text-red-600 dark:text-red-400 flex items-center bg-red-50 dark:bg-red-900/20 p-2 rounded-xl mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Error processing users. Please try again.</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              {(batchProcessing === 'approving' || batchProcessing === 'rejecting') ? (
                <div className="flex items-center bg-white dark:bg-gray-800 py-2 px-4 rounded-xl shadow-sm">
                  <LoadingSpinner size="sm" color={batchProcessing === 'approving' ? 'primary' : 'red'} />
                  <span className="ml-3 font-medium">{batchProcessing === 'approving' ? 'Approving...' : 'Rejecting...'}</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleBatchApprove}
                    disabled={batchProcessing !== ''}
                    className="py-2 px-4 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-button flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Approve All
                  </button>
                  <button
                    onClick={handleBatchReject}
                    disabled={batchProcessing !== ''}
                    className="py-2 px-4 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-button flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Reject All
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Batch rejection reason */}
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rejection reason for all selected users (optional)"
                value={batchRejectionReason}
                onChange={(e) => setBatchRejectionReason(e.target.value)}
                className="input w-full pl-10 bg-white dark:bg-gray-800"
                disabled={batchProcessing !== ''}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 shadow-card">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  <div className="h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center relative">
                    <input
                      type="checkbox"
                      checked={pendingUsers.length > 0 && selectedUsers.length === pendingUsers.length}
                      onChange={handleSelectAll}
                      className="absolute opacity-0 w-full h-full cursor-pointer"
                    />
                    {pendingUsers.length > 0 && selectedUsers.length === pendingUsers.length && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User Information
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Registration Date
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {pendingUsers.map((user) => (
              <tr key={user.uid} className="hover:bg-musa-bg dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-5 w-5 rounded-md border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center relative">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.uid)}
                        onChange={() => handleSelectUser(user.uid)}
                        className="absolute opacity-0 w-full h-full cursor-pointer"
                      />
                      {selectedUsers.includes(user.uid) && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-4 text-lg font-semibold text-gray-600 dark:text-gray-300">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
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
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${user.role === 'resident' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 
                      'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}>
                    {user.role === 'resident' ? 'Resident' : 'Guard'}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                  {processing[user.uid] ? (
                    <div className="flex items-center">
                      {(processing[user.uid] === 'approving' || processing[user.uid] === 'rejecting') && (
                        <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 py-2 px-3 rounded-lg">
                          <LoadingSpinner size="sm" color={processing[user.uid] === 'approving' ? 'primary' : 'red'} />
                          <span className="font-medium">{processing[user.uid] === 'approving' ? 'Approving...' : 'Rejecting...'}</span>
                        </div>
                      )}
                      {processing[user.uid] === 'approved' && (
                        <div className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 px-3 rounded-lg flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Approved!</span>
                        </div>
                      )}
                      {processing[user.uid] === 'rejected' && (
                        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 py-2 px-3 rounded-lg flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Rejected</span>
                        </div>
                      )}
                      {processing[user.uid] === 'error' && (
                        <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 py-2 px-3 rounded-lg flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Error - Try again</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApprove(user.uid)}
                          className="py-2 px-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors flex items-center shadow-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(user.uid)}
                          className="py-2 px-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center shadow-button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Reject
                        </button>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Rejection reason (optional)"
                          value={rejectionReasons[user.uid] || ''}
                          onChange={(e) => handleReasonChange(user.uid, e.target.value)}
                          className="text-xs input w-full pl-7 bg-white dark:bg-gray-700"
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
