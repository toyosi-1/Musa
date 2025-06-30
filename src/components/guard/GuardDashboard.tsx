"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'firebase/auth';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiX, 
  FiClock, 
  FiCalendar, 
  FiHome, 
  FiUsers, 
  FiShield, 
  FiAlertCircle, 
  FiInfo,
  FiPlus,
  FiArrowRight
} from 'react-icons/fi';

// Import components
import { VerificationForm } from './components/VerificationForm';
import { ScanResultDisplay } from './components/ScanResultDisplay';
import { VerificationHistoryList } from './components/VerificationHistoryList';
import { VerificationHistoryErrorBoundary } from './components/VerificationHistoryErrorBoundary';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Import types
import type { 
  Household, 
  VerificationRecord, 
  VerificationResult, 
  ActivityStats 
} from './types';

// Mock API functions
const verifyAccessCode = async (code: string): Promise<VerificationResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const isValid = code.startsWith('MUSA');
      resolve({
        isValid,
        message: isValid ? 'Valid access code' : 'Invalid access code',
        household: isValid ? { id: '1', address: '123 Main St' } : undefined
      });
    }, 500);
  });
};

const logVerificationAttempt = async (
  guardId: string,
  data: { code: string; isValid: boolean; message: string; householdId?: string; destinationAddress?: string }
): Promise<void> => {
  console.log('Logging verification attempt:', { guardId, ...data });
};

const getGuardVerificationHistory = async (guardId: string): Promise<VerificationRecord[]> => {
  return [
    {
      id: '1',
      timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      code: 'MUSA1234',
      guardId,
      isValid: true,
      message: 'Access granted',
      householdId: '1',
      destinationAddress: '123 Main St'
    },
    {
      id: '2',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      code: 'INVALID123',
      guardId,
      isValid: false,
      message: 'Invalid code',
    }
  ];
};

const getGuardActivityStats = async (guardId: string): Promise<ActivityStats> => {
  return {
    totalVerifications: 42,
    validAccess: 35,
    deniedAccess: 7,
    todayVerifications: 5
  };
};

// Component Props Types
type StatsCardProps = {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading: boolean;
  colorClass?: string;
};

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

type CardTitleProps = {
  children: React.ReactNode;
};

interface GuardDashboardProps {
  user: User;
}

const GuardDashboard: React.FC<GuardDashboardProps> = ({ user }) => {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationRecord[]>([]);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalVerifications: 0,
    validAccess: 0,
    deniedAccess: 0,
    todayVerifications: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load verification history and stats on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load verification history
        const history = await getGuardVerificationHistory(user.uid);
        setVerificationHistory(history);
        
        // Load activity stats
        const stats = await getGuardActivityStats(user.uid);
        setActivityStats(stats);
      } catch (err) {
        console.error('Error loading guard dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user.uid]);

  // Clear scan result after 5 seconds
  useEffect(() => {
    if (!scanResult) return;
    
    const timer = setTimeout(() => {
      setScanResult(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [scanResult]);

  // Handle manual code verification
  const handleVerifyCode = async (code: string) => {
    if (!code.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await verifyAccessCode(code);
      setScanResult(result);
      
      // Log this verification attempt
      await logVerificationAttempt(user.uid, {
        code,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      });
      
      // Update local stats and history without reloading everything
      setActivityStats(prev => ({
        ...prev,
        totalVerifications: prev.totalVerifications + 1,
        validAccess: prev.validAccess + (result.isValid ? 1 : 0),
        deniedAccess: prev.deniedAccess + (result.isValid ? 0 : 1),
        todayVerifications: prev.todayVerifications + 1
      }));
      
      // Add to verification history
      const newRecord: VerificationRecord = {
        id: `local-${Date.now()}`,
        timestamp: Date.now(),
        code,
        guardId: user.uid,
        isValid: result.isValid,
        message: result.message,
        householdId: result.household?.id,
        destinationAddress: result.destinationAddress
      };
      
      setVerificationHistory(prev => [newRecord, ...prev].slice(0, 50)); // Keep only the 50 most recent records
      
    } catch (err) {
      console.error('Error verifying code:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle QR code scanning - now directly using router.push in the UI

  // Icons for stats cards
  const StatsIcon = ({ icon: Icon, className = '' }: { icon: React.ElementType; className?: string }) => (
    <div className={`p-2 rounded-full ${className}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
  );

  // Define StatsCard component
  const StatsCard: React.FC<StatsCardProps> = ({ 
    title, 
    value, 
    icon: Icon, 
    isLoading,
    colorClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
  }) => (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6 flex items-center transition-all duration-300 hover:shadow-lg"
      whileHover={{ y: -2 }}
    >
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        {isLoading ? (
          <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-1"></div>
        ) : (
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        )}
      </div>
    </motion.div>
  );

  // Define Card component
  const Card: React.FC<CardProps> = ({ children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-card p-6 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mr-4"
          aria-label="Go back"
        >
          <FiArrowLeft className="h-5 w-5 mr-1" />
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Guard Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-6 py-4 rounded-xl shadow-card mb-8">
          <div className="flex items-center">
            <FiAlertCircle className="h-5 w-5 mr-3 text-red-500" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Verifications" 
          value={activityStats.totalVerifications} 
          icon={FiHome}
          isLoading={isLoading}
          colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatsCard 
          title="Valid Access" 
          value={activityStats.validAccess} 
          icon={FiCheck}
          isLoading={isLoading}
          colorClass="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatsCard 
          title="Denied Access" 
          value={activityStats.deniedAccess} 
          icon={FiX}
          isLoading={isLoading}
          colorClass="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        />
        <StatsCard 
          title="Today" 
          value={activityStats.todayVerifications} 
          icon={FiCalendar}
          isLoading={isLoading}
          colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <FiShield className="h-6 w-6 mr-2 text-teal-500" />
              Verify Access Code
            </h2>
            <p className="text-gray-600 dark:text-gray-400">Enter or scan an access code to verify visitor access.</p>
          </div>
          
          <VerificationForm 
            onSubmit={handleVerifyCode} 
            isProcessing={isProcessing}
          />
          
          {scanResult && (
            <div className="mt-6">
              <ScanResultDisplay 
                result={scanResult}
                onClose={() => setScanResult(null)}
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
              <FiClock className="h-6 w-6 mr-2 text-teal-500" />
              Recent Activity
            </h2>
            <button 
              onClick={() => router.push('/guard/activity')}
              className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline"
            >
              View All
            </button>
          </div>
          
          {verificationHistory.length === 0 ? (
            <div className="text-center py-8">
              <FiClock className="mx-auto h-12 w-12 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No verification history</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Scan or enter an access code to get started.</p>
            </div>
          ) : (
            <VerificationHistoryList 
              history={verificationHistory} 
              isLoading={isLoading}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default GuardDashboard;
