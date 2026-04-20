import type { UseFormRegisterReturn } from 'react-hook-form';

interface RoleSelectorProps {
  /** Currently selected role (from `watch('role')`). */
  selected: string | undefined;
  register: UseFormRegisterReturn;
  disabled?: boolean;
  errorMessage?: string;
}

/**
 * Two-up radio cards for picking Resident vs Guard during registration.
 * Admin/estate_admin roles are created by other admins, not self-registered.
 */
export function RoleSelector({ selected, register, disabled, errorMessage }: RoleSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">I am a:</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input type="radio" id="resident" value="resident" {...register} className="sr-only" disabled={disabled} />
          <label
            htmlFor="resident"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selected === 'resident'
                ? 'bg-blue-500/15 border-blue-500 text-white'
                : 'bg-white/[0.05] border-white/10 text-gray-400 hover:border-white/25'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selected === 'resident' ? 'bg-blue-500/30' : 'bg-white/5'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Resident</span>
          </label>
        </div>
        <div>
          <input type="radio" id="guard" value="guard" {...register} className="sr-only" disabled={disabled} />
          <label
            htmlFor="guard"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selected === 'guard'
                ? 'bg-green-500/15 border-green-500 text-white'
                : 'bg-white/[0.05] border-white/10 text-gray-400 hover:border-white/25'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selected === 'guard' ? 'bg-green-500/30' : 'bg-white/5'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0117.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Guard</span>
          </label>
        </div>
      </div>
      {errorMessage && <p className="text-red-400 text-xs mt-1.5">{errorMessage}</p>}
    </div>
  );
}
