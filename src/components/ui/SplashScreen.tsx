import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 1000); // Show splash screen for 1 second

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-musa-bg dark:bg-gray-900 transition-opacity duration-500">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4">
          {/* Replace with your app logo */}
          <div className="w-full h-full rounded-full bg-musa-blue dark:bg-blue-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
        </div>
        <LoadingSpinner size="lg" />
      </div>
    </div>
  );
}
