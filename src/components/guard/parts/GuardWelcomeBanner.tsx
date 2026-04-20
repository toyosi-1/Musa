import { ShieldCheckIcon } from '@heroicons/react/24/solid';

interface GuardWelcomeBannerProps {
  /** First name (or "Guard" fallback) shown in the banner. */
  firstName: string;
  /** Estate name — falls back to "Estate Security" when not yet loaded. */
  estateName: string | undefined;
  /** Dot colour reflects live network state. */
  online: boolean;
  /** Count for the "X checks today" pill. */
  todayVerifications: number;
}

/**
 * Top-of-screen gradient banner that greets the guard and shows their daily
 * check counter alongside a live connection dot.
 */
export function GuardWelcomeBanner({
  firstName,
  estateName,
  online,
  todayVerifications,
}: GuardWelcomeBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 shadow-lg">
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
      <div className="absolute left-1/3 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_60%)]" />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/70 mb-0.5">
              {estateName || 'Estate Security'}
            </p>
            <h1 className="text-2xl font-bold text-white">{firstName}</h1>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="px-3 py-1 rounded-full bg-white/15 text-xs font-medium text-white flex items-center gap-1.5">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                online ? 'bg-emerald-300' : 'bg-amber-400 animate-pulse'
              }`}
            />
            {todayVerifications} checks today
          </div>
        </div>
      </div>
    </div>
  );
}
