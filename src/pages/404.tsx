import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function NotFoundPage() {
  const router = useRouter();

  useEffect(() => {
    // If offline, go to offline page; otherwise auto-redirect to home
    if (!navigator.onLine) {
      router.replace('/offline');
    } else {
      const timer = setTimeout(() => router.replace('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>Redirecting... | Musa</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950 text-white">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">Redirecting you home...</p>
          <div className="w-24 h-1 mx-auto rounded-full bg-gray-800 overflow-hidden">
            <div style={{ animation: 'shrink404 2s linear forwards', width: '100%' }} className="h-full bg-blue-500 rounded-full" />
          </div>
          <a href="/" className="inline-block text-xs text-blue-400 hover:text-blue-300 mt-2">
            Tap here if not redirected
          </a>
        </div>
        <style jsx>{`@keyframes shrink404 { from { width: 100%; } to { width: 0%; } }`}</style>
      </div>
    </>
  );
}
