import Link from 'next/link';
import LogoAnimation from '@/components/ui/illustrations/LogoAnimation';
import SessionRedirect from '@/components/auth/SessionRedirect';

export default function Home() {
  return (
    <main id="home-landing" className="min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300">
      <SessionRedirect />

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Musa
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="px-5 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Sign In
            </Link>
            <Link href="/auth/register" className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950/30" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-400/10 to-transparent rounded-full blur-3xl" />

        <div className="relative container mx-auto px-5 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2 space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 text-sm text-blue-700 dark:text-blue-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Trusted by estates across Nigeria
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-extrabold leading-[1.1] tracking-tight text-gray-900 dark:text-white">
              Modern Estate{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Access Control
              </span>
            </h1>

            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg mx-auto md:mx-0 leading-relaxed">
              Seamless, fast, and secure. Generate QR codes, verify visitors instantly, and manage your household — all from one app.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center md:justify-start">
              <Link
                href="/auth/register?role=resident"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
                Register as Resident
              </Link>
              <Link
                href="/auth/register?role=guard"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[15px] font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Register as Guard
              </Link>
            </div>
          </div>

          {/* Character / Logo */}
          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl scale-90" />
              <div className="relative">
                <LogoAnimation />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative py-20 px-5 bg-gray-50/80 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold tracking-widest uppercase text-blue-600 dark:text-blue-400 mb-2">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">How It Works</h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">Simple, fast and secure estate access management for everyone.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Residents */}
            <div className="group bg-white dark:bg-gray-800/80 rounded-2xl p-7 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">For Residents</h3>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Generate private QR or text-based access codes to share with guests. Manage your household members with ease.
              </p>
            </div>

            {/* Guards */}
            <div className="group bg-white dark:bg-gray-800/80 rounded-2xl p-7 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">For Guards</h3>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Scan or enter access codes for instant verification. Green/red indicators for fast, reliable access control.
              </p>
            </div>

            {/* Privacy */}
            <div className="group bg-white dark:bg-gray-800/80 rounded-2xl p-7 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-800 hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform duration-300">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Privacy-First</h3>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Guards verify access without seeing who codes belong to. Family heads cannot see members' private codes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ─── */}
      <section className="py-12 px-5 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          <div>
            <div className="text-3xl md:text-4xl font-extrabold">QR</div>
            <div className="text-sm text-blue-100 mt-1">Instant Scan</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold">24/7</div>
            <div className="text-sm text-blue-100 mt-1">Always On</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold">SOS</div>
            <div className="text-sm text-blue-100 mt-1">Emergency Alerts</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-extrabold">&lt;1s</div>
            <div className="text-sm text-blue-100 mt-1">Verification Speed</div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-10 border-t border-gray-800">
        <div className="container mx-auto px-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <span className="font-bold text-lg">Musa</span>
                <p className="text-xs text-gray-500">Modern Estate Access Control</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Musa Security. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
