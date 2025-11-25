const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';
const AUTH_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3002';

// Get JWT token from localStorage
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

async function authFetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${AUTH_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'API request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  loginWithCredentials: (credentials: {
    sellerId: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    region: string;
    marketplaceId: string;
  }) =>
    authFetcher('/auth/amazon/credentials', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  // Dashboard
  getDashboard: (accountId: string, params?: { days?: number; startDate?: string; endDate?: string; marketplaceIds?: string[]; skus?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.days) query.append('days', params.days.toString());
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.marketplaceIds && params.marketplaceIds.length > 0) {
      query.append('marketplaceIds', params.marketplaceIds.join(','));
    }
    if (params?.skus && params.skus.length > 0) {
      query.append('skus', params.skus.join(','));
    }
    return fetcher(`/dashboard/${accountId}?${query.toString()}`);
  },

  getDailyStats: (accountId: string, params?: { days?: number; startDate?: string; endDate?: string; marketplaceIds?: string[]; skus?: string[] }) => {
    const query = new URLSearchParams();
    if (params?.days) query.append('days', params.days.toString());
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.marketplaceIds && params.marketplaceIds.length > 0) {
      query.append('marketplaceIds', params.marketplaceIds.join(','));
    }
    if (params?.skus && params.skus.length > 0) {
      query.append('skus', params.skus.join(','));
    }
    return fetcher(`/dashboard/${accountId}/daily?${query.toString()}`);
  },

  // Orders
  getOrders: (accountId: string, params?: any) => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/orders/${accountId}${query ? `?${query}` : ''}`);
  },

  getOrder: (accountId: string, orderId: string) =>
    fetcher(`/orders/${accountId}/${orderId}`),

  // Products
  getProducts: (accountId: string, params?: { startDate?: string; endDate?: string }) => {
    if (params?.startDate && params?.endDate) {
      const query = new URLSearchParams();
      query.append('startDate', params.startDate);
      query.append('endDate', params.endDate);
      return fetcher(`/products/${accountId}?${query.toString()}`);
    }
    return fetcher(`/products/${accountId}`);
  },

  getProductsByAsin: (accountId: string, marketplaceId?: string) => {
    const query = marketplaceId ? `?marketplaceId=${marketplaceId}` : '';
    return fetcher(`/products/${accountId}/by-asin${query}`);
  },

  getProduct: (accountId: string, productId: string) =>
    fetcher(`/products/${accountId}/${productId}`),

  updateProduct: (accountId: string, productId: string, data: any) =>
    fetcher(`/products/${accountId}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProductOrders: (accountId: string, sku: string, params: { startDate: string; endDate: string }) => {
    const query = new URLSearchParams();
    query.append('startDate', params.startDate);
    query.append('endDate', params.endDate);
    return fetcher(`/products/${accountId}/${sku}/orders?${query.toString()}`);
  },

  // Analytics
  getProfit: (accountId: string, startDate: string, endDate: string) =>
    fetcher(`/analytics/profit/${accountId}?startDate=${startDate}&endDate=${endDate}`),

  getProfitByProduct: (accountId: string, startDate: string, endDate: string) =>
    fetcher(`/analytics/profit-by-product/${accountId}?startDate=${startDate}&endDate=${endDate}`),

  // Inventory
  getInventory: (accountId: string) =>
    fetcher(`/inventory/${accountId}`),

  getInventoryAlerts: (accountId: string) =>
    fetcher(`/inventory/${accountId}/alerts`),

  // Sync
  triggerSync: (accountId: string, type?: string, sellingPartnerId?: string) =>
    fetcher(`/sync/${accountId}`, {
      method: 'POST',
      body: JSON.stringify({ type, sellingPartnerId }),
    }),

  getSyncStatus: (accountId: string) =>
    fetcher(`/sync/status/${accountId}`),

  // Accounts
  getAccounts: () =>
    fetcher('/accounts'),

  getAccount: (accountId: string) =>
    fetcher(`/accounts/${accountId}`),

  // Solution Provider - Clients
  getClients: (accountId: string) =>
    fetcher(`/${accountId}/clients`),

  addClient: (accountId: string, data: { sellingPartnerId: string; sellerName?: string; marketplaceId?: string }) =>
    fetcher(`/${accountId}/clients`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateClient: (accountId: string, clientId: string, data: { sellerName?: string; isActive?: boolean }) =>
    fetcher(`/${accountId}/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteClient: (accountId: string, clientId: string) =>
    fetcher(`/${accountId}/clients/${clientId}`, {
      method: 'DELETE',
    }),

  upgradeToSolutionProvider: (accountId: string) =>
    fetcher(`/${accountId}/upgrade-to-solution-provider`, {
      method: 'POST',
    }),

  // Cost Breakdown
  getCostBreakdown: (accountId: string, params: {
    startDate: string;
    endDate: string;
    marketplaceIds?: string[];
    skus?: string[];
  }) => {
    const query = new URLSearchParams();
    query.append('startDate', params.startDate);
    query.append('endDate', params.endDate);
    if (params.marketplaceIds && params.marketplaceIds.length > 0) {
      query.append('marketplaceIds', params.marketplaceIds.join(','));
    }
    if (params.skus && params.skus.length > 0) {
      query.append('skus', params.skus.join(','));
    }
    return fetcher(`/analytics/cost-breakdown/${accountId}?${query.toString()}`);
  },

  // Marketplace Stats
  getMarketplaceStats: (accountId: string, startDate: string, endDate: string) =>
    fetcher(`/analytics/marketplace-stats/${accountId}?startDate=${startDate}&endDate=${endDate}`),

  // Marketplaces
  getMarketplaces: (accountId: string) =>
    fetcher(`/marketplaces/${accountId}`),

  // Financial Event ID
  getFinancialEventId: (accountId: string, orderId: string) =>
    fetcher(`/orders/${accountId}/${orderId}/financial-event-id`),

  // Order Balance
  getOrderBalance: (accountId: string, orderId: string) =>
    fetcher(`/orders/${accountId}/${orderId}/balance`),

  // User Authentication
  signup: (data: { email: string; password: string; name: string }) =>
    fetcher('/users/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    fetcher('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () =>
    fetcher('/users/me'),

  updateMe: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    fetcher('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Admin - User Management
  adminGetUsers: () =>
    fetcher('/admin/users'),

  adminCreateUser: (data: { email: string; password: string; name: string; role?: string; accountIds?: string[] }) =>
    fetcher('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminUpdateUser: (userId: string, data: { name?: string; email?: string; role?: string; password?: string }) =>
    fetcher(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  adminDeleteUser: (userId: string) =>
    fetcher(`/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  adminGrantAccountAccess: (userId: string, accountId: string) =>
    fetcher(`/admin/users/${userId}/accounts/${accountId}`, {
      method: 'POST',
    }),

  adminRevokeAccountAccess: (userId: string, accountId: string) =>
    fetcher(`/admin/users/${userId}/accounts/${accountId}`, {
      method: 'DELETE',
    }),

  adminGetUserAccounts: (userId: string) =>
    fetcher(`/admin/users/${userId}/accounts`),

  // Sales & Traffic Analytics
  getSalesTrafficData: (accountId: string, params: {
    startDate: string;
    endDate: string;
    aggregation?: 'DAY' | 'WEEK' | 'MONTH';
    skus?: string | string[];
    marketplaceIds?: string | string[];
  }) => {
    const query = new URLSearchParams();
    query.append('startDate', params.startDate);
    query.append('endDate', params.endDate);
    if (params.aggregation) query.append('aggregation', params.aggregation);

    // Handle SKUs - can be string or array
    if (params.skus) {
      const skuString = Array.isArray(params.skus) ? params.skus.join(',') : params.skus;
      if (skuString) query.append('sku', skuString);
    }

    // Handle Marketplace IDs - can be string or array
    if (params.marketplaceIds) {
      const mkString = Array.isArray(params.marketplaceIds) ? params.marketplaceIds.join(',') : params.marketplaceIds;
      if (mkString) query.append('marketplaceId', mkString);
    }

    return fetcher(`/analytics/${accountId}/sales-traffic?${query.toString()}`);
  },

  getPerformanceSummary: (accountId: string, startDate: string, endDate: string) =>
    fetcher(`/analytics/${accountId}/performance-summary?startDate=${startDate}&endDate=${endDate}`),

  // Get products for filters
  getAnalyticsProducts: (accountId: string) =>
    fetcher(`/analytics/${accountId}/products`),

  // Get marketplaces with data
  getAnalyticsMarketplaces: (accountId: string) =>
    fetcher(`/analytics/${accountId}/marketplaces`),

  // Buy Box Monitor
  getBuyBoxData: (accountId: string, params?: { marketplaceId?: string; sortBy?: string }) => {
    const query = new URLSearchParams();
    if (params?.marketplaceId) query.append('marketplaceId', params.marketplaceId);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    const queryString = query.toString();
    return fetcher(`/buy-box/${accountId}${queryString ? `?${queryString}` : ''}`);
  },
};
