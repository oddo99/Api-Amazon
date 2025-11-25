import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * Amazon Advertising API Service
 *
 * Handles Sponsored Products, Brands, and Display campaigns
 * Docs: https://advertising.amazon.com/API/docs/en-us
 */
export class AdvertisingService {
  private accountId: string;
  private accessToken?: string;
  private profileId?: string;
  private region: string;

  // API endpoints by region
  private static ENDPOINTS: Record<string, string> = {
    na: 'https://advertising-api.amazon.com',
    eu: 'https://advertising-api-eu.amazon.com',
    fe: 'https://advertising-api-fe.amazon.com',
  };

  constructor(accountId: string) {
    this.accountId = accountId;
    this.region = 'eu'; // Default, will be loaded from account
  }

  /**
   * Get LWA access token for Advertising API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const account = await prisma.account.findUnique({
      where: { id: this.accountId },
    });

    if (!account) throw new Error('Account not found');

    this.region = account.region;

    // Use LWA to get access token
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
        client_id: config.amazon.clientId,
        client_secret: config.amazon.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json() as any;
    this.accessToken = data.access_token;
    return this.accessToken || '';
  }

  /**
   * Get advertising profiles for the account
   */
  async getProfiles() {
    const accessToken = await this.getAccessToken();
    const endpoint = AdvertisingService.ENDPOINTS[this.region];

    const response = await fetch(`${endpoint}/v2/profiles`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': config.amazon.clientId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get profiles: ${error}`);
    }

    return response.json();
  }

  /**
   * Get campaigns for a profile
   */
  async getCampaigns(profileId: string): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    const endpoint = AdvertisingService.ENDPOINTS[this.region];

    const response = await fetch(`${endpoint}/v2/sp/campaigns`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': config.amazon.clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get campaigns: ${error}`);
    }

    return response.json() as Promise<any[]>;
  }

  /**
   * Get advertising metrics report
   *
   * @param profileId - Advertising profile ID
   * @param reportDate - Date for the report (YYYYMMDD)
   * @param metrics - Metrics to request
   */
  async getMetricsReport(
    profileId: string,
    startDate: string,
    endDate: string,
    metrics: string[] = ['impressions', 'clicks', 'cost', 'sales', 'orders']
  ) {
    const accessToken = await this.getAccessToken();
    const endpoint = AdvertisingService.ENDPOINTS[this.region];

    // Request report
    const reportResponse = await fetch(`${endpoint}/v2/sp/campaigns/report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': config.amazon.clientId,
        'Amazon-Advertising-API-Scope': profileId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportDate: startDate.replace(/-/g, ''),
        metrics: metrics.join(','),
        segment: 'query',
      }),
    });

    if (!reportResponse.ok) {
      const error = await reportResponse.text();
      throw new Error(`Failed to request report: ${error}`);
    }

    const reportData = await reportResponse.json();
    return reportData;
  }

  /**
   * Sync advertising data to database
   */
  async syncAdvertisingData(profileId: string, daysBack: number = 30) {
    try {
      console.log(`📊 Syncing advertising data for profile ${profileId}...`);

      // Get campaigns
      const campaigns = await this.getCampaigns(profileId);
      console.log(`Found ${campaigns.length} campaigns`);

      // Save campaigns to database
      for (const campaign of campaigns) {
        await prisma.campaign.upsert({
          where: { campaignId: campaign.campaignId.toString() },
          update: {
            name: campaign.name,
            campaignType: campaign.campaignType || 'sponsoredProducts',
            targetingType: campaign.targetingType || 'manual',
            state: campaign.state,
            dailyBudget: campaign.dailyBudget,
            startDate: campaign.startDate ? new Date(campaign.startDate) : null,
            endDate: campaign.endDate ? new Date(campaign.endDate) : null,
          },
          create: {
            accountId: this.accountId,
            campaignId: campaign.campaignId.toString(),
            name: campaign.name,
            campaignType: campaign.campaignType || 'sponsoredProducts',
            targetingType: campaign.targetingType || 'manual',
            state: campaign.state,
            dailyBudget: campaign.dailyBudget,
            startDate: campaign.startDate ? new Date(campaign.startDate) : null,
            endDate: campaign.endDate ? new Date(campaign.endDate) : null,
          },
        });
      }

      console.log(`✅ Synced ${campaigns.length} campaigns`);
      return { success: true, campaignsProcessed: campaigns.length };
    } catch (error) {
      console.error('Error syncing advertising data:', error);
      throw error;
    }
  }

  /**
   * Get advertising cost by SKU for a date range
   */
  async getAdCostBySKU(startDate: Date, endDate: Date) {
    const metrics = await prisma.adMetrics.groupBy({
      by: ['sku'],
      where: {
        accountId: this.accountId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        sku: {
          not: null,
        },
      },
      _sum: {
        spend: true,
        sales: true,
        impressions: true,
        clicks: true,
        orders: true,
      },
    });

    return metrics.map((m: any) => ({
      sku: m.sku!,
      spend: m._sum.spend || 0,
      sales: m._sum.sales || 0,
      impressions: m._sum.impressions || 0,
      clicks: m._sum.clicks || 0,
      orders: m._sum.orders || 0,
      acos: m._sum.sales && m._sum.spend ? (m._sum.spend / m._sum.sales) * 100 : 0,
      roas: m._sum.spend && m._sum.sales ? m._sum.sales / m._sum.spend : 0,
    }));
  }
}

export default AdvertisingService;
