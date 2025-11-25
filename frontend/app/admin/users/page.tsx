'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { getSellerDisplayName } from '@/lib/accountNames';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  accounts: any[];
}

interface Account {
  id: string;
  sellerId: string;
  marketplaceId: string;
  region: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadData();
    }
  }, [isAuthenticated, isAdmin]);

  const loadData = async () => {
    try {
      const [usersData, accountsData]: any = await Promise.all([
        api.adminGetUsers(),
        api.getAccounts(),
      ]);
      setUsers(usersData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Get selected accounts from checkboxes
    const selectedAccountIds: string[] = [];
    accounts.forEach(account => {
      if (formData.get(`account_${account.id}`) === 'on') {
        selectedAccountIds.push(account.id);
      }
    });

    try {
      await api.adminCreateUser({
        email: formData.get('email') as string,
        name: formData.get('name') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as string,
        accountIds: selectedAccountIds,
      });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Errore nella creazione dell\'utente');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      await api.adminDeleteUser(userId);
      loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Errore nell\'eliminazione dell\'utente');
    }
  };

  const handleGrantAccess = async (accountId: string) => {
    if (!selectedUser) return;

    try {
      await api.adminGrantAccountAccess(selectedUser.id, accountId);
      setShowAccountModal(false);
      loadData();
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Errore nell\'assegnazione dell\'account');
    }
  };

  const handleRevokeAccess = async (userId: string, accountId: string) => {
    if (!confirm('Sei sicuro di voler revocare l\'accesso a questo account?')) return;

    try {
      await api.adminRevokeAccountAccess(userId, accountId);
      loadData();
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Errore nella revoca dell\'accesso');
    }
  };

  if (authLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
              <p className="text-sm text-gray-500 mt-1">
                Crea e gestisci gli utenti della piattaforma
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuovo Utente
            </button>
          </div>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Assegnati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Creazione
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.accounts && u.accounts.length > 0 ? (
                          u.accounts.map((acc) => (
                            <span
                              key={acc.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                            >
                              {getSellerDisplayName(acc.sellerId)}
                              <button
                                onClick={() => handleRevokeAccess(u.id, acc.id)}
                                className="hover:text-blue-900"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">Nessuno</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowAccountModal(true);
                        }}
                        className="text-orange-600 hover:text-orange-900 mr-4"
                      >
                        Assegna Account
                      </button>
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Elimina
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nuovo Utente</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo</label>
                <select
                  name="role"
                  defaultValue="user"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="user">Utente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Amazon</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {accounts.length === 0 ? (
                    <p className="text-sm text-gray-500">Nessun account disponibile</p>
                  ) : (
                    accounts.map((account) => (
                      <label
                        key={account.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name={`account_${account.id}`}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{getSellerDisplayName(account.sellerId)}</div>
                          <div className="text-xs text-gray-500">
                            {account.marketplaceId} - {account.region}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Seleziona gli account che l'utente potrà visualizzare
                </p>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Crea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Account Modal */}
      {showAccountModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Assegna Account a {selectedUser.name}
            </h2>
            <div className="space-y-2">
              {accounts
                .filter((acc) => !selectedUser.accounts?.some((ua) => ua.id === acc.id))
                .map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleGrantAccess(account.id)}
                    className="w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <div className="font-medium">{getSellerDisplayName(account.sellerId)}</div>
                    <div className="text-sm text-gray-500">
                      {account.marketplaceId} - {account.region}
                    </div>
                  </button>
                ))}
              {accounts.filter((acc) => !selectedUser.accounts?.some((ua) => ua.id === acc.id))
                .length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  Nessun account disponibile da assegnare
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAccountModal(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
