interface BiometricLoginButtonProps {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function BiometricLoginButton({ loading, disabled, onClick }: BiometricLoginButtonProps) {
  return (
    <div className="mt-3">
      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-white/10 w-full" />
        <span className="px-3 text-xs text-gray-500 bg-transparent absolute">or</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        className="w-full h-12 rounded-xl font-medium border border-white/15 bg-white/[0.06] text-gray-300 hover:border-blue-500/50 hover:text-white transition-all flex items-center justify-center gap-2.5 text-sm"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            Sign in with Face ID / Fingerprint
          </>
        )}
      </button>
    </div>
  );
}
