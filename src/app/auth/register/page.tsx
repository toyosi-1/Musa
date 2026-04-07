import AuthForm from '@/components/auth/AuthForm';
import Link from 'next/link';
import { UserRole } from '@/types/user';

export function generateStaticParams() {
  return [{ role: 'resident' }, { role: 'guard' }, { role: 'default' }];
}

export const dynamicParams = true;

function isUserRole(role: string | undefined): role is UserRole {
  return role === 'resident' || role === 'guard';
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const roleParam = searchParams.role;
  const roleValue = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  const defaultRole: UserRole = isUserRole(roleValue) ? roleValue : 'resident';
  const isGuard = defaultRole === 'guard';

  return (
    <div
      className="min-h-screen flex flex-col bg-[#080d1a] relative overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Background glow effects */}
      <div className="absolute -top-24 right-[-40px] w-80 h-80 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-[-40px] w-72 h-72 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Top navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <Link href="/auth/login" className="text-sm text-gray-400">
          Have an account?{' '}
          <span className="text-blue-400 font-semibold">Sign in</span>
        </Link>
      </nav>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-6 pb-12">
        {/* Role badge */}
        <div className={`inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full border ${
          isGuard
            ? 'bg-green-500/10 border-green-500/25'
            : 'bg-blue-500/10 border-blue-500/25'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isGuard ? 'bg-green-400' : 'bg-blue-400'}`} />
          <span className={`text-xs font-semibold tracking-wide ${isGuard ? 'text-green-400' : 'text-blue-400'}`}>
            {isGuard ? 'SECURITY GUARD' : 'RESIDENT'}
          </span>
        </div>

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-[2rem] font-extrabold text-white tracking-tight leading-tight mb-2">
            {isGuard ? 'Join as Guard' : 'Create Account'}
          </h1>
          <p className="text-gray-400 text-[15px] leading-relaxed">
            {isGuard
              ? 'Register to help manage estate access and security.'
              : 'Register to manage access codes for your household.'}
          </p>
        </div>

        {/* Form card */}
        <div className="relative bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <AuthForm mode="register" defaultRole={defaultRole} />
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-gray-600 text-xs mt-6 leading-relaxed px-4">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
