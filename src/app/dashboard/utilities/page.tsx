"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, BoltIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

// Types returned from /api/utilities/billers
interface BillerItem {
  itemCode: string;
  name: string;
  amount: number;
  fee: number;
}

interface Biller {
  id: string;
  name: string;
  shortName: string;
  billerCode: string;
  items: BillerItem[];
}

type PurchaseStep = 'loading' | 'select-disco' | 'select-item' | 'enter-details' | 'confirm' | 'processing' | 'success' | 'error';

export default function UtilitiesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Billers fetched from Flutterwave via our API
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billersLoading, setBillersLoading] = useState(true);
  const [billersError, setBillersError] = useState('');

  // Selection state
  const [step, setStep] = useState<PurchaseStep>('loading');
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [selectedItem, setSelectedItem] = useState<BillerItem | null>(null);

  // Form state
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [validatingMeter, setValidatingMeter] = useState(false);
  const [meterInfo, setMeterInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);

  // Fetch billers on mount
  const fetchBillers = useCallback(async () => {
    setBillersLoading(true);
    setBillersError('');
    try {
      const res = await fetch('/api/utilities/billers');
      const data = await res.json();
      if (data.success && Array.isArray(data.billers)) {
        setBillers(data.billers);
        setStep('select-disco');
      } else {
        setBillersError(data.message || 'Unable to load electricity providers.');
        setStep('select-disco');
      }
    } catch (err) {
      console.error('Failed to fetch billers:', err);
      setBillersError('Network error loading providers. Please check your connection.');
      setStep('select-disco');
    } finally {
      setBillersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillers();
  }, [fetchBillers]);

  // Load saved preferences
  useEffect(() => {
    const savedMeter = localStorage.getItem('musa_saved_meter');
    const savedPhone = localStorage.getItem('musa_saved_phone');
    if (savedMeter) setMeterNumber(savedMeter);
    if (savedPhone) setPhoneNumber(savedPhone);
  }, []);

  // --- Handlers ---

  const handleBillerSelect = (biller: Biller) => {
    setSelectedBiller(biller);
    setSelectedItem(null);
    setMeterInfo(null);
    setErrorMessage('');

    // If biller has exactly 1 item, auto-select it and go to details
    if (biller.items.length === 1) {
      setSelectedItem(biller.items[0]);
      setStep('enter-details');
    } else if (biller.items.length > 1) {
      setStep('select-item');
    } else {
      setErrorMessage('No meter types available for this provider.');
    }
  };

  const handleItemSelect = (item: BillerItem) => {
    setSelectedItem(item);
    setMeterInfo(null);
    setErrorMessage('');
    setStep('enter-details');
  };

  const validateMeter = async () => {
    if (!meterNumber || meterNumber.length < 10) {
      setErrorMessage('Please enter a valid meter number (at least 10 digits)');
      return;
    }
    if (!selectedItem) {
      setErrorMessage('Please select a meter type first');
      return;
    }

    setValidatingMeter(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/utilities/validate-meter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: selectedItem.itemCode,
          meterNumber,
          billerCode: selectedBiller?.billerCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMeterInfo(data.meterInfo);
        localStorage.setItem('musa_saved_meter', meterNumber);
        if (phoneNumber) localStorage.setItem('musa_saved_phone', phoneNumber);
      } else {
        setErrorMessage(data.message || 'Unable to validate meter number');
      }
    } catch (error) {
      console.error('Meter validation error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setValidatingMeter(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!amount || parseFloat(amount) < 500) {
      setErrorMessage('Minimum purchase amount is ₦500');
      return;
    }
    
    // Validate Nigerian phone number format (080XXXXXXXX or +234XXXXXXXXXX)
    const phoneRegex = /^(\+234|0)[789]\d{9}$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setErrorMessage('Please enter a valid Nigerian phone number (e.g., 08012345678)');
      return;
    }
    
    setErrorMessage('');
    setStep('confirm');
  };

  const processPurchase = async () => {
    setStep('processing');
    setErrorMessage('');

    try {
      const response = await fetch('/api/utilities/purchase-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.uid,
          itemCode: selectedItem?.itemCode,
          billerCode: selectedBiller?.billerCode,
          meterNumber,
          amount: parseFloat(amount),
          phoneNumber,
          email: currentUser?.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTransactionRef(data.reference);
        setPurchaseToken(data.token || null);
        setStep('success');
      } else {
        setErrorMessage(data.message || 'Transaction failed. Please try again.');
        setStep('error');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
      setStep('error');
    }
  };

  const resetForm = () => {
    setStep('select-disco');
    setSelectedBiller(null);
    setSelectedItem(null);
    setAmount('');
    setMeterInfo(null);
    setErrorMessage('');
    setTransactionRef('');
    setPurchaseToken(null);
  };

  const goBack = () => {
    if (step === 'enter-details') {
      if (selectedBiller && selectedBiller.items.length > 1) {
        setStep('select-item');
      } else {
        setStep('select-disco');
      }
      setMeterInfo(null);
      setErrorMessage('');
    } else if (step === 'select-item') {
      setStep('select-disco');
    } else if (step === 'confirm') {
      setStep('enter-details');
    } else {
      router.back();
    }
  };

  // --- Loading / Auth guard ---

  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md flex flex-col items-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading electricity providers...</p>
      </div>
    );
  }

  // --- Render ---

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goBack}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span className="font-medium text-sm">Back</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Utilities</h1>
        <div className="w-16" />
      </div>

      {/* Select DisCo */}
      {step === 'select-disco' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <BoltIcon className="w-8 h-8 text-primary" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Buy Electricity</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Purchase prepaid or postpaid electricity for your meter
            </p>
          </div>

          {billersError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{billersError}</p>
              <button
                onClick={fetchBillers}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {billersLoading ? (
            <div className="flex flex-col items-center py-8">
              <LoadingSpinner />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Fetching providers...</p>
            </div>
          ) : billers.length === 0 && !billersError ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No electricity providers available at the moment.</p>
              <button
                onClick={fetchBillers}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Select Your Distribution Company
              </h3>

              <div className="space-y-2">
                {billers.map((biller) => (
                  <button
                    key={biller.billerCode}
                    onClick={() => handleBillerSelect(biller)}
                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <BoltIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800 dark:text-white">{biller.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {biller.items.length} option{biller.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Select Meter Type / Item */}
      {step === 'select-item' && selectedBiller && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Provider</p>
            <p className="font-semibold text-gray-800 dark:text-white">{selectedBiller.name}</p>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Select Meter Type
          </h3>

          <div className="space-y-2">
            {selectedBiller.items.map((item) => (
              <button
                key={item.itemCode}
                onClick={() => handleItemSelect(item)}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-800 dark:text-white">{item.name}</p>
                  {item.fee > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Service fee: ₦{item.fee}
                    </p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enter Details */}
      {step === 'enter-details' && selectedBiller && selectedItem && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Provider</p>
            <p className="font-semibold text-gray-800 dark:text-white">{selectedBiller.name}</p>
            <p className="text-xs text-primary mt-0.5">{selectedItem.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meter Number
            </label>
            <input
              type="text"
              value={meterNumber}
              onChange={(e) => {
                // Only allow numeric input
                const value = e.target.value.replace(/\D/g, '');
                setMeterNumber(value);
              }}
              placeholder="Enter your meter number"
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Numbers only, 10-20 digits</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent negative values
                if (value === '' || parseFloat(value) >= 0) {
                  setAmount(value);
                }
              }}
              placeholder="Minimum ₦500"
              min="500"
              step="100"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum: ₦500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="08012345678"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {!meterInfo ? (
            <button
              onClick={validateMeter}
              disabled={validatingMeter || !meterNumber}
              className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {validatingMeter ? 'Validating...' : 'Validate Meter'}
            </button>
          ) : (
            <>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">Meter Validated</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {meterInfo.customerName}
                    </p>
                    {meterInfo.address && meterInfo.address !== 'N/A' && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                        {meterInfo.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!amount || !phoneNumber}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Proceed to Payment
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirm */}
      {step === 'confirm' && selectedBiller && selectedItem && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Confirm Purchase</h2>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Provider</span>
              <span className="font-medium text-gray-800 dark:text-white text-right max-w-[60%] truncate">
                {selectedBiller.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Type</span>
              <span className="font-medium text-gray-800 dark:text-white text-right max-w-[60%] truncate">
                {selectedItem.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Customer</span>
              <span className="font-medium text-gray-800 dark:text-white">{meterInfo?.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Meter Number</span>
              <span className="font-medium text-gray-800 dark:text-white">{meterNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Phone</span>
              <span className="font-medium text-gray-800 dark:text-white">{phoneNumber}</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-800 dark:text-white">Amount</span>
                <span className="text-2xl font-bold text-primary">₦{parseFloat(amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={processPurchase}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-all"
          >
            Confirm & Pay
          </button>

          <button
            onClick={() => setStep('enter-details')}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Edit Details
          </button>
        </div>
      )}

      {/* Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Processing your purchase...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please do not close this page</p>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-8">
            <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Purchase Successful!</h2>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {purchaseToken
                ? 'Your electricity token is ready.'
                : 'Your meter will be credited shortly.'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2 border border-gray-200 dark:border-gray-700">
            {purchaseToken && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600 dark:text-gray-400">Token</span>
                <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400 text-right max-w-[65%] break-all">
                  {purchaseToken}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reference</span>
              <span className="font-mono text-xs text-gray-800 dark:text-white text-right max-w-[65%] break-all">
                {transactionRef}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount</span>
              <span className="font-medium text-gray-800 dark:text-white">₦{parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Meter</span>
              <span className="font-medium text-gray-800 dark:text-white">{meterNumber}</span>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-all"
          >
            Make Another Purchase
          </button>
        </div>
      )}

      {/* Error */}
      {step === 'error' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center py-8">
            <XCircleIcon className="w-20 h-20 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Transaction Failed</h2>
            <p className="text-gray-600 dark:text-gray-300 text-center">
              {errorMessage || 'Something went wrong. Please try again.'}
            </p>
          </div>

          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-all"
          >
            Try Again
          </button>

          <button
            onClick={resetForm}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
