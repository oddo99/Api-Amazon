'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SyncButtonProps {
  accountId: string;
  sellingPartnerId?: string | null;
}

type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

interface SyncJob {
  id: string;
  jobType: string;
  status: string;
  recordsProcessed: number;
  error?: string;
  createdAt: string;
}

export default function SyncButton({ accountId, sellingPartnerId }: SyncButtonProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Load initial sync status
  useEffect(() => {
    if (accountId && accountId.trim() !== '') {
      loadSyncStatus();
    }
  }, [accountId]);

  // Poll for status while syncing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPolling && status === 'syncing') {
      interval = setInterval(() => {
        loadSyncStatus();
      }, 3000); // Poll every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPolling, status, accountId]);

  const loadSyncStatus = async () => {
    try {
      const jobs: SyncJob[] = await api.getSyncStatus(accountId) as SyncJob[];
      setSyncJobs(jobs);

      // Check if any job is currently running
      const hasRunningJob = jobs.some(job => job.status === 'running');
      if (hasRunningJob && status !== 'syncing') {
        setStatus('syncing');
        setIsPolling(true);
      } else if (!hasRunningJob && status === 'syncing') {
        // Sync completed
        const hasFailed = jobs.some(job => job.status === 'failed' && new Date(job.createdAt).getTime() > Date.now() - 60000);
        setStatus(hasFailed ? 'failed' : 'completed');
        setIsPolling(false);

        // Reset to idle after 5 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleSync = async () => {
    setStatus('syncing');
    setError(null);
    setIsPolling(true);

    try {
      await api.triggerSync(
        accountId,
        undefined,
        sellingPartnerId || undefined
      );

      // Start polling for status
      setTimeout(() => {
        loadSyncStatus();
      }, 1000);
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      setError(error.message || 'Errore durante la sincronizzazione');
      setStatus('failed');
      setIsPolling(false);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 5000);
    }
  };

  const getSyncIcon = () => {
    switch (status) {
      case 'syncing':
        return (
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  const getButtonColor = () => {
    switch (status) {
      case 'syncing':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'completed':
        return 'bg-green-600 hover:bg-green-700';
      case 'failed':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-orange-600 hover:bg-orange-700';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'syncing':
        return 'Sincronizzazione...';
      case 'completed':
        return 'Completato';
      case 'failed':
        return 'Errore';
      default:
        return 'Sincronizza';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => handleSync()}
        disabled={status === 'syncing'}
        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${getButtonColor()} ${status === 'syncing' ? 'cursor-wait' : ''}`}
        title={error || undefined}
      >
        {getSyncIcon()}
        <span className="text-sm font-medium">{getButtonText()}</span>
      </button>

      {error && status === 'failed' && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 shadow-lg z-30">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
