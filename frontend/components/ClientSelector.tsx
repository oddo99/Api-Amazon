'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Client {
  id: string;
  sellingPartnerId: string;
  sellerName: string | null;
  marketplaceId: string;
  isActive: boolean;
}

interface ClientSelectorProps {
  accountId: string;
  onClientChange: (sellingPartnerId: string | null) => void;
  selectedClient: string | null;
}

export default function ClientSelector({
  accountId,
  onClientChange,
  selectedClient,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isSolutionProvider, setIsSolutionProvider] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load clients if we have a valid accountId
    if (accountId && accountId.trim() !== '') {
      loadClients();
    }
  }, [accountId]);

  const loadClients = async () => {
    // Extra validation
    if (!accountId || accountId.trim() === '') {
      setLoading(false);
      return;
    }

    try {
      const response = await api.getClients(accountId) as { isSolutionProvider: boolean; clients?: any[] };

      if (response.isSolutionProvider) {
        setIsSolutionProvider(true);
        setClients(response.clients || []);
      } else {
        setIsSolutionProvider(false);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading clients:', error);
      setIsSolutionProvider(false);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>;
  }

  if (!isSolutionProvider) {
    // Not a Solution Provider - don't show selector
    return null;
  }

  if (clients.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No clients found. Add clients to view their data.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="client-selector" className="text-sm font-medium text-gray-700 dark:text-gray-300">
        View Client:
      </label>
      <select
        id="client-selector"
        value={selectedClient || ''}
        onChange={(e) => onClientChange(e.target.value || null)}
        className="px-3 py-2 border  border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        <option value="">All Clients</option>
        {clients.map((client) => (
          <option key={client.id} value={client.sellingPartnerId}>
            {client.sellerName || client.sellingPartnerId}
          </option>
        ))}
      </select>
    </div>
  );
}
