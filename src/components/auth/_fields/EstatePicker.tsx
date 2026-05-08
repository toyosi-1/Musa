import type { UseFormRegisterReturn } from 'react-hook-form';
import type { Estate } from '@/types/estate';

interface EstatePickerProps {
  estates: Estate[];
  register: UseFormRegisterReturn;
  disabled?: boolean;
  errorMessage?: string;
}

/**
 * Estate dropdown for registration. Renders a loading hint while the estates
 * list is still empty (e.g. still fetching on cold start).
 */
export function EstatePicker({ estates, register, disabled, errorMessage }: EstatePickerProps) {
  return (
    <div>
      <label htmlFor="estateId" className="block text-sm font-medium text-gray-300 mb-1.5">
        Select Your Estate <span className="text-red-400">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <select
          id="estateId"
          {...register}
          className="w-full h-12 pl-10 pr-10 rounded-xl bg-white/[0.08] border border-white/15 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm appearance-none"
          style={{ colorScheme: 'dark', WebkitAppearance: 'none', MozAppearance: 'none' }}
          disabled={disabled || estates.length === 0}
        >
          <option value="" className="bg-[#1a2035] text-gray-400">Choose your estate...</option>
          {estates.map((estate) => (
            <option key={estate.id} value={estate.id} className="bg-[#1a2035] text-white">
              {estate.name}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {errorMessage && <p className="text-red-400 text-xs mt-1.5">{errorMessage}</p>}
      {estates.length === 0 && (
        <p className="text-amber-400/80 text-xs mt-1.5">Loading estates...</p>
      )}
    </div>
  );
}
