"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart, BarChart3 } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { brkClient } from "@/lib/api/brkClient"
import { MetricCard } from "@/types/bitcoin"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

export default function Dashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>(mockMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceChartData, setPriceChartData] = useState<Array<{date: string, price: number}>>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch daily close price, market cap, realized price, and realized cap history from the working endpoints
        const [priceHistory, marketCapHistory, realizedPriceHistory, realizedCapHistory] = await Promise.all([
          brkClient.fetchDailyCloseHistory(2920), // 8 years of data
          brkClient.fetchMarketCapHistory(2920),
          brkClient.fetchRealizedPriceHistory(2920),
          brkClient.fetchRealizedCapHistory(2920)
        ]);

        // Prepare chart data for 8-year rolling window
        if (priceHistory.length > 0) {
          const chartData = priceHistory.map((price, index) => {
            const date = new Date()
            date.setDate(date.getDate() - (priceHistory.length - 1 - index))
            return {
              date: date.toISOString().split('T')[0],
              price: price
            }
          })
          setPriceChartData(chartData)
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
            title: 'True Market Mean',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'True market mean price'
          },
          {
            title: 'Mayer Multiple',
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
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
            value: 'N/A',
            change: 'N/A',
            changeType: 'neutral',
            description: 'Short-term holder MVRV ratio'
          }
        ];
        setMetrics(realMetrics);
      } catch (err) {
        setError('Failed to fetch price data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [])

  // Calculate price trend for footer
  const calculatePriceTrend = () => {
    if (priceChartData.length < 2) return { percentage: 0, period: '' }
    
    const latest = priceChartData[priceChartData.length - 1]?.price || 0
    const monthAgo = priceChartData[priceChartData.length - 31]?.price || 0
    
    if (monthAgo === 0) return { percentage: 0, period: '' }
    
    const change = ((latest - monthAgo) / monthAgo) * 100
    return { 
      percentage: Math.abs(change), 
      period: 'this month',
      isPositive: change > 0
    }
  }

  const priceTrend = calculatePriceTrend()

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
            const formatValue = (value: string) => {
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
                  <div className="text-2xl font-bold">{formatValue(metric.value)}</div>
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
            <CardContent>
              <ChartContainer config={priceChartConfig} className="h-48 w-full">
                <AreaChart
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
                  <ChartTooltip 
                    cursor={false} 
                    content={<ChartTooltipContent 
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Bitcoin Price"]}
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
                        stopColor="var(--color-price)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-price)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="price"
                    type="natural"
                    fill="url(#fillPrice)"
                    fillOpacity={0.4}
                    stroke="var(--color-price)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
            <CardFooter>
              <div className="flex w-full items-start gap-2 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center gap-2 leading-none font-medium">
                    {priceTrend.isPositive ? 'Trending up' : 'Trending down'} by {priceTrend.percentage.toFixed(1)}% {priceTrend.period} <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 leading-none">
                    8-year rolling window
                  </div>
                </div>
              </div>
            </CardFooter>
          </Card>
          
          <Card className="border-border">
            <CardHeader>
              <CardTitle>On-Chain Metrics</CardTitle>
              <CardDescription>
                Key on-chain indicators and network health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-md">
                <p className="text-muted-foreground">
                  On-chain metrics visualization
                </p>
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
