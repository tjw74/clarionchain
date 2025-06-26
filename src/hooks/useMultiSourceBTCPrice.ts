import { useEffect, useRef, useState } from 'react';
import { MetricCard } from '@/types/bitcoin';

const COINBASE_URL = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';
const KRAKEN_URL = 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD';
const BINANCE_URL = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';

function formatNumber(num: number) {
  if (isNaN(num)) return 'N/A';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function fetchCoinbasePrice(date?: string): Promise<number | null> {
  try {
    if (!date) {
      const res = await fetch(COINBASE_URL);
      const data = await res.json();
      return parseFloat(data.data.amount);
    } else {
      // Historical price
      const res = await fetch(`https://api.coinbase.com/v2/prices/BTC-USD/spot?date=${date}`);
      const data = await res.json();
      return parseFloat(data.data.amount);
    }
  } catch {
    return null;
  }
}

async function fetchKrakenPrice(): Promise<number | null> {
  try {
    const res = await fetch(KRAKEN_URL);
    const data = await res.json();
    const price = data.result?.XXBTZUSD?.c?.[0];
    return price ? parseFloat(price) : null;
  } catch {
    return null;
  }
}

async function fetchBinancePrice(): Promise<number | null> {
  try {
    const res = await fetch(BINANCE_URL);
    const data = await res.json();
    return data.price ? parseFloat(data.price) : null;
  } catch {
    return null;
  }
}

export function useMultiSourceBTCPrice() {
  const [metric, setMetric] = useState<MetricCard>({
    title: 'Bitcoin Price',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Current BTC/USD price',
  });
  const last7dPrice = useRef<number | null>(null);
  const [last7d, setLast7d] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    async function fetchPrices() {
      // Get current date and 7 days ago in YYYY-MM-DD
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Fetch current prices
      const [coinbase, kraken, binance] = await Promise.all([
        fetchCoinbasePrice(),
        fetchKrakenPrice(),
        fetchBinancePrice(),
      ]);
      const prices = [coinbase, kraken, binance].filter((p): p is number => p !== null && !isNaN(p));
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

      // Fetch 7d ago price (Coinbase only, for simplicity and reliability)
      let price7d = last7dPrice.current;
      if (!price7d) {
        price7d = await fetchCoinbasePrice(sevenDaysAgoStr);
        last7dPrice.current = price7d;
      }
      if (isMounted) setLast7d(price7d ?? null);

      // Calculate percent change
      let change = 'N/A';
      let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
      if (avgPrice !== null && price7d && !isNaN(price7d) && price7d !== 0) {
        const pct = ((avgPrice - price7d) / price7d) * 100;
        change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
        changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
      }

      if (isMounted) {
        setMetric({
          title: 'Bitcoin Price',
          value: avgPrice !== null ? formatNumber(avgPrice) : 'N/A',
          change,
          changeType,
          description: 'Current BTC/USD price',
        });
      }
    }

    fetchPrices();
    interval = setInterval(fetchPrices, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { metric, last7dPrice: last7d };
} 