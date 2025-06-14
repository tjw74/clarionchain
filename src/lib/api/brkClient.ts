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
}

export const brkClient = new BRKClient();
export default BRKClient; 