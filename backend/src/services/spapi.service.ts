import SellingPartnerAPI from 'amazon-sp-api';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';
import { gunzipSync } from 'zlib';

const prisma = new PrismaClient();

/**
 * Amazon SP-API Service - READ ONLY
 *
 * IMPORTANT: This service only performs READ operations on Amazon.
 * NO data is ever written or modified on Amazon's side.
 * All modifications (product costs, prices, etc.) are stored locally in the database.
 */
export class SPAPIService {
  private client: any;
  private sellingPartnerId?: string;
  private clientReady: Promise<void>;

  constructor(accountId?: string, sellingPartnerId?: string) {
    this.sellingPartnerId = sellingPartnerId;
    this.clientReady = this.initializeClient(accountId);
  }

  private async initializeClient(accountId?: string) {
    let credentials = {
      refresh_token: config.amazon.refreshToken,
      client_id: config.amazon.clientId,
      client_secret: config.amazon.clientSecret,
    };

    // If accountId is provided, fetch credentials from database
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (account) {
        credentials.refresh_token = account.refreshToken;
      }
    }

    const apiConfig: any = {
      region: config.amazon.region,
      refresh_token: credentials.refresh_token,
      credentials: {
        SELLING_PARTNER_APP_CLIENT_ID: credentials.client_id,
        SELLING_PARTNER_APP_CLIENT_SECRET: credentials.client_secret,
      },
    };

    // Add selling_partner_id for Solution Provider access
    if (this.sellingPartnerId) {
      apiConfig.selling_partner = this.sellingPartnerId;
    }

    this.client = new (SellingPartnerAPI as any)(apiConfig);
  }

  // Orders API methods
  async getOrders(params: {
    CreatedAfter?: string;
    CreatedBefore?: string;
    LastUpdatedAfter?: string;
    LastUpdatedBefore?: string;
    MarketplaceIds: string[];
    OrderStatuses?: string[];
    NextToken?: string;
  }) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'getOrders',
        endpoint: 'orders',
        query: params,
      });
      return response;
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  async getOrderItems(orderId: string) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'getOrderItems',
        endpoint: 'orders',
        path: {
          orderId,
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching order items:', error);
      throw error;
    }
  }

  // Finances API methods
  async listFinancialEvents(params: {
    PostedAfter?: string;
    PostedBefore?: string;
    MaxResultsPerPage?: number;
  }) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'listFinancialEvents',
        endpoint: 'finances',
        query: params,
      });
      return response;
    } catch (error) {
      console.error('Error fetching financial events:', error);
      throw error;
    }
  }

  async listFinancialEventsByOrderId(orderId: string) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'listFinancialEventsByOrderId',
        endpoint: 'finances',
        path: {
          orderId,
        },
      });
      return response;
    } catch (error) {
      console.error('Error fetching financial events by order:', error);
      throw error;
    }
  }

  // Finances API v2024-06-19 - supports deferred transactions
  async listTransactions(params: {
    postedAfter: string;
    postedBefore?: string;
    marketplaceId?: string;
    transactionStatus?: 'DEFERRED' | 'RELEASED' | 'DEFERRED_RELEASED';
    nextToken?: string;
  }) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'listTransactions',
        endpoint: 'finances',
        query: params,
        options: {
          version: '2024-06-19'
        }
      });
      return response;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  // Inventory API methods
  async getInventorySummaries(params: {
    granularityType: 'Marketplace';
    granularityId: string;
    marketplaceIds: string[];
    details?: boolean;
    startDateTime?: string;
  }) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'getInventorySummaries',
        endpoint: 'fbaInventory',
        query: params,
      });
      return response;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  }

  // Catalog Items API methods
  async getCatalogItem(asin: string, marketplaceIds: string[], locale?: string) {
    await this.clientReady;
    try {
      const query: any = {
        marketplaceIds: marketplaceIds,
      };

      // Add locale parameter for localized product information
      if (locale) {
        query.locale = locale;
      }

      const response = await this.client.callAPI({
        operation: 'getCatalogItem',
        endpoint: 'catalogItems',
        path: {
          asin,
        },
        query,
      });
      return response;
    } catch (error) {
      console.error('Error fetching catalog item:', error);
      throw error;
    }
  }

  // Reports API methods
  async createReport(params: {
    reportType: string;
    marketplaceIds: string[];
    dataStartTime?: string;
    dataEndTime?: string;
    reportOptions?: any;
  }) {
    await this.clientReady;
    try {
      const body: any = {
        reportType: params.reportType,
        marketplaceIds: params.marketplaceIds,
      };

      if (params.dataStartTime) {
        body.dataStartTime = params.dataStartTime;
      }
      if (params.dataEndTime) {
        body.dataEndTime = params.dataEndTime;
      }
      if (params.reportOptions) {
        body.reportOptions = params.reportOptions;
      }

      const response = await this.client.callAPI({
        operation: 'createReport',
        endpoint: 'reports',
        body,
      });
      return response;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  async getReport(reportId: string) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'getReport',
        endpoint: 'reports',
        path: {
          reportId,
        },
      });
      return response;
    } catch (error) {
      console.error('Error getting report:', error);
      throw error;
    }
  }

  async getReportDocument(reportDocumentId: string) {
    await this.clientReady;
    try {
      const response = await this.client.callAPI({
        operation: 'getReportDocument',
        endpoint: 'reports',
        path: {
          reportDocumentId,
        },
      });
      return response;
    } catch (error) {
      console.error('Error getting report document:', error);
      throw error;
    }
  }

  async downloadReportDocument(documentInfo: any) {
    try {
      const { url, compressionAlgorithm } = documentInfo;

      // Download the report
      const response = await fetch(url);

      // Check if compressed with GZIP
      if (compressionAlgorithm === 'GZIP') {
        console.log('   Report is GZIP compressed, decompressing...');
        const buffer = Buffer.from(await response.arrayBuffer());
        const decompressed = gunzipSync(buffer);
        const text = decompressed.toString('utf-8');
        console.log(`   ✅ Decompressed ${buffer.length} bytes → ${text.length} bytes`);
        return text;
      }

      // Not compressed, return as text
      const text = await response.text();
      return text;
    } catch (error) {
      console.error('Error downloading report document:', error);
      throw error;
    }
  }
}

export default SPAPIService;
