// Bitcoin metric data types for ClarionChain
export interface BitcoinMetric {
  date: string;
  value: number;
}

export interface BitcoinMetrics {
  price_btc_usd?: BitcoinMetric[];
  market_cap?: BitcoinMetric[];
  volume?: BitcoinMetric[];
  mvrv_ratio?: BitcoinMetric[];
  realized_cap?: BitcoinMetric[];
  supply_circulating?: BitcoinMetric[];
  [key: string]: BitcoinMetric[] | undefined;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface MetricInfo {
  name: string;
  description: string;
  category: string;
  priority: 'essential' | 'important' | 'extended' | 'all';
}

// Chart configuration types
export interface ChartConfig {
  title: string;
  yAxis: string;
  color: string;
  showVolume?: boolean;
  logScale?: boolean;
} 