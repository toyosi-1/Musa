import Link from 'next/link';
import HeroIllustration from '@/components/ui/illustrations/HeroIllustration';
import MusaCharacterSVG from '@/components/ui/illustrations/MusaCharacterSVG';
import SessionRedirect from '@/components/auth/SessionRedirect';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#06080f] text-white overflow-x-hidden">
      <SessionRedirect />

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080f]/80 border-b border-white/[0.06]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="container mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-900/50 to-orange-900/30 border border-amber-700/30 flex items-center justify-center overflow-hidden">
              <MusaCharacterSVG size={26} animated={false} />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Musa</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/register" className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-px transition-all duration-200">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[100px]" />
          <div className="absolute top-[30%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[80px]" />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative container mx-auto px-5 py-20 flex flex-col md:flex-row items-center gap-12 lg:gap-20">
          <div className="md:w-1/2 space-y-7">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-sm text-gray-300 font-medium backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Built for Nigerian estates
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-[4rem] font-extrabold leading-[1.05] tracking-tight">
              Smart Estate
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Access Control
              </span>
            </h1>

            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
              Generate QR codes, verify visitors instantly, and manage estate security — all from your phone. Even offline.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/auth/register?role=resident" className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
                Register as Resident
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
              <Link href="/auth/register?role=guard" className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-gray-300 bg-white/[0.06] border border-white/10 rounded-2xl hover:bg-white/[0.10] hover:border-white/20 transition-all duration-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Register as Guard
              </Link>
            </div>

            <div className="flex items-center gap-5 pt-2 text-sm text-gray-500">
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>End-to-end encrypted</div>
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>Works offline</div>
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3"/></svg>Mobile-first</div>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-3xl blur-2xl" />
              <div className="relative"><HeroIllustration /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pill stats strip ─── */}
      <section className="py-5 px-5 border-y border-white/[0.06]">
        <div className="container mx-auto flex flex-wrap justify-center gap-3">
          {[
            { icon: '📍', text: 'Built for Nigerian estates' },
            { icon: '⚡', text: 'Sub-second verification' },
            { icon: '📱', text: 'Works on any smartphone' },
            { icon: '🔒', text: 'End-to-end encrypted' },
            { icon: '📶', text: 'Offline mode for guards' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Bento Features ─── */}
      <section className="relative py-24 px-5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#06080f] via-[#080c18] to-[#06080f] pointer-events-none" />
        <div className="relative container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold tracking-widest uppercase text-blue-400 mb-4">Features</div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Everything your estate needs
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent"> in one app</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-lg mx-auto">Purpose-built for Nigerian estates. No hardware. No complicated setup.</p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large card - QR Codes */}
            <div className="group sm:col-span-2 lg:col-span-1 relative bg-gradient-to-br from-blue-600/[0.12] to-indigo-600/[0.06] border border-blue-500/20 rounded-3xl p-7 overflow-hidden hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">QR & Text Codes</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Generate shareable QR or text codes for guests. Set expiry times and manage active codes instantly.</p>
            </div>

            {/* Instant Verify */}
            <div className="group relative bg-gradient-to-br from-emerald-600/[0.10] to-teal-600/[0.05] border border-emerald-500/20 rounded-3xl p-7 overflow-hidden hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full -mr-8 -mt-8 blur-xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Instant Verification</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Guards scan or enter codes for sub-second verification with clear green/red feedback.</p>
            </div>

            {/* Privacy */}
            <div className="group relative bg-gradient-to-br from-violet-600/[0.10] to-purple-600/[0.05] border border-violet-500/20 rounded-3xl p-7 overflow-hidden hover:border-violet-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/10 rounded-full -mr-8 -mt-8 blur-xl" />
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mb-5 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Privacy-First</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Guards verify without seeing resident details. Members' codes remain private from each other.</p>
            </div>

            {/* Offline - wide */}
            <div className="group sm:col-span-2 relative bg-gradient-to-br from-amber-600/[0.10] to-orange-600/[0.05] border border-amber-500/20 rounded-3xl p-7 overflow-hidden hover:border-amber-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -mr-10 -mb-10 blur-2xl" />
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform flex-shrink-0">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Works Offline</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">Built for Nigerian networks. Guards can verify codes even without internet — syncs automatically when back online.</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs text-amber-400/70 font-medium">No internet? No problem.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency */}
            <div className="group relative bg-gradient-to-br from-red-600/[0.10] to-rose-600/[0.05] border border-red-500/20 rounded-3xl p-7 overflow-hidden hover:border-red-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mb-5 shadow-lg shadow-red-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Emergency SOS</h3>
              <p className="text-sm text-gray-400 leading-relaxed">One-tap alerts notify all guards and management instantly for rapid response.</p>
            </div>

            {/* Vendor Services */}
            <div className="group relative bg-gradient-to-br from-purple-600/[0.10] to-indigo-600/[0.05] border border-purple-500/20 rounded-3xl p-7 overflow-hidden hover:border-purple-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.26m0 0l-.18-.12a3 3 0 01-.96-3.74l.18-.3a3 3 0 013.74-.96l.18.12m2.14 8.26l5.1-3.26m0 0l.18-.12a3 3 0 00.96-3.74l-.18-.3a3 3 0 00-3.74-.96l-.18.12"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Vendor Services</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Request plumbers, electricians & more. Operators assign vendors, residents track progress.</p>
            </div>

            {/* Household */}
            <div className="group relative bg-gradient-to-br from-cyan-600/[0.10] to-teal-600/[0.05] border border-cyan-500/20 rounded-3xl p-7 overflow-hidden hover:border-cyan-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Household Management</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Invite family members, manage your household, and control access code creation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="py-20 px-5 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4">How it works</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Up and running in minutes</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Register your estate', desc: 'Admin sets up the estate. Residents and guards register with their estate ID.', color: 'from-blue-500 to-indigo-600' },
              { step: '02', title: 'Generate access codes', desc: 'Residents create QR or text codes for their guests with custom expiry times.', color: 'from-indigo-500 to-violet-600' },
              { step: '03', title: 'Guards verify instantly', desc: 'Guards scan or type codes for sub-second verification with clear visual feedback.', color: 'from-violet-500 to-purple-600' },
            ].map((item) => (
              <div key={item.step} className="relative p-6 rounded-3xl bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] transition-colors">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xs font-bold text-white mb-4 shadow-lg`}>{item.step}</div>
                <h3 className="font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-16 px-5 border-t border-white/[0.06]">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'QR', label: 'Instant Scan', icon: '📱' },
              { value: '24/7', label: 'Always On', icon: '⚡' },
              { value: 'SOS', label: 'Emergency Alerts', icon: '🚨' },
              { value: '<1s', label: 'Verify Speed', icon: '⚡' },
            ].map((stat) => (
              <div key={stat.value} className="p-5 rounded-3xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] text-center hover:border-white/20 transition-colors">
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 px-5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="absolute inset-0 border-t border-white/[0.06]" />
        </div>
        <div className="relative container mx-auto max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-5">
            Ready to secure
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">your estate?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">Join estates across Nigeria using Musa for modern, reliable access control. Set up in minutes, no hardware needed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200">
              Get Started Free
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </Link>
            <Link href="/auth/login" className="inline-flex items-center justify-center px-8 py-4 text-sm font-semibold text-gray-300 bg-white/[0.06] border border-white/10 rounded-2xl hover:bg-white/[0.10] transition-all duration-200">Sign In</Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] py-10 px-5">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/30 border border-amber-700/30 flex items-center justify-center overflow-hidden">
                  <MusaCharacterSVG size={24} animated={false} />
                </div>
                <span className="font-bold text-white">Musa</span>
              </div>
              <p className="text-sm text-gray-600 max-w-xs">Modern estate access control built for Nigeria.</p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <Link href="/privacy" className="text-gray-500 hover:text-gray-300 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-gray-500 hover:text-gray-300 transition-colors">Terms</Link>
              <Link href="/auth/login" className="text-gray-500 hover:text-gray-300 transition-colors">Sign In</Link>
              <Link href="/auth/register" className="text-gray-500 hover:text-gray-300 transition-colors">Register</Link>
            </div>
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} Musa Security. All rights reserved.</p>
            <p className="text-xs text-gray-700">Made with care for Nigerian communities 🇳🇬</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
