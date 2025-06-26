"use client"

// Force Vercel deployment update
import { useEffect, useState } from "react"
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
            changeType: changeType === 'positive' ? 'positive' : changeType === 'negative' ? 'negative' : 'neutral',
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
            changeType: soprCard.changeType,
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
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(0)}M`
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(0)}K`
    } else {
      return `$${value.toFixed(0)}`
    }
  }

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card id="price-chart-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Price Models</CardTitle>
                <CardDescription>Bitcoin price trend over the last 8 years</CardDescription>
              </div>
              <ShareButton chartId="price-chart-card" userNpub={user?.pubkey || null} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                onWheel={handlePriceChartWheel}
                onMouseDown={handlePriceMouseDown}
                onMouseMove={handlePriceMouseMove}
                onMouseUp={handlePriceMouseUp}
                onMouseLeave={handlePriceMouseUp}
                style={{ cursor: pricePanState.isDragging ? 'grabbing' : 'grab' }}
              >
                <ChartContainer config={priceChartConfig} className="h-48 w-full animate-in slide-in-from-bottom-4 duration-1000 ease-out">
                  <ComposedChart
                    accessibilityLayer
                    data={priceZoomDomain.left !== undefined 
                      ? priceChartData.slice(priceZoomDomain.left, priceZoomDomain.right! + 1)
                      : priceChartData
                    }
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                    syncId="priceCharts"
                  >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: any) => {
                      const date = new Date(value)
                      return date.getFullYear().toString()
                    }}
                  />
                  <YAxis 
                    scale="log" 
                    domain={priceYZoomDomain.min !== undefined && priceYZoomDomain.max !== undefined
                      ? [priceYZoomDomain.min, priceYZoomDomain.max] 
                      : ['dataMin', 'dataMax']
                    }
                    tickFormatter={(value: any) => formatShortUSD(Number(value))}
                    axisLine={false}
                    tickLine={false}
                    orientation="right"
                  />
                  <ChartTooltip 
                    cursor={false} 
                    content={<ChartTooltipContent 
                      className="bg-blue-600/15 border-0 text-white"
                      formatter={(value: any, name: any) => {
                        const label = name === "price" ? "Bitcoin Price" : "Realized Price"
                        return [`$${Number(value).toLocaleString()}`, label]
                      }}
                      labelFormatter={(label: any) => {
                        const date = new Date(label)
                        return date.toLocaleDateString()
                      }}
                    />} 
                  />
                  <defs>
                    <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="price"
                    type="natural"
                    fill="url(#fillPrice)"
                    fillOpacity={0.4}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="realizedPrice"
                    type="natural"
                    stroke="#eab308"
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ChartContainer>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-start justify-between gap-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    {priceTrend.isPositive ? 'Trending up' : 'Trending down'} by {priceTrend.percentage.toFixed(1)}% {priceTrend.period} <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 leading-none">
                    8-year rolling window
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Bitcoin Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm">Realized Price</span>
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
          
          <Card id="sth-chart-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>STH Cost Basis : Realized Price</CardTitle>
                <CardDescription>STH realized price over the last 2 years</CardDescription>
              </div>
              <ShareButton chartId="sth-chart-card" userNpub={user?.pubkey || null} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div 
                onWheel={handleSTHChartWheel}
                onMouseDown={handleSTHMouseDown}
                onMouseMove={handleSTHMouseMove}
                onMouseUp={handleSTHMouseUp}
                onMouseLeave={handleSTHMouseUp}
                style={{ cursor: sthPanState.isDragging ? 'grabbing' : 'grab' }}
              >
                <ChartContainer config={sthChartConfig} className="h-48 w-full animate-in slide-in-from-bottom-4 duration-1000 delay-150 ease-out">
                  <ComposedChart
                    accessibilityLayer
                    data={sthZoomDomain.left !== undefined 
                      ? sthChartData.slice(sthZoomDomain.left, sthZoomDomain.right! + 1)
                      : sthChartData
                    }
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                    syncId="sthCharts"
                  >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: any) => {
                      const date = new Date(value)
                      return date.getFullYear().toString()
                    }}
                  />
                  <YAxis 
                    scale="log" 
                    domain={sthYZoomDomain.min !== undefined && sthYZoomDomain.max !== undefined
                      ? [sthYZoomDomain.min, sthYZoomDomain.max] 
                      : ['dataMin', 'dataMax']
                    }
                    tickFormatter={(value: any) => formatShortUSD(Number(value))}
                    axisLine={false}
                    tickLine={false}
                    orientation="right"
                  />
                  <ChartTooltip 
                    cursor={false} 
                    content={<ChartTooltipContent 
                      className="bg-blue-600/15 border-0 text-white"
                      formatter={(value: any, name: any) => {
                        const label = name === "price" ? "STH Cost Basis" : "Bitcoin Price"
                        return [`$${Number(value).toLocaleString()}`, label]
                      }}
                      labelFormatter={(label: any) => {
                        const date = new Date(label)
                        return date.toLocaleDateString()
                      }}
                    />} 
                  />
                  <defs>
                    <linearGradient id="fillBitcoinPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="bitcoinPrice"
                    type="natural"
                    fill="url(#fillBitcoinPrice)"
                    fillOpacity={0.4}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line
                    dataKey="price"
                    type="natural"
                    stroke="#eab308"
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ChartContainer>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-start justify-between gap-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    {sthTrend.isPositive ? 'Trending up' : 'Trending down'} by {sthTrend.percentage.toFixed(1)}% {sthTrend.period} <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 leading-none">
                    2-year rolling window
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-sm">STH Realized Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Bitcoin Price</span>
                  </div>
                </div>
              </div>
            </CardFooter>
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
