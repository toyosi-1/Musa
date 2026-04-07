import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function PWATestPage() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const isAppInstalled = () => {
      // For iOS
      const isIos = () => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
      };

      // For iOS
      const isInStandaloneMode = () => 
        ('standalone' in window.navigator) && ((window.navigator as any).standalone);

      // For other platforms
      const isInWebApp = window.matchMedia('(display-mode: standalone)').matches;

      return isIos() ? isInStandaloneMode() : isInWebApp;
    };

    setIsInstalled(isAppInstalled());

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle appinstalled event
    const handleAppInstalled = () => {
      console.log('App was installed');
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.error('No deferred prompt available');
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // Clear the deferredPrompt variable
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Error during installation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <Head>
        <title>PWA Test - Musa</title>
        <meta name="description" content="Test PWA installation" />
      </Head>

      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">PWA Installation Test</h1>
        
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h2 className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-2">PWA Status</h2>
            <div className="space-y-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Installable:</span>{' '}
                <span className={isInstallable ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  {isInstallable ? 'Yes' : 'No'}
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Installed:</span>{' '}
                <span className={isInstalled ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                  {isInstalled ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
          </div>

          {isInstallable && !isInstalled && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">Installation Available</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                You can install this app on your device for a better experience.
              </p>
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ArrowDownTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                Install App
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h2 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">App Installed</h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Thank you for installing the app! You can now use it offline.
              </p>
            </div>
          )}

          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">PWA Features</h2>
            <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>Works offline</li>
              <li>Fast loading times</li>
              <li>Add to home screen</li>
              <li>Full-screen experience</li>
              <li>Push notifications</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
