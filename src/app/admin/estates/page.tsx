"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusGuard from '@/components/auth/StatusGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { Estate } from '@/types/user';
import { listEstates, createEstate } from '@/services/estateService';

export default function AdminEstatesPage() {
  const { currentUser, loading } = useAuth();
  const [estates, setEstates] = useState<Estate[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      const items = await listEstates();
      setEstates(items);
    } catch (e) {
      console.error(e);
      setError('Failed to load estates');
    }
  };

  useEffect(() => {
    if (!loading && currentUser?.role === 'admin') {
      load();
    }
  }, [loading, currentUser]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setBusy(true);
      await createEstate(name.trim());
      setName('');
      await load();
    } catch (e) {
      console.error(e);
      setError('Failed to create estate');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !currentUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <StatusGuard requireStatus="approved" requireAdmin={true}>
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Estates</h1>
          <Link href="/admin/dashboard" className="btn-outline">Back</Link>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Create Estate</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                className="input w-full"
                placeholder="Estate name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
              />
              <button className="btn-primary" disabled={busy || !name.trim()}>
                {busy ? 'Creating...' : 'Create'}
              </button>
            </form>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Estates</h2>
              <button className="btn-outline text-sm" onClick={load}>Refresh</button>
            </div>
            {estates.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">No estates yet.</p>
            ) : (
              <ul className="space-y-2">
                {estates.map((e) => (
                  <li key={e.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2">
                    <span className="text-gray-800 dark:text-white">{e.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">ID: {e.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </StatusGuard>
  );
}
