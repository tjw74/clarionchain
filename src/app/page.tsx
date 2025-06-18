"use client"

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

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics)
  const [, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [priceChartData, setPriceChartData] = useState<Array<{date: string, price: number, realizedPrice: number}>>([])
  const [sthChartData, setSthChartData] = useState<Array<{date: string, price: number, bitcoinPrice: number}>>([])

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
          const chartData = Array.from({ length: minLength }, (_, index) => {
            const date = new Date()
            date.setDate(date.getDate() - (minLength - 1 - index))
            return {
              date: date.toISOString().split('T')[0],
              price: priceHistory[index],
              realizedPrice: realizedPriceHistory[index]
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
            title: 'Market Value',
            value: marketCapHistory.length > 0 ? formatNumber(marketCapHistory[marketCapHistory.length - 1]) : 'N/A',
            ...calcChange(marketCapHistory),
            description: 'Total market value (USD)'
          },
          {
            title: 'Realized Value',
            value: realizedCapHistory.length > 0 ? formatNumber(realizedCapHistory[realizedCapHistory.length - 1]) : 'N/A',
            ...calcChange(realizedCapHistory),
            description: 'Total realized value (USD)'
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
          }
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

  const priceTrend = calculatePriceTrend()
  const sthTrend = calculateSTHTrend()

  return (
    <DashboardLayout 
      title="Dashboard"
      description="Bitcoin on-chain analytics and market insights"
    >
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.slice(0, 8).map((metric, index) => {
            const icons = [DollarSign, BarChart3, Activity, PieChart, TrendingUp, Activity, TrendingDown, BarChart3]
            const Icon = icons[index] || DollarSign
            // Format large numbers to short form
            const formatValue = (value: string, title: string) => {
              // Don't format ratio values - they should display as-is
              if (title.includes('Ratio') || title.includes('Multiple')) {
                return value;
              }
              
              const num = Number(value.replace(/[^\d.]/g, ""));
              if (isNaN(num)) return value;
              if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
              if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
              if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
              if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
              return value;
            };
            return (
              <Card key={metric.title} className="border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
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
                    <span className="ml-1">from last hour</span>
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
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Price Chart</CardTitle>
              <CardDescription>
                Bitcoin price trend over the last 8 years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={priceChartConfig} className="h-48 w-full">
                <ComposedChart
                  accessibilityLayer
                  data={priceChartData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
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
                    domain={['dataMin', 'dataMax']}
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
                  />
                  <Line
                    dataKey="realizedPrice"
                    type="natural"
                    stroke="#eab308"
                    strokeWidth={1}
                    dot={false}
                  />
                </ComposedChart>
              </ChartContainer>
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
          
          <Card className="border-border">
            <CardHeader>
              <CardTitle>STH Cost Basis</CardTitle>
              <CardDescription>
                STH realized price over the last 2 years
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={sthChartConfig} className="h-48 w-full">
                <ComposedChart
                  accessibilityLayer
                  data={sthChartData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
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
                    domain={['dataMin', 'dataMax']}
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
                  />
                  <Line
                    dataKey="price"
                    type="natural"
                    stroke="#eab308"
                    strokeWidth={1}
                    dot={false}
                  />
                </ComposedChart>
              </ChartContainer>
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
                    <span className="text-sm">STH Cost Basis</span>
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
