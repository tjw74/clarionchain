"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from "recharts"
import { TrendingUp, TrendingDown, Layers, Users, Clock, Coins } from "lucide-react"
import { brkClient } from "@/lib/api/brkClient"

// Chart configurations
const totalSupplyConfig = {
  supply: {
    label: "Total Supply",
    color: "var(--chart-1)",
  },
}

const lthSupplyConfig = {
  supply: {
    label: "LTH Supply",
    color: "var(--chart-2)",
  },
}

const sthSupplyConfig = {
  supply: {
    label: "STH Supply", 
    color: "var(--chart-3)",
  },
}

const supplyDistributionConfig = {
  lth: {
    label: "Long-term Holders",
    color: "var(--chart-2)",
  },
  sth: {
    label: "Short-term Holders",
    color: "var(--chart-3)",
  },
}

interface SupplyData {
  date: string
  totalSupply: number
  lthSupply: number
  sthSupply: number
  lthSupplyUSD: number
  sthSupplyUSD: number
  price: number
}

export default function SupplyPage() {
  const [supplyData, setSupplyData] = useState<SupplyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSupplyData() {
      try {
        setLoading(true)
        
        // Fetch supply data from BRK API (8 years of data)
        const [lthSupplyHistory, sthSupplyHistory, priceHistory] = await Promise.all([
          brkClient.fetchLTHSupplyHistory(2920),
          brkClient.fetchSTHSupplyHistory(2920),
          brkClient.fetchDailyCloseHistory(2920)
        ])

        if (lthSupplyHistory.length > 0 && sthSupplyHistory.length > 0 && priceHistory.length > 0) {
          const data: SupplyData[] = []
          const dataLength = Math.min(lthSupplyHistory.length, sthSupplyHistory.length, priceHistory.length)
          
          for (let i = 0; i < dataLength; i++) {
            const date = new Date()
            date.setDate(date.getDate() - (dataLength - 1 - i))
            
            // Convert from satoshis to BTC
            const lthSupplyBTC = lthSupplyHistory[i] / 100000000
            const sthSupplyBTC = sthSupplyHistory[i] / 100000000
            const totalSupplyBTC = lthSupplyBTC + sthSupplyBTC
            const price = priceHistory[i]
            
            data.push({
              date: date.toISOString().split('T')[0],
              totalSupply: totalSupplyBTC,
              lthSupply: lthSupplyBTC,
              sthSupply: sthSupplyBTC,
              lthSupplyUSD: lthSupplyBTC * price,
              sthSupplyUSD: sthSupplyBTC * price,
              price: price
            })
          }
          
          setSupplyData(data)
        }
      } catch (err) {
        console.error('Error fetching supply data:', err)
        setError('Failed to fetch supply data')
      } finally {
        setLoading(false)
      }
    }

    fetchSupplyData()
  }, [])

  // Calculate trends for the last 30 days
  const calculateTrend = (data: SupplyData[], key: keyof SupplyData) => {
    if (data.length < 31) return { percentage: 0, isPositive: true }
    
    const latest = data[data.length - 1][key] as number
    const monthAgo = data[data.length - 31][key] as number
    
    if (monthAgo === 0 || latest === 0) return { percentage: 0, isPositive: true }
    
    const change = ((latest - monthAgo) / monthAgo) * 100
    return {
      percentage: Math.abs(change),
      isPositive: change > 0
    }
  }

  const totalSupplyTrend = calculateTrend(supplyData, 'totalSupply')
  const lthSupplyTrend = calculateTrend(supplyData, 'lthSupply')
  const sthSupplyTrend = calculateTrend(supplyData, 'sthSupply')

  // Format supply numbers
  const formatSupply = (value: number) => {
    return `${(value / 1000000).toFixed(2)}M BTC`
  }

  // Format USD values
  const formatUSD = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toLocaleString()}`
  }

  // Get latest values for summary cards
  const latestData = supplyData[supplyData.length - 1]
  const lthPercentage = latestData ? (latestData.lthSupply / latestData.totalSupply * 100) : 0
  const sthPercentage = latestData ? (latestData.sthSupply / latestData.totalSupply * 100) : 0

  if (loading) {
    return (
      <DashboardLayout title="Supply" description="Bitcoin supply distribution and holder analysis">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading supply data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Supply" description="Bitcoin supply distribution and holder analysis">
        <Card className="border-border">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-2">Error loading supply data</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Supply" description="Bitcoin supply distribution and holder analysis">
      <div className="space-y-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData ? formatSupply(latestData.totalSupply) : 'Loading...'}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {totalSupplyTrend.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={totalSupplyTrend.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {totalSupplyTrend.percentage.toFixed(2)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Circulating Bitcoin supply
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTH Supply</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData ? formatSupply(latestData.lthSupply) : 'Loading...'}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {lthSupplyTrend.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={lthSupplyTrend.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {lthSupplyTrend.percentage.toFixed(2)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lthPercentage.toFixed(1)}% of total supply
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">STH Supply</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latestData ? formatSupply(latestData.sthSupply) : 'Loading...'}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {sthSupplyTrend.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={sthSupplyTrend.isPositive ? 'text-green-500' : 'text-red-500'}>
                  {sthSupplyTrend.percentage.toFixed(2)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sthPercentage.toFixed(1)}% of total supply
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTH Dominance</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lthPercentage.toFixed(1)}%
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="text-muted-foreground">
                  Long-term holder ratio
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Held for 155+ days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart Section - Logical Flow */}
        <div className="space-y-6">
          
          {/* 1. Total Supply Overview */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Total Bitcoin Supply
              </CardTitle>
              <CardDescription>
                Total circulating Bitcoin supply over the last 8 years
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={totalSupplyConfig} className="h-64 w-full">
                <AreaChart data={supplyData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.getFullYear().toString()
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                    tickFormatter={(value) => formatSupply(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                      className="bg-blue-600/15 border-0 text-white"
                      formatter={(value: any) => [formatSupply(value), "Total Supply"]}
                      labelFormatter={(label: any) => {
                        const date = new Date(label)
                        return date.toLocaleDateString()
                      }}
                    />}
                  />
                  <defs>
                    <linearGradient id="fillTotalSupply" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-supply)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-supply)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="totalSupply"
                    type="natural"
                    fill="url(#fillTotalSupply)"
                    fillOpacity={0.4}
                    stroke="var(--color-supply)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 2. Supply Distribution (Stacked Area) */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Supply Distribution
              </CardTitle>
              <CardDescription>
                Bitcoin supply breakdown between Long-term Holders (LTH) and Short-term Holders (STH)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={supplyDistributionConfig} className="h-64 w-full">
                <AreaChart data={supplyData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return date.getFullYear().toString()
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                    tickFormatter={(value) => formatSupply(value)}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                      className="bg-blue-600/15 border-0 text-white"
                      formatter={(value: any, name: any) => [
                        formatSupply(value), 
                        name === "lthSupply" ? "LTH Supply" : "STH Supply"
                      ]}
                      labelFormatter={(label: any) => {
                        const date = new Date(label)
                        return date.toLocaleDateString()
                      }}
                    />}
                  />
                  <defs>
                    <linearGradient id="fillLTH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-lth)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-lth)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillSTH" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-sth)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-sth)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="lthSupply"
                    stackId="1"
                    type="natural"
                    fill="url(#fillLTH)"
                    fillOpacity={0.6}
                    stroke="var(--color-lth)"
                  />
                  <Area
                    dataKey="sthSupply"
                    stackId="1"
                    type="natural"
                    fill="url(#fillSTH)"
                    fillOpacity={0.6}
                    stroke="var(--color-sth)"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 3. LTH Supply Charts (BTC & USD) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  LTH Supply (BTC)
                </CardTitle>
                <CardDescription>
                  Long-term Holder supply in Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={lthSupplyConfig} className="h-64 w-full">
                  <LineChart data={supplyData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.getFullYear().toString()
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      tickFormatter={(value) => formatSupply(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        className="bg-blue-600/15 border-0 text-white"
                        formatter={(value: any) => [formatSupply(value), "LTH Supply (BTC)"]}
                        labelFormatter={(label: any) => {
                          const date = new Date(label)
                          return date.toLocaleDateString()
                        }}
                      />}
                    />
                    <Line
                      dataKey="lthSupply"
                      type="natural"
                      stroke="var(--color-supply)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  LTH Supply (USD)
                </CardTitle>
                <CardDescription>
                  Long-term Holder supply value in USD
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={lthSupplyConfig} className="h-64 w-full">
                  <LineChart data={supplyData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.getFullYear().toString()
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      tickFormatter={(value) => formatUSD(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        className="bg-blue-600/15 border-0 text-white"
                        formatter={(value: any) => [formatUSD(value), "LTH Supply (USD)"]}
                        labelFormatter={(label: any) => {
                          const date = new Date(label)
                          return date.toLocaleDateString()
                        }}
                      />}
                    />
                    <Line
                      dataKey="lthSupplyUSD"
                      type="natural"
                      stroke="var(--color-supply)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* 4. STH Supply Charts (BTC & USD) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  STH Supply (BTC)
                </CardTitle>
                <CardDescription>
                  Short-term Holder supply in Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sthSupplyConfig} className="h-64 w-full">
                  <LineChart data={supplyData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.getFullYear().toString()
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      tickFormatter={(value) => formatSupply(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        className="bg-blue-600/15 border-0 text-white"
                        formatter={(value: any) => [formatSupply(value), "STH Supply (BTC)"]}
                        labelFormatter={(label: any) => {
                          const date = new Date(label)
                          return date.toLocaleDateString()
                        }}
                      />}
                    />
                    <Line
                      dataKey="sthSupply"
                      type="natural"
                      stroke="var(--color-supply)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  STH Supply (USD)
                </CardTitle>
                <CardDescription>
                  Short-term Holder supply value in USD
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={sthSupplyConfig} className="h-64 w-full">
                  <LineChart data={supplyData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return date.getFullYear().toString()
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      tickFormatter={(value) => formatUSD(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent
                        className="bg-blue-600/15 border-0 text-white"
                        formatter={(value: any) => [formatUSD(value), "STH Supply (USD)"]}
                        labelFormatter={(label: any) => {
                          const date = new Date(label)
                          return date.toLocaleDateString()
                        }}
                      />}
                    />
                    <Line
                      dataKey="sthSupplyUSD"
                      type="natural"
                      stroke="var(--color-supply)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
} 