"use client"

// Force Vercel deployment update
import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, BarChart3 } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { brkClient } from "@/lib/api/brkClient"
import { MetricCard } from "@/types/bitcoin"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ComposedChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useUser } from "@/context/UserContext"
import ShareButton from "@/components/ShareButton"
import { useMultiSourceBTCPrice } from '@/hooks/useMultiSourceBTCPrice'
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import type { ChartData } from 'chart.js';
import { useCallback } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useRange } from 'react-use-range';
import { getTrackBackground } from 'react-range';
import { Range } from 'react-range';

// Chart.js registration: only on client
if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    TimeScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
}

const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

// Mock data for initial display
const mockMetrics: MetricCard[] = [
  {
    title: "Bitcoin Price",
    value: "$43,250.00",
    change: "+2.5%",
    changeType: "positive",
    description: "Current BTC/USD price"
  },
  {
    title: "Market Cap",
    value: "$847.2B",
    change: "+1.8%",
    changeType: "positive", 
    description: "Total market capitalization"
  },
  {
    title: "24h Volume",
    value: "$15.4B",
    change: "-5.2%",
    changeType: "negative",
    description: "Trading volume last 24 hours"
  },
  {
    title: "MVRV Ratio",
    value: "1.85",
    change: "+0.12",
    changeType: "positive",
    description: "Market Value to Realized Value"
  },
  {
    title: "Realized Cap",
    value: "$458.3B",
    change: "+0.8%",
    changeType: "positive",
    description: "Realized market capitalization"
  },
  {
    title: "Active Addresses",
    value: "892,456",
    change: "+3.2%",
    changeType: "positive",
    description: "Daily active addresses"
  },
  {
    title: "Hash Rate",
    value: "432.5 EH/s",
    change: "+1.1%",
    changeType: "positive",
    description: "Current network hash rate"
  },
  {
    title: "Difficulty",
    value: "79.5T",
    change: "+0.5%",
    changeType: "positive",
    description: "Current mining difficulty"
  }
]

// Chart configuration for Bitcoin price
const priceChartConfig = {
  price: {
    label: "Bitcoin Price",
    color: "#3b82f6",
  },
  realizedPrice: {
    label: "Realized Price", 
    color: "#eab308",
  },
} satisfies ChartConfig

// Chart configuration for STH Cost Basis
const sthChartConfig = {
  price: {
    label: "STH Cost Basis",
    color: "#eab308",
  },
  bitcoinPrice: {
    label: "Bitcoin Price",
    color: "#3b82f6",
  },
} satisfies ChartConfig

