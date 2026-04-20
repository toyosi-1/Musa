import { forwardRef } from 'react';
import { MapPinIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

/**
 * Minimal household shape used by the verification UI. Kept structural so
 * both the full `Household` and the slimmer `OfflineHousehold` from the
 * offline guard service satisfy it.
 */
export interface VerifyHouseholdSummary {
  id?: string;
  name?: string;
}

export interface VerifyScanResult {
  isValid: boolean;
  message?: string;
  household?: VerifyHouseholdSummary;
  destinationAddress?: string;
}

interface VerifyCodePanelProps {
  manualCode: string;
  isProcessing: boolean;
  scanResult: VerifyScanResult | null;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Left-column panel that hosts the manual code entry form and the
 * success/failure card that appears after verification.
 */
export const VerifyCodePanel = forwardRef<HTMLInputElement, VerifyCodePanelProps>(
  function VerifyCodePanel(
    { manualCode, isProcessing, scanResult, onChange, onSubmit },
    ref,
  ) {
    return (
      <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex-grow flex flex-col">
        <div className="p-5 md:p-8">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Verify Access Code</h2>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Enter or scan a visitor&apos;s code</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 max-w-md mx-auto">
            <div className="relative">
              <input
                ref={ref}
                type="text"
                value={manualCode}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                placeholder="e.g. MUSA1234"
                aria-label="Access code input"
                className="block w-full text-center text-2xl font-bold font-mono tracking-[0.2em] py-5 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 rounded-2xl transition-all duration-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:tracking-[0.15em] placeholder:font-medium placeholder:text-lg"
                disabled={isProcessing}
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={10}
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25"
              disabled={!manualCode || isProcessing}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-5 w-5" />
                  Verify Code
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <a
              href="/dashboard/scan"
              className="w-full py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/25"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan QR Code
            </a>
          </form>
        </div>

        {scanResult && <VerifyResult result={scanResult} />}
      </div>
    );
  },
);

function VerifyResult({ result }: { result: VerifyScanResult }) {
  return (
    <div
      className={`p-8 md:p-10 text-center animate-fade-in transition-all duration-300 ${
        result.isValid
          ? 'bg-success-50 dark:bg-success-900/20 border-t border-success-200 dark:border-success-700'
          : 'bg-danger-50 dark:bg-danger-900/20 border-t border-danger-200 dark:border-danger-700'
      }`}
    >
      <div
        className={`w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center ${
          result.isValid ? 'bg-success text-white' : 'bg-danger text-white'
        }`}
      >
        {result.isValid ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
      </div>
      <h3
        className={`text-2xl font-bold mb-2 ${
          result.isValid
            ? 'text-success-700 dark:text-success-400'
            : 'text-danger-700 dark:text-danger-400'
        }`}
      >
        {result.isValid ? 'Access Granted' : 'Access Denied'}
      </h3>
      {result.message && (
        <p
          className={`mb-2 ${
            result.isValid
              ? 'text-success-600 dark:text-success-300'
              : 'text-danger-600 dark:text-danger-300'
          }`}
        >
          {result.message}
        </p>
      )}

      {result.isValid && result.destinationAddress && (
        <div className="mt-6 pt-5 border-t border-success-200 dark:border-success-700/50 text-left max-w-md mx-auto">
          <div className="flex items-start bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-success-100 dark:border-success-800/30">
            <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center mr-3 mt-1 flex-shrink-0">
              <MapPinIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="font-medium mb-1 text-gray-800 dark:text-white">Going to:</p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {result.destinationAddress}
              </p>
              {result.household?.name && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Resident: {result.household.name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
