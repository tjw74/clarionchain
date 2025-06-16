import { BitcoinMetrics, ApiResponse, MetricInfo } from '@/types/bitcoin';

const BRK_BASE_URL = 'https://brk.openonchain.dev';

class BRKClient {
  private baseUrl: string;

  constructor(baseUrl: string = BRK_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async fetchMetrics(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async fetchMetric(metricName: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/${metricName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async fetchVectorIndexes(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/vecs/indexes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        data: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Essential metrics for dashboard
  async fetchEssentialMetrics(): Promise<ApiResponse<BitcoinMetrics>> {
    const essentialMetrics = [
      'price_btc_usd',
      'market_cap', 
      'volume_24h',
      'mvrv_ratio',
      'realized_cap'
    ];

    try {
      const results: BitcoinMetrics = {};
      
      for (const metric of essentialMetrics) {
        const response = await this.fetchMetric(metric);
        if (response.success) {
          results[metric] = response.data;
        }
      }

      return { success: true, data: results };
    } catch (error) {
      return { 
        success: false, 
        data: {}, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Fetch daily close price history from the working endpoint
  async fetchDailyCloseHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=close&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch daily close price history');
    return await response.json();
  }

  // Fetch market cap history from the working endpoint
  async fetchMarketCapHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=marketcap&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch market cap history');
    return await response.json();
  }

  // Fetch realized price history from the working endpoint
  async fetchRealizedPriceHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=realized-price&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch realized price history');
    return await response.json();
  }

  // Fetch realized cap history from the working endpoint
  async fetchRealizedCapHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=realized-cap&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch realized cap history');
    return await response.json();
  }

  // Fetch STH realized price history from the working endpoint
  async fetchSTHRealizedPriceHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=sth-realized-price&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch STH realized price history');
    return await response.json();
  }
}

export const brkClient = new BRKClient();
export default BRKClient; 