function useRealizedPriceCard() {
  const [card, setCard] = useState({
    title: 'Realized Price',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Realized price per BTC',
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchRealizedPrice() {
      try {
        const res = await fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-price?from=-10');
        const arr = await res.json();
        // arr is an array, get the last and 7th-from-last non-null values
        const values = arr.filter((v: any) => typeof v === 'number' && !isNaN(v));
        const latest = values[values.length - 1];
        const prev7d = values.length > 7 ? values[values.length - 8] : null;
        const formatNumber = (num: number) => {
          if (isNaN(num)) return 'N/A';
          if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
          if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
          if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
          if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
          return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };
        let change = 'N/A';
        let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (latest && prev7d && prev7d !== 0) {
          const pct = ((latest - prev7d) / prev7d) * 100;
          change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          if (pct > 0) changeType = 'positive';
          else if (pct < 0) changeType = 'negative';
          else changeType = 'neutral';
        }
        if (isMounted) {
          setCard({
            title: 'Realized Price',
            value: formatNumber(latest),
            change,
            changeType: changeType === 'positive' ? 'positive' : changeType === 'negative' ? 'negative' : 'neutral',
            description: 'Realized price per BTC',
          });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchRealizedPrice();
    interval = setInterval(fetchRealizedPrice, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  return card;
}

function useMA200Card() {
  const [card, setCard] = useState({
    title: 'Price 200 DMA',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: '200-day moving average (close)',
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchMA200() {
      try {
        const res = await fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-210');
        const arr = await res.json();
        // arr is an array of [open, high, low, close], get the close prices
        const closes = arr.map((v: any) => Array.isArray(v) && typeof v[3] === 'number' ? v[3] : null).filter((v: any) => v !== null);
        // Calculate MA200 for latest and 7d ago
        if (closes.length >= 200) {
          const latestMA = closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;
          const prev7dMA = closes.length >= 207 ? closes.slice(-207, -7).reduce((a: number, b: number) => a + b, 0) / 200 : null;
          const formatNumber = (num: number) => {
            if (isNaN(num)) return 'N/A';
            if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
            if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
            if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
            if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
            return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          };
          let change = 'N/A';
          let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
          if (latestMA && prev7dMA && prev7dMA !== 0) {
            const pct = ((latestMA - prev7dMA) / prev7dMA) * 100;
            change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
          }
          if (isMounted) {
            setCard({
              title: 'Price 200 DMA',
              value: formatNumber(latestMA),
              change,
              changeType,
              description: '200-day moving average (close)',
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchMA200();
    interval = setInterval(fetchMA200, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  return card;
}

function useMayerMultipleCard() {
  const [card, setCard] = useState({
    title: 'Mayer Multiple',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Mayer Multiple (Price / 200DMA)',
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchMayerMultiple() {
      try {
        const res = await fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-210');
        const arr = await res.json();
        // arr is an array of [open, high, low, close], get the close prices
        const closes = arr.map((v: any) => Array.isArray(v) && typeof v[3] === 'number' ? v[3] : null).filter((v: any) => v !== null);
        if (closes.length >= 200) {
          const latestPrice = closes[closes.length - 1];
          const latestMA = closes.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;
          const prev7dPrice = closes.length > 7 ? closes[closes.length - 8] : null;
          const prev7dMA = closes.length >= 207 ? closes.slice(-207, -7).reduce((a: number, b: number) => a + b, 0) / 200 : null;
          const latestRatio = latestMA && latestMA !== 0 ? latestPrice / latestMA : null;
          const prev7dRatio = prev7dMA && prev7dMA !== 0 && prev7dPrice ? prev7dPrice / prev7dMA : null;
          let change = 'N/A';
          let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
          if (latestRatio && prev7dRatio && prev7dRatio !== 0) {
            const pct = ((latestRatio - prev7dRatio) / prev7dRatio) * 100;
            change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
            changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
          }
          if (isMounted) {
            setCard({
              title: 'Mayer Multiple',
              value: latestRatio ? latestRatio.toFixed(2) : 'N/A',
              change,
              changeType,
              description: 'Mayer Multiple (Price / 200DMA)',
            });
          }
        }
      } catch (e) {
        // ignore
      }
    }
    fetchMayerMultiple();
    interval = setInterval(fetchMayerMultiple, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  return card;
}

function useRealizedCapCard() {
  const [card, setCard] = useState({
    title: 'Realized Cap',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Realized market capitalization',
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchRealizedCap() {
      try {
        const res = await fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-cap?from=-10');
        const arr = await res.json();
        // arr is an array, get the last and 7th-from-last non-null values
        const values = arr.filter((v: any) => typeof v === 'number' && !isNaN(v));
        const latest = values[values.length - 1];
        const prev7d = values.length > 7 ? values[values.length - 8] : null;
        const formatNumber = (num: number) => {
          if (isNaN(num)) return 'N/A';
          if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
          if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
          if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
          if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
          return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        };
        let change = 'N/A';
        let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (latest && prev7d && prev7d !== 0) {
          const pct = ((latest - prev7d) / prev7d) * 100;
          change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
        }
        if (isMounted) {
          setCard({
            title: 'Realized Cap',
            value: formatNumber(latest),
            change,
            changeType,
            description: 'Realized market capitalization',
          });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchRealizedCap();
    interval = setInterval(fetchRealizedCap, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  return card;
}

function useMVRVRatioCard(marketCap: number | null, realizedCap: number | null, marketCap7d: number | null, realizedCap7d: number | null) {
  const [card, setCard] = useState({
    title: 'MVRV Ratio',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Market Value to Realized Value',
  });

  useEffect(() => {
    let latest = marketCap && realizedCap && realizedCap !== 0 ? marketCap / realizedCap : null;
    let prev7d = marketCap7d && realizedCap7d && realizedCap7d !== 0 ? marketCap7d / realizedCap7d : null;
    let change = 'N/A';
    let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (latest && prev7d && prev7d !== 0) {
      const pct = ((latest - prev7d) / prev7d) * 100;
      change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
    }
    setCard({
      title: 'MVRV Ratio',
      value: latest ? latest.toFixed(2) : 'N/A',
      change,
      changeType,
      description: 'Market Value to Realized Value',
    });
  }, [marketCap, realizedCap, marketCap7d, realizedCap7d]);
  return card;
}

function useSOPRCard() {
  const [card, setCard] = useState({
    title: 'SOPR',
    value: 'N/A',
    change: 'N/A',
    changeType: 'neutral',
    description: 'Spent Output Profit Ratio (SOPR)',
  });

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchSOPR() {
      try {
        const res = await fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-spent-output-profit-ratio?from=-10');
        const arr = await res.json();
        // arr is an array, get the last and 7th-from-last non-null values
        const values = arr.filter((v: any) => typeof v === 'number' && !isNaN(v));
        const latest = values[values.length - 1];
        const prev7d = values.length > 7 ? values[values.length - 8] : null;
        let change = 'N/A';
        let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (latest && prev7d && prev7d !== 0) {
          const pct = ((latest - prev7d) / prev7d) * 100;
          change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
          if (pct > 0) changeType = 'positive';
          else if (pct < 0) changeType = 'negative';
          else changeType = 'neutral';
        }
        if (isMounted) {
          setCard({
            title: 'SOPR',
            value: latest ? latest.toFixed(2) : 'N/A',
            change,
            changeType: (['positive', 'negative', 'neutral'] as const).includes(changeType as any) ? changeType as 'positive' | 'negative' | 'neutral' : 'neutral',
            description: 'Spent Output Profit Ratio (SOPR)',
          });
        }
      } catch (e) {
        // ignore
      }
    }
    fetchSOPR();
    interval = setInterval(fetchSOPR, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, []);
  return card;
}

function usePriceModelsChartData(range: [Date, Date]) {
  const [data, setData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [],
  });
  const allData = useRef<{ labels: Date[]; datasets: any[] } | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    async function fetchData() {
      const [ohlcRes, realizedRes, tmmRes] = await Promise.all([
        fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-ohlc?from=-10000'),
        fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-price?from=-10000'),
        fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-true-market-mean?from=-10000'),
      ]);
      const ohlcArr = await ohlcRes.json();
      const realizedArr = await realizedRes.json();
      const tmmArr = await tmmRes.json();
      const startDate = new Date('2012-01-01');
      const closes = ohlcArr.map((v: any) => Array.isArray(v) && typeof v[3] === 'number' ? v[3] : null);
      const labels = closes.map((_: any, i: number) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return d;
      });
      const ma200 = closes.map((_: any, i: number, arr: any[]) => {
        if (i < 199) return null;
        const window = arr.slice(i - 199, i + 1);
        if (window.some((x: any) => x === null)) return null;
        return window.reduce((a: number, b: number) => a! + (b as number), 0) / 200;
      });
      const minLen = Math.min(closes.length, realizedArr.length, tmmArr.length, ma200.length);
      const filteredLabels = labels.slice(0, minLen).filter((_: any, i: number) => closes[i] && realizedArr[i] && tmmArr[i] && ma200[i]);
      const priceData = closes.slice(0, minLen).filter((_: any, i: number) => closes[i] && realizedArr[i] && tmmArr[i] && ma200[i]);
      const realizedData = realizedArr.slice(0, minLen).filter((_: any, i: number) => closes[i] && realizedArr[i] && tmmArr[i] && ma200[i]);
      const tmmData = tmmArr.slice(0, minLen).filter((_: any, i: number) => closes[i] && realizedArr[i] && tmmArr[i] && ma200[i]);
      const ma200Data = ma200.slice(0, minLen).filter((_: any, i: number) => closes[i] && realizedArr[i] && tmmArr[i] && ma200[i]);
      if (isMounted) {
        allData.current = {
          labels: filteredLabels,
          datasets: [
            { label: 'Price', data: priceData, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' },
            { label: 'Realized Price', data: realizedData, borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' },
            { label: 'True Market Mean', data: tmmData, borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' },
            { label: '200 DMA', data: ma200Data, borderColor: '#a3e635', backgroundColor: 'rgba(163,230,53,0.15)', borderWidth: 2, pointRadius: 0, tension: 0.1, yAxisID: 'y' },
          ],
        };
        // Filter for range
        const [from, to] = range;
        const idxFrom = filteredLabels.findIndex((d: Date) => d >= from);
        const idxTo = filteredLabels.findIndex((d: Date) => d > to);
        const end = idxTo === -1 ? filteredLabels.length : idxTo;
        setData({
          labels: filteredLabels.slice(idxFrom, end),
          datasets: allData.current.datasets.map(ds => ({ ...ds, data: ds.data.slice(idxFrom, end) })),
        });
      }
    }
    fetchData();
    interval = setInterval(fetchData, 60000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [range]);

  // When range changes, filter the data
  useEffect(() => {
    if (!allData.current) return;
    const filteredLabels = allData.current.labels;
    const [from, to] = range;
    const idxFrom = filteredLabels.findIndex((d: Date) => d >= from);
    const idxTo = filteredLabels.findIndex((d: Date) => d > to);
    const end = idxTo === -1 ? filteredLabels.length : idxTo;
    setData({
      labels: filteredLabels.slice(idxFrom, end),
      datasets: allData.current.datasets.map(ds => ({ ...ds, data: ds.data.slice(idxFrom, end) })),
    });
  }, [range]);

  return data;
}

const priceModelsChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(59, 130, 246, 0.15)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderWidth: 0,
      callbacks: {
        label: function(context: any) {
          return `${context.dataset.label}: $${Number(context.parsed.y).toLocaleString()}`;
        },
      },
    },
  },
  scales: {
    x: {
      type: 'time' as const,
      time: { unit: 'year' as const },
      grid: { color: '#374151' },
      ticks: { color: '#9ca3af', maxTicksLimit: 10 },
    },
    y: {
      type: 'logarithmic' as const,
      position: 'right' as const,
      grid: { color: '#374151' },
      afterBuildTicks: function(axis: any) {
        // Get all visible data values from datasets
        const allValues = axis.chart.data.datasets.flatMap((ds: any) => ds.data).filter((v: any) => typeof v === 'number' && v > 0)
        if (!allValues.length) return;
        const maxVal = Math.max(...allValues)
        const minVal = Math.min(...allValues)
        // Find the next lower and next higher powers of 2 for min and max
        const log2 = (x: number) => Math.log(x) / Math.log(2)
        const minPow = Math.floor(log2(minVal))
        const maxPow = Math.ceil(log2(maxVal))
        // Add one extra tick below and above for margin
        const startPow = Math.max(0, minPow - 1)
        const endPow = maxPow + 1
        // Generate ticks at powers of 2
        let ticks: number[] = []
        for (let p = startPow; p <= endPow; p++) {
          ticks.push(Math.pow(2, p))
        }
        // If too many ticks, reduce to 6-10 by skipping
        while (ticks.length > 10) {
          ticks = ticks.filter((_, i) => i % 2 === 0)
        }
        axis.ticks = ticks.map((value: number) => ({ value }))
        axis.min = ticks[0] * 0.9
        axis.max = ticks[ticks.length - 1] * 1.1
      },
      ticks: {
        color: '#9ca3af',
        callback: function(tickValue: string | number) {
          const value: number = typeof tickValue === 'number' ? tickValue : parseFloat(tickValue as string);
          if (value >= 1e6) return `$${(value / 1e3).toFixed(0)}K`;
          if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
          return `$${Math.round(value)}`;
        },
        maxTicksLimit: 10,
      },
    },
  },
};

// --- DATA PREPARATION: STH MVRV RATIO PANEL (Chart.js) ---
// Moved inside Dashboard component to fix invalid hook call

// Add a helper function above the Dashboard component
function getLatestNumberFromDataset(dataset: any): number | null {
  if (!dataset?.data?.length) return null;
  const val = dataset.data.at(-1);
  if (typeof val === 'number' && isFinite(val)) return val;
  if (val && typeof val === 'object' && typeof val.y === 'number' && isFinite(val.y)) return val.y;
  return null;
}

// Dynamically import PlotlyMVRVTemplate for dashboard use
const PlotlyMVRVTemplateDashboard = dynamic(() => import('@/components/PlotlyMVRVTemplate'), { ssr: false });

export default function Dashboard() {
  const { metric: multiSourceBTCMetric, last7dPrice: btcPrice7dAgo } = useMultiSourceBTCPrice();
  const realizedPriceCard = useRealizedPriceCard();
  const ma200Card = useMA200Card();
  const mayerMultipleCard = useMayerMultipleCard();
  const realizedCapCard = useRealizedCapCard();
  const soprCard = useSOPRCard();
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics)
  const [, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [priceChartData, setPriceChartData] = useState<Array<{date: string, price: number, realizedPrice: number}>>([])
  const [sthChartData, setSthChartData] = useState<Array<{date: string, price: number, bitcoinPrice: number}>>([])
  const { user } = useUser()
  
  // Zoom state for charts
  const [priceZoomDomain, setPriceZoomDomain] = useState<{left?: number, right?: number}>({})
  const [sthZoomDomain, setSthZoomDomain] = useState<{left?: number, right?: number}>({})
  
  // Y-axis zoom state for charts
  const [priceYZoomDomain, setPriceYZoomDomain] = useState<{min?: number, max?: number}>({})
  const [sthYZoomDomain, setSthYZoomDomain] = useState<{min?: number, max?: number}>({})
  
  // Pan state for charts
  const [pricePanState, setPricePanState] = useState<{isDragging: boolean, startX: number, startY: number, startXDomain?: {left: number, right: number}, startYDomain?: {min: number, max: number}}>({isDragging: false, startX: 0, startY: 0})
  const [sthPanState, setSthPanState] = useState<{isDragging: boolean, startX: number, startY: number, startXDomain?: {left: number, right: number}, startYDomain?: {min: number, max: number}}>({isDragging: false, startX: 0, startY: 0})

  // Price Models panel state for time slider
  const [priceRange, setPriceRange] = useState<[Date, Date]>(() => [
    new Date('2012-01-01'),
    new Date(),
  ]);
  const priceModelsData = usePriceModelsChartData(priceRange);

  // STH MVRV Ratio panel state and effect
  const [sthMvrvChartData, setSthMvrvChartData] = useState<ChartData<'line'>>({ labels: [], datasets: [] });

  // MVRV Ratio Plotly panel state
  const [plotlyData, setPlotlyData] = useState<any[]>([]);
  const [plotlyDates, setPlotlyDates] = useState<string[]>([]);
  const [plotlyLoading, setPlotlyLoading] = useState(true);
  const [plotlyError, setPlotlyError] = useState<string | null>(null);
  const [plotlyRange, setPlotlyRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all required data from the correct endpoints
        const [sthSupplyArr, sthRealizedCapArr, closeArr] = await Promise.all([
          fetch('https://brk.openonchain.dev/api/vecs/date-to-sth-supply?from=-1000').then(r => r.json()),
          fetch('https://brk.openonchain.dev/api/vecs/date-to-sth-realized-cap?from=-1000').then(r => r.json()),
          fetch('https://brk.openonchain.dev/api/vecs/date-to-close?from=-1000').then(r => r.json()),
        ]);
        // Align arrays by minimum length
        const minLength = Math.min(sthSupplyArr.length, sthRealizedCapArr.length, closeArr.length);
        const labels: string[] = [];
        const sthMarketValue: number[] = [];
        const sthRealizedValue: number[] = [];
        const sthMvrvRatio: number[] = [];
        for (let i = 0; i < minLength; i++) {
          const supplyBTC = typeof sthSupplyArr[i] === 'number' ? sthSupplyArr[i] / 1e8 : NaN;
          const price = closeArr[i];
          const realizedCap = sthRealizedCapArr[i];
          if (
            typeof supplyBTC === 'number' && supplyBTC > 0 &&
            typeof price === 'number' && price > 0 &&
            typeof realizedCap === 'number' && realizedCap > 0
          ) {
            sthMarketValue.push(supplyBTC * price);
            sthRealizedValue.push(realizedCap);
            sthMvrvRatio.push(realizedCap > 0 ? (supplyBTC * price) / realizedCap : NaN);
          } else {
            sthMarketValue.push(NaN);
            sthRealizedValue.push(NaN);
            sthMvrvRatio.push(NaN);
          }
          // Generate date label (most recent = today)
          const date = new Date();
          date.setDate(date.getDate() - (minLength - 1 - i));
          labels.push(date.toISOString().split('T')[0]);
        }
        setSthMvrvChartData({
          labels,
          datasets: [
            {
              label: 'STH Market Value',
              data: sthMarketValue,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1,
              yAxisID: 'y',
            },
            {
              label: 'STH Realized Value',
              data: sthRealizedValue,
              borderColor: '#fbbf24',
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1,
              yAxisID: 'y',
            },
            {
              label: 'STH MVRV Ratio',
              data: sthMvrvRatio,
              borderColor: '#ffffff',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1,
              yAxisID: 'y2',
            },
          ],
        });
        // Temporary debug output
        setSthDebug({
          sthMarketValue: [
            ...sthMarketValue.slice(0, 5),
            '...',
            ...sthMarketValue.slice(-5)
          ],
          sthRealizedValue: [
            ...sthRealizedValue.slice(0, 5),
            '...',
            ...sthRealizedValue.slice(-5)
          ],
          sthMvrvRatio: [
            ...sthMvrvRatio.slice(0, 5),
            '...',
            ...sthMvrvRatio.slice(-5)
          ],
        });
      } catch {
        setSthMvrvChartData({ labels: [], datasets: [] });
        setSthDebug(null);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchPlotly() {
      setPlotlyLoading(true);
      setPlotlyError(null);
      try {
        const [marketArr, realizedArr] = await Promise.all([
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-marketcap?from=-10000').then(r => r.json()),
          fetch('https://brk.openonchain.dev/api/vecs/dateindex-to-realized-cap?from=-10000').then(r => r.json()),
        ]);
        const n = Math.min(marketArr.length, realizedArr.length);
        const genesisDate = new Date('2009-01-03');
        const dateLabels = Array.from({ length: n }, (_, i) => {
          const d = new Date(genesisDate);
          d.setDate(d.getDate() + i);
          return d.toISOString().slice(0, 10);
        });
        const jan2012Idx = dateLabels.findIndex(d => d >= '2012-01-01');
        const mvrvArr = Array.from({ length: n }, (_, i) => {
          const mv = marketArr[i];
          const rv = realizedArr[i];
          return (typeof mv === 'number' && typeof rv === 'number' && rv !== 0) ? mv / rv : null;
        });
        setPlotlyDates(dateLabels);
        setPlotlyData([
          { y: marketArr, name: 'Market Value', color: '#3b82f6' },
          { y: realizedArr, name: 'Realized Value', color: '#fbbf24' },
          { y: mvrvArr, name: 'MVRV Ratio', color: '#ffffff' },
        ]);
        setPlotlyRange([jan2012Idx !== -1 ? jan2012Idx : 0, n - 1]);
        setPlotlyLoading(false);
      } catch (e) {
        setPlotlyError('Failed to load data');
        setPlotlyLoading(false);
      }
    }
    fetchPlotly();
  }, []);

  // Temporary debug state
  const [sthDebug, setSthDebug] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch daily close price, market cap, realized price, realized cap, STH realized price, STH realized cap, and STH supply history from the working endpoints
        const [priceHistory, marketCapHistory, realizedPriceHistory, realizedCapHistory, sthRealizedPriceHistory, sthRealizedCapHistory, sthSupplyHistory] = await Promise.all([
          brkClient.fetchDailyCloseHistory(2920), // 8 years of data
          brkClient.fetchMarketCapHistory(2920),
          brkClient.fetchRealizedPriceHistory(2920),
          brkClient.fetchRealizedCapHistory(2920),
          brkClient.fetchSTHRealizedPriceHistory(730), // 2 years of data for STH chart
          brkClient.fetchSTHRealizedCapHistory(2920),
          brkClient.fetchSTHSupplyHistory(730) // 2 years of data for STH chart
        ]);

        // Prepare chart data for 8-year rolling window with both price and realized price
        if (priceHistory.length > 0 && realizedPriceHistory.length > 0) {
          const minLength = Math.min(priceHistory.length, realizedPriceHistory.length)
          const startIdx = priceHistory.length - minLength
          const chartData = Array.from({ length: minLength }, (_, index) => {
            const date = new Date()
            date.setDate(date.getDate() - (minLength - 1 - index))
            return {
              date: date.toISOString().split('T')[0],
              price: priceHistory[startIdx + index],
              realizedPrice: realizedPriceHistory[startIdx + index]
            }
          })
          setPriceChartData(chartData)
        }

        // Prepare STH chart data for 2-year rolling window with both STH and Bitcoin price
        if (sthRealizedPriceHistory.length > 0 && priceHistory.length > 0) {
          // Use the STH data length (730 days) and align with the most recent Bitcoin price data
          const sthLength = sthRealizedPriceHistory.length
          const priceStartIndex = Math.max(0, priceHistory.length - sthLength)
          const sthChartData = Array.from({ length: sthLength }, (_, index) => {
            const date = new Date()
            date.setDate(date.getDate() - (sthLength - 1 - index))
            return {
              date: date.toISOString().split('T')[0],
              price: sthRealizedPriceHistory[index],
              bitcoinPrice: priceHistory[priceStartIndex + index] || 0
            }
          })
          setSthChartData(sthChartData)
        }

        // Helper to format numbers
        const formatNumber = (num: number, isMoney = true) => {
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
        };
        // Helper to calculate 30-day change
        const calcChange = (arr: number[] | undefined, isPercent = true): { change: string; changeType: 'positive' | 'negative' | 'neutral' } => {
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
            changeType
          };
        };
        // Calculate MVRV Ratio and its 30-day change
        let mvrvRatioArr: number[] = [];
        if (marketCapHistory.length === realizedCapHistory.length && marketCapHistory.length > 0) {
          mvrvRatioArr = marketCapHistory.map((mv, i) => {
            const rv = realizedCapHistory[i];
            return rv && rv !== 0 ? mv / rv : NaN;
          });
        }

        // Calculate 200-day Moving Average and Mayer Multiple
        const ma200Arr: number[] = [];
        const mayerMultipleArr: number[] = [];
        if (priceHistory.length >= 200) {
          priceHistory.forEach((price, index) => {
            if (index < 199) {
              ma200Arr.push(NaN); // Not enough data for 200-day MA
              mayerMultipleArr.push(NaN);
            } else {
              const sum = priceHistory.slice(index - 199, index + 1).reduce((a, b) => a + b, 0);
              const ma200 = sum / 200;
              ma200Arr.push(ma200);
              mayerMultipleArr.push(ma200 && ma200 !== 0 ? price / ma200 : NaN);
            }
          });
        }

        // Calculate STH MVRV Ratio (STH Market Value / STH Realized Cap)
        const sthMvrvRatioArr: number[] = [];
        if (priceHistory.length > 0 && sthSupplyHistory.length > 0 && sthRealizedCapHistory.length > 0) {
          const minLength = Math.min(priceHistory.length, sthSupplyHistory.length, sthRealizedCapHistory.length);
          for (let i = 0; i < minLength; i++) {
            const price = priceHistory[i];
            const sthSupplySatoshis = sthSupplyHistory[i];
            const sthRealizedCap = sthRealizedCapHistory[i];
            
            if (price && sthSupplySatoshis && sthRealizedCap && sthRealizedCap !== 0) {
              // Convert satoshis to BTC (divide by 100,000,000)
              const sthSupplyBTC = sthSupplySatoshis / 100000000;
              const sthMarketValue = price * sthSupplyBTC;
              sthMvrvRatioArr.push(sthMarketValue / sthRealizedCap);
            } else {
              sthMvrvRatioArr.push(NaN);
            }
          }
        }
        // Fetch all required metrics for the new card layout
        // Only price is real for now, others are placeholders or N/A
        // TODO: Wire up real endpoints for realized price, true market mean, mayer multiple, etc.
        const realMetrics: MetricCard[] = [
          // Top row
          {
            title: 'Bitcoin Price',
            value: priceHistory.length > 0 ? formatNumber(priceHistory[priceHistory.length - 1]) : 'N/A',
            ...calcChange(priceHistory),
            description: 'Current BTC/USD price'
          },
          {
            title: 'Realized Price',
            value: realizedPriceHistory.length > 0 ? formatNumber(realizedPriceHistory[realizedPriceHistory.length - 1]) : 'N/A',
            ...calcChange(realizedPriceHistory),
            description: 'Realized price per BTC'
          },
          {
            title: '200DMA',
            value: ma200Arr.length > 0 && !isNaN(ma200Arr[ma200Arr.length - 1]) ? formatNumber(ma200Arr[ma200Arr.length - 1]) : 'N/A',
            ...calcChange(ma200Arr),
            description: '200-day moving average'
          },
          {
            title: 'Mayer Multiple',
            value: mayerMultipleArr.length > 0 && !isNaN(mayerMultipleArr[mayerMultipleArr.length - 1]) ? mayerMultipleArr[mayerMultipleArr.length - 1].toFixed(2) : 'N/A',
            ...calcChange(mayerMultipleArr, false),
            description: 'Mayer Multiple ratio'
          },
          // Second row
          {
            title: 'Market Cap',
            value: marketCapHistory.length > 0 ? formatNumber(marketCapHistory[marketCapHistory.length - 1]) : 'N/A',
            ...calcChange(marketCapHistory),
            description: 'Total market value (USD)'
          },
          {
            title: 'Realized Cap',
            value: realizedCapHistory.length > 0 ? formatNumber(realizedCapHistory[realizedCapHistory.length - 1]) : 'N/A',
            ...calcChange(realizedCapHistory),
            description: 'Realized market capitalization'
          },
          {
            title: 'MVRV Ratio',
            value: mvrvRatioArr.length > 0 && !isNaN(mvrvRatioArr[mvrvRatioArr.length - 1]) ? mvrvRatioArr[mvrvRatioArr.length - 1].toFixed(2) : 'N/A',
            ...calcChange(mvrvRatioArr, false),
            description: 'Market Value / Realized Value'
          },
          {
            title: 'STH MVRV Ratio',
            value: sthMvrvRatioArr.length > 0 && !isNaN(sthMvrvRatioArr[sthMvrvRatioArr.length - 1]) ? sthMvrvRatioArr[sthMvrvRatioArr.length - 1].toFixed(2) : 'N/A',
            ...calcChange(sthMvrvRatioArr, false),
            description: 'Short-term holder MVRV ratio'
          },
          {
            title: 'SOPR',
            value: soprCard.value,
            change: soprCard.change,
            changeType: (['positive', 'negative', 'neutral'] as const).includes(soprCard.changeType as any) ? soprCard.changeType as 'positive' | 'negative' | 'neutral' : 'neutral',
            description: 'Spent Output Profit Ratio (SOPR)',
          },
        ];
        setMetrics(realMetrics);
      } catch {
        setError('Failed to fetch price data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [])

  // Calculate price trend for footer
  const calculatePriceTrend = () => {
    if (priceChartData.length < 31) return { percentage: 0, period: '', isPositive: true }
    
    const latest = priceChartData[priceChartData.length - 1]?.price || 0
    const monthAgo = priceChartData[priceChartData.length - 31]?.price || 0
    
    if (monthAgo === 0 || latest === 0) return { percentage: 0, period: '', isPositive: true }
    
    const change = ((latest - monthAgo) / monthAgo) * 100
    return { 
      percentage: Math.abs(change), 
      period: 'this month',
      isPositive: change > 0
    }
  }

  // Calculate STH trend for footer
  const calculateSTHTrend = () => {
    if (sthChartData.length < 31) return { percentage: 0, period: '', isPositive: true }
    
    const latest = sthChartData[sthChartData.length - 1]?.price || 0
    const monthAgo = sthChartData[sthChartData.length - 31]?.price || 0
    
    if (monthAgo === 0 || latest === 0) return { percentage: 0, period: '', isPositive: true }
    
    const change = ((latest - monthAgo) / monthAgo) * 100
    return { 
      percentage: Math.abs(change), 
      period: 'this month',
      isPositive: change > 0
    }
  }

  // Format USD values in short form for Y-axis
  const formatShortUSD = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(0)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(0)}K`;
    } else {
      return `$${Math.round(value)}`;
    }
  };

  const sthMvrvChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderWidth: 0,
        callbacks: {
          label: function(context: any) {
            if (context.dataset.label === 'STH MVRV Ratio') {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
            }
            return `${context.dataset.label}: $${formatShortUSD(context.parsed.y)}`;
          },
        },
      },
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' as const },
        pan: { enabled: true, mode: 'xy' as const },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'year' as const },
        grid: { color: '#374151' },
        ticks: { color: '#9ca3af', maxTicksLimit: 10 },
      },
      y: {
        type: 'logarithmic' as const,
        position: 'left' as const,
        grid: { color: '#374151' },
        afterBuildTicks: function(axis: any) {
          const allValues = axis.chart.data.datasets.filter((ds: any) => ds.yAxisID !== 'y2').flatMap((ds: any) => ds.data).filter((v: any) => typeof v === 'number' && v > 0);
          if (!allValues.length) return;
          const minVal = Math.min(...allValues);
          const maxVal = Math.max(...allValues);
          const logMin = Math.log10(minVal);
          const logMax = Math.log10(maxVal);
          const paddedLogMin = logMin - (logMax - logMin) * 0.1;
          const paddedLogMax = logMax + (logMax - logMin) * 0.1;
          const ticks = [];
          for (let i = 0; i <= 7; i++) {
            const logValue = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 7);
            ticks.push(Math.pow(10, logValue));
          }
          axis.ticks = ticks.map((value: number) => ({ value }));
          axis.min = Math.pow(10, paddedLogMin);
          axis.max = Math.pow(10, paddedLogMax);
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) { return formatShortUSD(value); },
          maxTicksLimit: 8,
        },
      },
      y2: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#ffffff',
          callback: function(value: any) { return value.toFixed(2); },
          maxTicksLimit: 8,
        },
      },
    },
  };

  // Wheel zoom handlers for Recharts
  const handlePriceChartWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const { deltaY, shiftKey } = e
    const zoomFactor = deltaY > 0 ? 1.1 : 0.9
    
    if (priceChartData.length === 0) return
    
    if (shiftKey) {
      // Y-axis zoom
      const visibleData = priceZoomDomain.left !== undefined 
        ? priceChartData.slice(priceZoomDomain.left, priceZoomDomain.right! + 1)
        : priceChartData
      
      const prices = visibleData.flatMap(d => [d.price, d.realizedPrice])
      const currentMin = priceYZoomDomain.min ?? Math.min(...prices)
      const currentMax = priceYZoomDomain.max ?? Math.max(...prices)
      const currentRange = currentMax - currentMin
      const center = (currentMin + currentMax) / 2
      
      const newRange = Math.max(currentRange * 0.01, currentRange * zoomFactor)
      const newMin = center - newRange / 2
      const newMax = center + newRange / 2
      
      setPriceYZoomDomain({ min: newMin, max: newMax })
    } else {
      // X-axis zoom
      const currentLeft = priceZoomDomain.left ?? 0
      const currentRight = priceZoomDomain.right ?? priceChartData.length - 1
      const currentRange = currentRight - currentLeft
      const newRange = Math.max(10, Math.min(priceChartData.length, currentRange * zoomFactor))
      const center = (currentLeft + currentRight) / 2
      
      const newLeft = Math.max(0, Math.floor(center - newRange / 2))
      const newRight = Math.min(priceChartData.length - 1, Math.floor(center + newRange / 2))
      
      setPriceZoomDomain({ left: newLeft, right: newRight })
    }
  }

  const handleSTHChartWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const { deltaY, shiftKey } = e
    const zoomFactor = deltaY > 0 ? 1.1 : 0.9
    
    if (sthChartData.length === 0) return
    
    if (shiftKey) {
      // Y-axis zoom
      const visibleData = sthZoomDomain.left !== undefined 
        ? sthChartData.slice(sthZoomDomain.left, sthZoomDomain.right! + 1)
        : sthChartData
      
      const prices = visibleData.flatMap(d => [d.price, d.bitcoinPrice])
      const currentMin = sthYZoomDomain.min ?? Math.min(...prices)
      const currentMax = sthYZoomDomain.max ?? Math.max(...prices)
      const currentRange = currentMax - currentMin
      const center = (currentMin + currentMax) / 2
      
      const newRange = Math.max(currentRange * 0.01, currentRange * zoomFactor)
      const newMin = center - newRange / 2
      const newMax = center + newRange / 2
      
      setSthYZoomDomain({ min: newMin, max: newMax })
    } else {
      // X-axis zoom
      const currentLeft = sthZoomDomain.left ?? 0
      const currentRight = sthZoomDomain.right ?? sthChartData.length - 1
      const currentRange = currentRight - currentLeft
      const newRange = Math.max(10, Math.min(sthChartData.length, currentRange * zoomFactor))
      const center = (currentLeft + currentRight) / 2
      
      const newLeft = Math.max(0, Math.floor(center - newRange / 2))
      const newRight = Math.min(sthChartData.length - 1, Math.floor(center + newRange / 2))
      
      setSthZoomDomain({ left: newLeft, right: newRight })
    }
  }

  // Mouse pan handlers for Price chart
  const handlePriceMouseDown = (e: React.MouseEvent) => {
    const currentXDomain = {
      left: priceZoomDomain.left ?? 0,
      right: priceZoomDomain.right ?? priceChartData.length - 1
    }
    
    // Always enable Y-axis interaction - calculate current Y domain from visible data
    const visibleData = priceZoomDomain.left !== undefined 
      ? priceChartData.slice(priceZoomDomain.left, priceZoomDomain.right! + 1)
      : priceChartData
    const prices = visibleData.flatMap(d => [d.price, d.realizedPrice])
    
    const currentYDomain = priceYZoomDomain.min !== undefined && priceYZoomDomain.max !== undefined ? {
      min: priceYZoomDomain.min,
      max: priceYZoomDomain.max
    } : {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
    
    setPricePanState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startXDomain: currentXDomain,
      startYDomain: currentYDomain
    })
  }

  const handlePriceMouseMove = (e: React.MouseEvent) => {
    if (!pricePanState.isDragging || !pricePanState.startXDomain || !pricePanState.startYDomain) return
    
    const deltaX = e.clientX - pricePanState.startX
    const deltaY = e.clientY - pricePanState.startY
    
    // X-axis panning
    const xRange = pricePanState.startXDomain.right - pricePanState.startXDomain.left
    const xSensitivity = xRange / 500 // Adjust sensitivity
    const xOffset = Math.round(deltaX * xSensitivity)
    
    const newLeft = Math.max(0, pricePanState.startXDomain.left - xOffset)
    const newRight = Math.min(priceChartData.length - 1, pricePanState.startXDomain.right - xOffset)
    
    setPriceZoomDomain({ left: newLeft, right: newRight })
    
    // Y-axis panning - Chart.js style pixel-based movement
    // Chart height is 192px (h-48), so we scale mouse movement to chart coordinates
    const chartHeight = 192 // h-48 in pixels
    const yRange = pricePanState.startYDomain.max - pricePanState.startYDomain.min
    
    // Convert pixel movement to log-scale value movement
    // Since we use log scale, we need to work in log space
    const logMin = Math.log10(pricePanState.startYDomain.min)
    const logMax = Math.log10(pricePanState.startYDomain.max)
    const logRange = logMax - logMin
    
    // Scale pixel movement to log range (inverted because Y increases downward)
    const logOffset = -(deltaY / chartHeight) * logRange * 0.5 // 0.5 for reasonable sensitivity
    
    const newLogMin = logMin + logOffset
    const newLogMax = logMax + logOffset
    
    setPriceYZoomDomain({
      min: Math.pow(10, newLogMin),
      max: Math.pow(10, newLogMax)
    })
  }

  const handlePriceMouseUp = () => {
    setPricePanState(prev => ({ ...prev, isDragging: false }))
  }

  // Mouse pan handlers for STH chart
  const handleSTHMouseDown = (e: React.MouseEvent) => {
    const currentXDomain = {
      left: sthZoomDomain.left ?? 0,
      right: sthZoomDomain.right ?? sthChartData.length - 1
    }
    
    // Always enable Y-axis interaction - calculate current Y domain from visible data
    const visibleData = sthZoomDomain.left !== undefined 
      ? sthChartData.slice(sthZoomDomain.left, sthZoomDomain.right! + 1)
      : sthChartData
    const prices = visibleData.flatMap(d => [d.price, d.bitcoinPrice])
    
    const currentYDomain = sthYZoomDomain.min !== undefined && sthYZoomDomain.max !== undefined ? {
      min: sthYZoomDomain.min,
      max: sthYZoomDomain.max
    } : {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
    
    setSthPanState({
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startXDomain: currentXDomain,
      startYDomain: currentYDomain
    })
  }

  const handleSTHMouseMove = (e: React.MouseEvent) => {
    if (!sthPanState.isDragging || !sthPanState.startXDomain || !sthPanState.startYDomain) return
    
    const deltaX = e.clientX - sthPanState.startX
    const deltaY = e.clientY - sthPanState.startY
    
    // X-axis panning
    const xRange = sthPanState.startXDomain.right - sthPanState.startXDomain.left
    const xSensitivity = xRange / 500 // Adjust sensitivity
    const xOffset = Math.round(deltaX * xSensitivity)
    
    const newLeft = Math.max(0, sthPanState.startXDomain.left - xOffset)
    const newRight = Math.min(sthChartData.length - 1, sthPanState.startXDomain.right - xOffset)
    
    setSthZoomDomain({ left: newLeft, right: newRight })
    
    // Y-axis panning - Chart.js style pixel-based movement
    // Chart height is 192px (h-48), so we scale mouse movement to chart coordinates
    const chartHeight = 192 // h-48 in pixels
    const yRange = sthPanState.startYDomain.max - sthPanState.startYDomain.min
    
    // Convert pixel movement to log-scale value movement
    // Since we use log scale, we need to work in log space
    const logMin = Math.log10(sthPanState.startYDomain.min)
    const logMax = Math.log10(sthPanState.startYDomain.max)
    const logRange = logMax - logMin
    
    // Scale pixel movement to log range (inverted because Y increases downward)
    const logOffset = -(deltaY / chartHeight) * logRange * 0.5 // 0.5 for reasonable sensitivity
    
    const newLogMin = logMin + logOffset
    const newLogMax = logMax + logOffset
    
    setSthYZoomDomain({
      min: Math.pow(10, newLogMin),
      max: Math.pow(10, newLogMax)
    })
  }

  const handleSTHMouseUp = () => {
    setSthPanState(prev => ({ ...prev, isDragging: false }))
  }

  // Helper to format values for display in cards
  const formatValue = (value: string, title: string) => {
    // Don't format ratio values - they should display as-is
    if (title.includes('Ratio') || title.includes('Multiple')) {
      return value;
    }
    
    const num = Number(value.replace(/[^\\d.]/g, ""));
    if (isNaN(num)) return value;
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return value;
  };

  const priceTrend = calculatePriceTrend()
  const sthTrend = calculateSTHTrend()

  // Calculate Market Cap using the average price from the BTC price card
  function getMarketCapMetric() {
    const parsePrice = (val: string): number | null => {
      if (!val || val === 'N/A') return null;
      if (val.endsWith('T')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e12;
      if (val.endsWith('B')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e9;
      if (val.endsWith('M')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e6;
      if (val.endsWith('K')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e3;
      return parseFloat(val.replace(/[^\d.]/g, ''));
    };
    const price = parsePrice(multiSourceBTCMetric.value);
    const marketCap = price ? price * 21000000 : null;
    const formatMarketCap = (num: number | null) => {
      if (num === null || isNaN(num)) return 'N/A';
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    let change = 'N/A';
    let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (btcPrice7dAgo && price && !isNaN(btcPrice7dAgo) && btcPrice7dAgo !== 0) {
      const marketCap7d = btcPrice7dAgo * 21000000;
      const pct = ((marketCap! - marketCap7d) / marketCap7d) * 100;
      change = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      changeType = pct > 0 ? 'positive' : pct < 0 ? 'negative' : 'neutral';
    }
    return {
      title: 'Market Cap',
      value: formatMarketCap(marketCap),
      change,
      changeType,
      description: 'Total market capitalization',
    };
  }

  // Extract numeric values for market cap and realized cap (and 7d ago) from the respective cards
  const parseNumber = (val: string): number | null => {
    if (!val || val === 'N/A') return null;
    if (val.endsWith('T')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e12;
    if (val.endsWith('B')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e9;
    if (val.endsWith('M')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e6;
    if (val.endsWith('K')) return parseFloat(val.replace(/[^\d.]/g, '')) * 1e3;
    return parseFloat(val.replace(/[^\d.]/g, ''));
  };
  // Market Cap and Realized Cap latest and 7d ago
  const marketCap = parseNumber(getMarketCapMetric().value);
  const realizedCap = parseNumber(realizedCapCard.value);
  // For 7d ago, estimate using percent change
  const get7dAgo = (val: string, change: string): number | null => {
    const n = parseNumber(val);
    if (!n || !change || change === 'N/A') return null;
    const pct = parseFloat(change.replace(/[^-\d.]/g, ''));
    return n / (1 + pct / 100);
  };
  const marketCap7d = get7dAgo(getMarketCapMetric().value, getMarketCapMetric().change);
  const realizedCap7d = get7dAgo(realizedCapCard.value, realizedCapCard.change);
  const mvrvRatioCard = useMVRVRatioCard(marketCap, realizedCap, marketCap7d, realizedCap7d);

  return (
    <DashboardLayout 
      title="Dashboard"
      description="Bitcoin on-chain analytics and market insights"
    >
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            multiSourceBTCMetric,
            realizedPriceCard,
            ma200Card,
            mayerMultipleCard,
            getMarketCapMetric(),
            realizedCapCard,
            mvrvRatioCard,
            soprCard,
            ...metrics.filter(m => m.title !== 'Bitcoin Price' && m.title !== 'Market Cap' && m.title !== 'Realized Price' && m.title !== 'MA200' && m.title !== 'Mayer Multiple' && m.title !== 'Realized Cap' && m.title !== 'MVRV Ratio' && m.title !== '24h Volume' && m.title !== 'Active Addresses' && m.title !== 'SOPR' && m.title !== 'Hash Rate' && m.title !== 'Difficulty')
          ].map((metric, index) => {
              const icons = [DollarSign, BarChart3, Activity, PieChart, TrendingUp, Activity, TrendingDown, BarChart3]
              const Icon = icons[index] || DollarSign
              return (
                <Card key={metric.title} id={`metric-card-${index}`} className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.title}
                    </CardTitle>
                    <div className="flex items-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">{formatValue(metric.value, metric.title)}</div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        {metric.changeType === 'positive' ? (
                          <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        <span 
                          className={metric.changeType === 'positive' ? 'text-green-500' : 'text-red-500'}
                        >
                        {metric.change}
                        </span>
                        <span className="ml-1">from last 7 days</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metric.description}
                      </p>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* Chart Section */}
        {/* MVRV Ratio Template Panel: full width row by itself */}
        <div className="w-full mb-8" style={{ background: '#000', border: '1px solid #1f78c1', borderRadius: 12 }}>
          <div className="flex flex-row items-center mt-4 ml-8">
            <img
              src="/clarion_chain_logo.png"
              alt="Brand Logo"
              className="h-8 w-8 mr-3"
              style={{ display: 'inline-block' }}
            />
            <span className="text-white text-xl font-semibold align-middle">Plotly : MVRV Ratio</span>
          </div>
          <div className="w-full" style={{ height: 800, minHeight: 0 }}>
            {!plotlyLoading && !plotlyError && plotlyRange && plotlyDates.length > 0 && (
              <PlotlyMVRVTemplateDashboard
                height={800}
                width="100%"
                range={plotlyRange}
                dates={plotlyDates}
              />
            )}
            {plotlyLoading && <div className="w-full h-[400px] flex items-center justify-center text-white">Loading chart…</div>}
            {plotlyError && <div className="w-full h-[400px] flex items-center justify-center text-red-400">{plotlyError}</div>}
          </div>
          {/* Slider at the bottom center of the parent panel */}
          <div className="w-full flex flex-row justify-center pb-8">
            {plotlyRange && plotlyDates.length > 0 && (
              <TimeSliderWrapper
                range={plotlyRange}
                setRange={setPlotlyRange}
                min={0}
                max={plotlyDates.length - 1}
                dates={plotlyDates}
              />
            )}
          </div>
        </div>

        {/* New row: Price Models and STH MVRV Ratio side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price Models panel (existing code) */}
          <Card id="price-chart-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Price Models</CardTitle>
              </div>
              <ShareButton chartId="price-chart-card" userNpub={user?.pubkey || null} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div style={{ height: 400 }}
                   onDoubleClick={() => setPriceRange([new Date('2012-01-01'), new Date()])}>
                <ChartJSLine data={priceModelsData} options={priceModelsChartOptions} />
              </div>
              {/* Time Range Slider */}
              <TimeRangeSlider
                min={new Date('2012-01-01')}
                max={new Date()}
                value={priceRange}
                onChange={setPriceRange}
              />
              {/* Custom Legend */}
              <div className="flex justify-end gap-6 mt-2">
                <div className="flex items-center gap-2"><span style={{background:'#3b82f6',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span><span className="text-white text-sm">Price</span></div>
                <div className="flex items-center gap-2"><span style={{background:'#fbbf24',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span><span className="text-white text-sm">Realized Price</span></div>
                <div className="flex items-center gap-2"><span style={{background:'#ffffff',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span><span className="text-white text-sm">True Market Mean</span></div>
                <div className="flex items-center gap-2"><span style={{background:'#a3e635',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span><span className="text-white text-sm">200 DMA</span></div>
              </div>
            </CardContent>
          </Card>
          {/* STH MVRV Ratio panel (existing code, assumed to be the next Card in the grid) */}
          <Card id="sth-chart-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>STH MVRV Ratio</CardTitle>
              </div>
              <ShareButton chartId="sth-chart-card" userNpub={user?.pubkey || null} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div style={{ height: 400 }}>
                <ChartJSLine data={sthMvrvChartData} options={sthMvrvChartOptions} />
              </div>
              {/* Custom HTML Legend - lower right */}
              <div className="flex justify-end gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <span style={{background:'#3b82f6',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span>
                  <span className="text-white text-sm">STH Market Value</span>
                  <span className="text-white text-xs ml-1 font-mono opacity-80">
                    {(() => {
                      const v = getLatestNumberFromDataset(sthMvrvChartData.datasets[0]);
                      return typeof v === 'number' ? `$${(v / 1e9).toFixed(2)}B` : 'N/A';
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{background:'#fbbf24',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span>
                  <span className="text-white text-sm">STH Realized Value</span>
                  <span className="text-white text-xs ml-1 font-mono opacity-80">
                    {(() => {
                      const v = getLatestNumberFromDataset(sthMvrvChartData.datasets[1]);
                      return typeof v === 'number' ? `$${(v / 1e9).toFixed(2)}B` : 'N/A';
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{background:'#ffffff',borderRadius:'50%',width:12,height:12,display:'inline-block'}}></span>
                  <span className="text-white text-sm">STH MVRV Ratio</span>
                  <span className="text-white text-xs ml-1 font-mono opacity-80">
                    {(() => {
                      const v = getLatestNumberFromDataset(sthMvrvChartData.datasets[2]);
                      return typeof v === 'number' ? v.toFixed(2) : 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Section */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Data source connectivity and system health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">BRK API Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">Real-time Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Charts Loading...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

// Add the TimeRangeSlider component at the bottom of the file
function TimeRangeSlider({ min, max, value, onChange }: { min: Date, max: Date, value: [Date, Date], onChange: (v: [Date, Date]) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const minTs = min.getTime();
  const maxTs = max.getTime();
  const [left, right] = value.map(d => d.getTime());
  const handleValueChange = useCallback((v: number[]) => {
    if (v.length === 2) {
      const newLeft = Math.max(minTs, Math.min(v[0], v[1] - 24*3600*1000));
      const newRight = Math.min(maxTs, Math.max(v[1], v[0] + 24*3600*1000));
      onChange([new Date(newLeft), new Date(newRight)]);
    }
  }, [minTs, maxTs, onChange]);
  if (!mounted) return null;
  return (
    <div className="w-full flex flex-col items-center mt-2">
      <Slider.Root
        className="relative flex items-center w-full h-8"
        min={minTs}
        max={maxTs}
        step={24*3600*1000}
        value={[left, right]}
        onValueChange={handleValueChange}
        minStepsBetweenThumbs={1}
      >
        <Slider.Track className="absolute top-1/2 left-0 right-0 h-0.25 bg-gray-700 rounded-full" style={{ transform: 'translateY(-50%)' }}>
          <Slider.Range className="absolute h-0.5 bg-blue-500 rounded-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-3 h-3 bg-[#3b82f6] rounded-full cursor-pointer z-10" />
        <Slider.Thumb className="block w-3 h-3 bg-[#3b82f6] rounded-full cursor-pointer z-10" />
      </Slider.Root>
    </div>
  );
}

// Add the TimeSliderWrapper component at the bottom of the file
function TimeSliderWrapper({ range, setRange, min, max, dates }: { range: [number, number], setRange: (r: [number, number]) => void, min: number, max: number, dates: string[] }) {
  return (
    <div className="w-full flex flex-col items-center justify-center mt-2 mb-2">
      <div style={{ width: '90%' }}>
        <Range
          values={range}
          step={1}
          min={min}
          max={max}
          onChange={(vals: number[]) => setRange([vals[0], vals[1]])}
          renderTrack={({ props, children }: { props: React.HTMLAttributes<HTMLDivElement>; children: React.ReactNode }) => (
            <div
              {...props}
              style={{
                ...props.style,
                height: '1.44px',
                width: '100%',
                background: getTrackBackground({
                  values: range,
                  colors: ['#222', '#3b82f6', '#222'],
                  min,
                  max,
                }),
                borderRadius: '4px',
              }}
            >
              {children}
            </div>
          )}
          renderThumb={({ props }: { props: any }) => {
            const { key, ...rest } = props;
            return (
              <div
                key={key}
                {...rest}
                style={{
                  ...rest.style,
                  height: '13.2px',
                  width: '13.2px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  border: 'none',
                  boxShadow: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 3,
                }}
              />
            );
          }}
        />
      </div>
    </div>
  )
}
