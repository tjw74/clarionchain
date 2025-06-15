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
  console.log('useBitcoinMetrics hook started');
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching all metrics from BRK...');
        const [priceRes, marketCapRes, realizedCapRes, realizedPriceRes] = await Promise.all([
          fetch('https://brk.openonchain.dev/api/query?index=height&values=close&from=-1'),
          fetch('https://brk.openonchain.dev/api/query?index=height&values=marketcap&from=-1'),
          fetch('https://brk.openonchain.dev/api/query?index=height&values=realized-cap&from=-1'),
          fetch('https://brk.openonchain.dev/api/query?index=height&values=realized-price&from=-1'),
        ]);
        let price = 'N/A';
        let marketCap = 'N/A';
        let realizedCap = 'N/A';
        let realizedPrice = 'N/A';
        // Price
        if (priceRes.ok) {
          const arr = await priceRes.json();
          console.log('Price API response:', arr);
          if (Array.isArray(arr) && arr.length > 0) price = formatNumber(arr[arr.length - 1]);
        } else {
          console.error('Price fetch failed:', priceRes.status);
        }
        // Market Cap
        if (marketCapRes.ok) {
          const arr = await marketCapRes.json();
          console.log('Market Cap API response:', arr);
          if (Array.isArray(arr) && arr.length > 0) marketCap = formatNumber(arr[arr.length - 1]);
        } else {
          console.error('Market Cap fetch failed:', marketCapRes.status);
        }
        // Realized Cap
        if (realizedCapRes.ok) {
          const arr = await realizedCapRes.json();
          console.log('Realized Cap API response:', arr);
          if (Array.isArray(arr) && arr.length > 0) realizedCap = formatNumber(arr[arr.length - 1]);
        } else {
          console.error('Realized Cap fetch failed:', realizedCapRes.status);
        }
        // Realized Price
        if (realizedPriceRes.ok) {
          const arr = await realizedPriceRes.json();
          if (Array.isArray(arr) && arr.length > 0) realizedPrice = formatNumber(arr[arr.length - 1]);
        }
        // Assign metrics to cards
        const realMetrics: MetricCard[] = [
          {
            title: 'Bitcoin Price',
            value: price,
            change: 'N/A',
            changeType: 'neutral',
            description: 'Current BTC/USD price',
          },
          {
            title: 'Market Value',
            value: marketCap,
            change: 'N/A',
            changeType: 'neutral',
            description: 'Total market value (USD)',
          },
          {
            title: 'Realized Value',
            value: realizedCap,
            change: 'N/A',
            changeType: 'neutral',
            description: 'Total realized value (USD)',
          },
          {
            title: 'Realized Price',
            value: realizedPrice,
            change: 'N/A',
            changeType: 'neutral',
            description: 'Realized price per BTC',
          },
        ];
        setMetrics(realMetrics);
      } catch (err) {
        console.error('Error in useBitcoinMetrics:', err);
        setError('Failed to fetch BRK data');
        setMetrics(mockMetrics);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return { metrics, loading, error };
} 