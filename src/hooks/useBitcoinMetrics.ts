import { useEffect, useState } from 'react';
import { brkClient } from '@/lib/api/brkClient';
import { MetricCard } from '@/types/bitcoin';

// Fallback mock data for offline/dev mode
const mockMetrics: MetricCard[] = [
  {
    title: 'Bitcoin Price',
    value: '$43,250.00',
    change: '+2.5%',
    changeType: 'positive',
    description: 'Current BTC/USD price',
  },
  {
    title: 'Realized Price',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Realized price per BTC',
  },
  {
    title: 'True Market Mean',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'True market mean price',
  },
  {
    title: 'Mayer Multiple',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Mayer Multiple ratio',
  },
  {
    title: 'Market Value',
    value: '$847.2B',
    change: '+1.8%',
    changeType: 'positive',
    description: 'Total market value (USD)',
  },
  {
    title: 'Realized Value',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Total realized value (USD)',
  },
  {
    title: 'MVRV Ratio',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Market Value / Realized Value',
  },
  {
    title: 'STH MVRV Ratio',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Short-term holder MVRV ratio',
  },
];

function formatNumber(num: number, isMoney = true) {
  if (isNaN(num)) return 'N/A';
  if (isMoney) {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toLocaleString()}`;
  } else {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  }
}

function calcChange(arr: number[] | undefined, isPercent = true): { change: string; changeType: 'positive' | 'negative' | 'neutral' } {
  if (!arr || arr.length < 31) return { change: 'N/A', changeType: 'neutral' };
  const latest = arr[arr.length - 1];
  const prev = arr[arr.length - 31];
  if (prev === 0) return { change: 'N/A', changeType: 'neutral' };
  const diff = latest - prev;
  const pct = (diff / prev) * 100;
  let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (diff > 0) changeType = 'positive';
  else if (diff < 0) changeType = 'negative';
  return {
    change: isPercent ? `${diff >= 0 ? '+' : ''}${pct.toFixed(2)}%` : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`,
    changeType,
  };
}

export function useBitcoinMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [priceHistory, marketCapHistory] = await Promise.all([
          brkClient.fetchDailyCloseHistory(2920),
          brkClient.fetchMarketCapHistory(2920),
        ]);
        const realMetrics: MetricCard[] = [
          {
            title: 'Bitcoin Price',
            value: priceHistory.length > 0 ? formatNumber(priceHistory[priceHistory.length - 1]) : 'N/A',
            ...calcChange(priceHistory),
            description: 'Current BTC/USD price',
          },
          {
            title: 'Realized Price',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Realized price per BTC',
          },
          {
            title: 'True Market Mean',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'True market mean price',
          },
          {
            title: 'Mayer Multiple',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Mayer Multiple ratio',
          },
          {
            title: 'Market Value',
            value: marketCapHistory.length > 0 ? formatNumber(marketCapHistory[marketCapHistory.length - 1]) : 'N/A',
            ...calcChange(marketCapHistory),
            description: 'Total market value (USD)',
          },
          {
            title: 'Realized Value',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Total realized value (USD)',
          },
          {
            title: 'MVRV Ratio',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Market Value / Realized Value',
          },
          {
            title: 'STH MVRV Ratio',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Short-term holder MVRV ratio',
          },
        ];
        setMetrics(realMetrics);
      } catch (err) {
        setError('Failed to fetch price data');
        setMetrics(mockMetrics);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { metrics, loading, error };
} 