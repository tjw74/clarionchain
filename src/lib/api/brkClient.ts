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

  // Fetch STH realized cap history from the working endpoint
  async fetchSTHRealizedCapHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=sth-realized-cap&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch STH realized cap history');
    return await response.json();
  }

  // Fetch STH supply history from the working endpoint
  async fetchSTHSupplyHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=sth-supply&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch STH supply history');
    return await response.json();
  }

  // Fetch LTH supply history from the working endpoint
  async fetchLTHSupplyHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=lth-supply&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch LTH supply history');
    return await response.json();
  }

  // Fetch price history with timestamps for Z-Score analysis
  async fetchPriceHistory(days: number = 10000): Promise<Array<{timestamp: string, price: number}>> {
    const prices = await this.fetchDailyCloseHistory(days);
    
    // Generate timestamps starting from a known date and going forward
    // Bitcoin started in 2009, so let's start from 2010-01-01
    const startDate = new Date('2010-01-01');
    const timestamps = prices.map((_, index) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    });
    
    return prices.map((price, index) => ({
      timestamp: timestamps[index],
      price: price
    }));
  }

  // Fetch SOPR history (correct endpoint)
  async fetchSOPRHistory(days: number = 10000): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=spent-output-profit-ratio&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch SOPR history');
    return await response.json();
  }

  // Fetch STH Market Cap history (calculated from STH supply * price)
  async fetchSTHMarketCapHistory(days: number = 10000): Promise<number[]> {
    // STH Market Cap = STH Supply * Price, we'll calculate this in the component
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=sth-supply&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch STH supply for market cap calculation');
    return await response.json();
  }

  // Fetch Supply in Profit history (correct endpoint)
  async fetchSupplyInProfitHistory(days: number = 10000): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=supply-in-profit&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch supply in profit history');
    return await response.json();
  }

  // Fetch Supply in Loss history (correct endpoint)
  async fetchSupplyInLossHistory(days: number = 10000): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=supply-in-loss&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch supply in loss history');
    return await response.json();
  }

  // Fetch true market mean history from the working endpoint
  async fetchTrueMarketMeanHistory(days: number = 2920): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/query?index=dateindex&values=true-market-mean&from=-${days}`);
    if (!response.ok) throw new Error('Failed to fetch true market mean history');
    return await response.json();
  }

  /**
   * Generic chart data fetcher for multi-metric charts.
   * @param configs Array of { key, endpoint, transform? } objects
   * @param days Number of days to fetch
   * @returns { labels: string[], [key]: number[] }
   */
  async fetchChartData(configs: Array<{ key: string, endpoint: string, transform?: (v: number) => number }>, days: number = 1000) {
    // Fetch all data in parallel
    const results = await Promise.all(
      configs.map(cfg => fetch(`${this.baseUrl}${cfg.endpoint.replace('{days}', days.toString())}`)
        .then(r => r.ok ? r.json() : Promise.reject('API error'))
        .then(arr => cfg.transform ? arr.map(cfg.transform) : arr)
      )
    );
    // Align by minimum length
    const minLength = Math.min(...results.map(arr => arr.length));
    // Generate date labels (most recent = today)
    const labels: string[] = [];
    for (let i = 0; i < minLength; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (minLength - 1 - i));
      labels.push(date.toISOString().split('T')[0]);
    }
    // Build result object
    const out: Record<string, any> = { labels };
    configs.forEach((cfg, idx) => {
      out[cfg.key] = results[idx].slice(-minLength);
    });
    return out;
  }
}

export const brkClient = new BRKClient();
export default BRKClient; 