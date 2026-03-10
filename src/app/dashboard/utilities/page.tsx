"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, BoltIcon, CheckCircleIcon, XCircleIcon, BookmarkIcon, TrashIcon } from '@heroicons/react/24/solid';
import { getFirebaseDatabase } from '@/lib/firebase';
import { ref, get, set, push, remove } from 'firebase/database';
import { getDiscoBrand } from '@/utils/discoLogos';

declare global {
  interface Window {
    FlutterwaveCheckout: (config: any) => { close: () => void };
  }
}

const FLW_PUBLIC_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';

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

interface SavedMeter {
  id: string;
  billerCode: string;
  billerName: string;
  itemCode: string;
  itemName: string;
  meterNumber: string;
  customerName: string;
  savedAt: number;
}

type PurchaseStep = 'loading' | 'select-disco' | 'select-item' | 'enter-details' | 'confirm' | 'paying' | 'processing' | 'success' | 'error';

function useFlutterwaveScript() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.FlutterwaveCheckout === 'function') {
      setLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

export default function UtilitiesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const flwReady = useFlutterwaveScript();

  // Billers fetched from Flutterwave via our API
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billersLoading, setBillersLoading] = useState(true);
  const [billersError, setBillersError] = useState('');
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [serviceMessage, setServiceMessage] = useState('');

  // Selection state
  const [step, setStep] = useState<PurchaseStep>('loading');
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [selectedItem, setSelectedItem] = useState<BillerItem | null>(null);

  // Saved meters
  const [savedMeters, setSavedMeters] = useState<SavedMeter[]>([]);
  const [savedMetersLoading, setSavedMetersLoading] = useState(true);

  // Form state
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [validatingMeter, setValidatingMeter] = useState(false);
  const [meterInfo, setMeterInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [purchaseToken, setPurchaseToken] = useState<string | null>(null);
  const [saveMeterChecked, setSaveMeterChecked] = useState(true);
  const paymentInProgress = useRef(false);

  // Check if bill payment service is available before letting users pay
  const checkServiceHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/utilities/health-check');
      const data = await res.json();
      setServiceAvailable(data.available);
      if (!data.available) {
        setServiceMessage(data.reason || 'Electricity purchase is temporarily unavailable.');
      }
    } catch {
      // If health check fails, allow users to proceed (don't block on network error)
      setServiceAvailable(true);
    }
  }, []);

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

  // Fetch saved meters from Firebase
  const fetchSavedMeters = useCallback(async () => {
    if (!currentUser?.uid) { setSavedMetersLoading(false); return; }
    setSavedMetersLoading(true);
    try {
      const db = await getFirebaseDatabase();
      const metersRef = ref(db, `users/${currentUser.uid}/savedMeters`);
      const snapshot = await get(metersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const meters: SavedMeter[] = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        meters.sort((a, b) => b.savedAt - a.savedAt);
        setSavedMeters(meters);
      } else {
        setSavedMeters([]);
      }
    } catch (err) {
      console.error('Failed to load saved meters:', err);
    } finally {
      setSavedMetersLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => { fetchBillers(); checkServiceHealth(); }, [fetchBillers, checkServiceHealth]);
  useEffect(() => { fetchSavedMeters(); }, [fetchSavedMeters]);

  useEffect(() => {
    const savedPhone = localStorage.getItem('musa_saved_phone');
    if (savedPhone) setPhoneNumber(savedPhone);
  }, []);

  const saveMeterToFirebase = async () => {
    if (!currentUser?.uid || !selectedBiller || !selectedItem || !meterNumber || !meterInfo) return;
    try {
      const db = await getFirebaseDatabase();
      const metersRef = ref(db, `users/${currentUser.uid}/savedMeters`);
      const newRef = push(metersRef);
      await set(newRef, {
        billerCode: selectedBiller.billerCode,
        billerName: selectedBiller.name,
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.name,
        meterNumber,
        customerName: meterInfo.customerName || 'Customer',
        savedAt: Date.now(),
      });
      fetchSavedMeters();
    } catch (err) {
      console.error('Failed to save meter:', err);
    }
  };

  const deleteSavedMeter = async (meterId: string) => {
    if (!currentUser?.uid) return;
    try {
      const db = await getFirebaseDatabase();
      await remove(ref(db, `users/${currentUser.uid}/savedMeters/${meterId}`));
      setSavedMeters((prev) => prev.filter((m) => m.id !== meterId));
    } catch (err) {
      console.error('Failed to delete saved meter:', err);
    }
  };

  // --- Handlers ---

  const handleSavedMeterSelect = (meter: SavedMeter) => {
    const biller = billers.find((b) => b.billerCode === meter.billerCode);
    if (biller) {
      setSelectedBiller(biller);
      const item = biller.items.find((i) => i.itemCode === meter.itemCode);
      setSelectedItem(item || biller.items[0] || null);
    } else {
      setSelectedBiller({
        id: meter.billerCode, name: meter.billerName, shortName: meter.billerName,
        billerCode: meter.billerCode,
        items: [{ itemCode: meter.itemCode, name: meter.itemName, amount: 0, fee: 100 }],
      });
      setSelectedItem({ itemCode: meter.itemCode, name: meter.itemName, amount: 0, fee: 100 });
    }
    setMeterNumber(meter.meterNumber);
    setMeterInfo({ customerName: meter.customerName });
    setErrorMessage('');
    setStep('enter-details');
  };

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

  const handleProceedToConfirm = () => {
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

  const initiatePayment = () => {
    if (paymentInProgress.current) return;
    if (serviceAvailable === false) {
      setErrorMessage('Electricity purchase is currently unavailable. ' + (serviceMessage || 'Please try again later.'));
      return;
    }
    if (!flwReady || typeof window.FlutterwaveCheckout !== 'function') {
      setErrorMessage('Payment system is loading. Please wait a moment and try again.');
      return;
    }
    if (!FLW_PUBLIC_KEY) {
      setErrorMessage('Payment not configured. Please contact support.');
      return;
    }

    paymentInProgress.current = true;
    setStep('paying');
    setErrorMessage('');

    const txRef = `MUSA-PWR-${Date.now()}-${currentUser?.uid?.substring(0, 8) || 'anon'}`;
    const totalAmount = parseFloat(amount);

    window.FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref: txRef,
      amount: totalAmount,
      currency: 'NGN',
      payment_options: 'card,banktransfer,ussd',
      customer: {
        email: currentUser?.email || 'customer@musa-security.com',
        phone_number: phoneNumber,
        name: currentUser?.displayName || meterInfo?.customerName || 'Musa User',
      },
      customizations: {
        title: 'Musa Electricity',
        description: `${selectedBiller?.name} - Meter: ${meterNumber}`,
        logo: 'https://www.musa-security.com/images/icon-192x192.png',
      },
      callback: async (response: any) => {
        console.log('Flutterwave payment callback:', response);
        if (response.status === 'successful' || response.status === 'completed') {
          setStep('processing');
          try {
            const res = await fetch('/api/utilities/complete-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId: response.transaction_id,
                itemCode: selectedItem?.itemCode,
                billerCode: selectedBiller?.billerCode,
                meterNumber,
                amount: totalAmount,
                phoneNumber,
                email: currentUser?.email,
              }),
            });
            const data = await res.json();
            if (data.success) {
              setTransactionRef(data.reference || txRef);
              setPurchaseToken(data.token || null);
              if (saveMeterChecked && meterInfo) {
                const alreadySaved = savedMeters.some(
                  (m) => m.meterNumber === meterNumber && m.itemCode === selectedItem?.itemCode
                );
                if (!alreadySaved) saveMeterToFirebase();
              }
              setStep('success');
            } else {
              setErrorMessage(data.message || 'Electricity purchase failed after payment. Contact support.');
              setStep('error');
            }
          } catch (err) {
            console.error('Complete purchase error:', err);
            setErrorMessage('Network error after payment. Your payment was received — contact support if meter is not credited.');
            setStep('error');
          }
        } else {
          setErrorMessage('Payment was not completed.');
          setStep('error');
        }
        paymentInProgress.current = false;
      },
      onclose: () => {
        if (paymentInProgress.current) {
          paymentInProgress.current = false;
          setStep('confirm');
        }
      },
    });
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 mb-6 shadow-md">
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Utilities</h1>
            <p className="text-xs text-white/60 mt-0.5">Buy electricity & pay bills</p>
          </div>
        </div>
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-sm" />
        <div className="absolute right-8 -bottom-6 w-20 h-20 bg-white/5 rounded-full" />
      </div>

      {/* Service unavailable banner */}
      {serviceAvailable === false && (
        <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 px-5 py-4 rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5 text-red-500" />
            <div>
              <p className="font-semibold">Electricity Purchase Unavailable</p>
              <p className="text-sm mt-1">{serviceMessage || 'This service is temporarily unavailable. Please try again later.'}</p>
            </div>
          </div>
        </div>
      )}

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

          {/* Saved Meters — quick reorder */}
          {savedMeters.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <BookmarkIcon className="w-4 h-4 text-primary" />
                Saved Meters
              </h3>
              <div className="space-y-2">
                {savedMeters.map((meter) => (
                  <div
                    key={meter.id}
                    className="flex items-center gap-2"
                  >
                    <button
                      onClick={() => handleSavedMeterSelect(meter)}
                      className="flex-1 flex items-center justify-between p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20 dark:border-primary/30 hover:border-primary transition-all"
                    >
                      <div className="text-left">
                        <p className="font-medium text-sm text-gray-800 dark:text-white">{meter.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {meter.billerName} &middot; {meter.meterNumber}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteSavedMeter(meter.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove saved meter"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-b border-gray-200 dark:border-gray-700 mt-4 mb-2" />
            </div>
          )}

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
                {billers.map((biller) => {
                  const brand = getDiscoBrand(biller.billerCode, biller.name);
                  return (
                    <button
                      key={biller.billerCode}
                      onClick={() => handleBillerSelect(biller)}
                      className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0"
                          style={{ backgroundColor: brand.color, color: brand.textColor }}
                        >
                          {brand.abbr}
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
                  );
                })}
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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveMeterChecked}
                  onChange={(e) => setSaveMeterChecked(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Save this meter for quick access next time</span>
              </label>

              <button
                onClick={handleProceedToConfirm}
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
            onClick={initiatePayment}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-600 transition-all"
          >
            Pay Now — ₦{parseFloat(amount).toLocaleString()}
          </button>

          <button
            onClick={() => setStep('enter-details')}
            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Edit Details
          </button>
        </div>
      )}

      {/* Paying — Flutterwave popup is open */}
      {step === 'paying' && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Complete payment in the popup</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Use your card, bank transfer, or USSD to pay</p>
        </div>
      )}

      {/* Processing — verifying payment & purchasing electricity */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Payment received! Purchasing electricity...</p>
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
