"use client";

import { useEffect, useState } from 'react';

export default function EnvDebug() {
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // Collect all NEXT_PUBLIC environment variables
    const vars: Record<string, string> = {};
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('NEXT_PUBLIC_')) {
        vars[key] = process.env[key] || 'undefined';
      }
    });
    setEnvVars(vars);
  }, []);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg my-4 text-sm font-mono">
      <h3 className="font-bold mb-2">Environment Variables Debug</h3>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(envVars, null, 2)}
      </pre>
    </div>
  );
}
