'use client';

import { useEffect, useState } from 'react';

export default function TestEnvPage() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    // Client-side environment variables
    const env = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? 'SET' : 'MISSING',
    };
    setEnvVars(env);
    
    console.log('Environment Variables:', env);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Environment Variables Test</h1>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="font-semibold text-blue-800 mb-2">Process Environment (Server-side)</h2>
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-2 bg-white rounded text-sm">
                  <code className="font-mono">{key}</code>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    value === 'MISSING' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {value === 'MISSING' ? 'MISSING' : 'SET'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h2 className="font-semibold text-purple-800 mb-2">Window Environment (Client-side)</h2>
              {typeof window !== 'undefined' ? (
                Object.entries(envVars).map(([key]) => {
                  const value = (window as any).ENV?.[key];
                  const isSet = !!value;
                  return (
                    <div key={key} className="flex justify-between items-center p-2 bg-white rounded text-sm">
                      <code className="font-mono">{key}</code>
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium mb-1 ${
                          isSet ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isSet ? 'SET' : 'MISSING'}
                        </span>
                        {isSet && (
                          <span className="text-xs text-gray-500 font-mono truncate max-w-xs">
                            {value.length > 30 ? `${value.substring(0, 30)}...` : value}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">
                  Window object not available (running on server)
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <h3 className="font-semibold text-yellow-800 mb-2">Troubleshooting</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-yellow-700">
            <li>Check that <code className="bg-yellow-100 px-1 rounded">.env.local</code> exists in your project root</li>
            <li>Verify the file contains all required Firebase configuration variables</li>
            <li>Restart your Next.js development server after making changes to <code className="bg-yellow-100 px-1 rounded">.env.local</code></li>
            <li>Check the browser console for any error messages (press F12 to open developer tools)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
