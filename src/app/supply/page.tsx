"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Layers, Users, Clock, Coins } from "lucide-react"
import { brkClient } from "@/lib/api/brkClient"
import dynamic from 'next/dynamic'

// Dynamically import Chart.js to avoid SSR issues
const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
})

// Import Chart.js components
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
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import zoomPlugin from 'chartjs-plugin-zoom'

// Register Chart.js components
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
    Filler,
    zoomPlugin
  )
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
        
        // Fetch supply data from BRK API (10 years of data)
        const [lthSupplyHistory, sthSupplyHistory, priceHistory] = await Promise.all([
          brkClient.fetchLTHSupplyHistory(3650),
          brkClient.fetchSTHSupplyHistory(3650),
          brkClient.fetchDailyCloseHistory(3650)
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

  // Format functions following chart rules
  const formatShort = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`
    return Math.round(value).toString()
  }

  const formatSupply = (value: number) => {
    return `${(value / 1000000).toFixed(2)}M BTC`
  }

  const formatSupplyShort = (value: number) => {
    return `${(value / 1000000).toFixed(0)}M`
  }

  const formatPrice = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  const formatPriceShort = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${Math.round(value)}`
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

        {/* Charts Section */}
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
              <div className="h-[400px] w-full">
                {typeof window !== 'undefined' && (
                  <ChartJSLine
                    data={{
                      labels: supplyData.map(d => d.date),
                      datasets: [
                        {
                          label: 'Bitcoin Price',
                          data: supplyData.map(d => d.price),
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderWidth: 2,
                          fill: false,
                          pointRadius: 0,
                          tension: 0.1,
                          yAxisID: 'y1',
                        },
                        {
                          label: 'LTH Supply',
                          data: supplyData.map(d => d.lthSupply),
                          borderColor: '#fbbf24',
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          borderWidth: 2,
                          fill: false,
                          pointRadius: 0,
                          tension: 0.1,
                          yAxisID: 'y',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'bottom',
                          align: 'end',
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#ffffff',
                          },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderWidth: 0,
                          callbacks: {
                            title: function(context: any) {
                              const date = new Date(context[0].label)
                              return date.toLocaleDateString()
                            },
                            label: function(context: any) {
                              const label = context.dataset.label || ''
                              const value = context.parsed.y
                              if (label === 'Bitcoin Price') {
                                return `${label}: ${formatPrice(value)}`
                              } else {
                                return `${label}: ${formatSupply(value)}`
                              }
                            }
                          }
                        },
                        zoom: {
                          zoom: {
                            wheel: {
                              enabled: true,
                            },
                            pinch: {
                              enabled: true,
                            },
                            mode: 'xy',
                          },
                          pan: {
                            enabled: true,
                            mode: 'xy',
                          },
                        },
                      },
                      scales: {
                        x: {
                          type: 'time',
                          time: {
                            unit: 'year',
                          },
                          grid: {
                            color: '#374151',
                          },
                          ticks: {
                            color: '#9ca3af',
                            maxTicksLimit: 10,
                          },
                        },
                        y: {
                          type: 'logarithmic',
                          position: 'left',
                          grid: {
                            color: '#374151',
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatSupplyShort(value)
                            },
                            maxTicksLimit: 8,
                          },
                        },
                        y1: {
                          type: 'logarithmic',
                          position: 'right',
                          grid: {
                            drawOnChartArea: false,
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatPriceShort(value)
                            },
                            maxTicksLimit: 8,
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>

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
              <div className="h-[400px] w-full">
                {typeof window !== 'undefined' && (
                  <ChartJSLine
                    data={{
                      labels: supplyData.map(d => d.date),
                      datasets: [
                        {
                          label: 'Bitcoin Price',
                          data: supplyData.map(d => d.price),
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          borderWidth: 2,
                          fill: false,
                          pointRadius: 0,
                          tension: 0.1,
                          yAxisID: 'y1',
                        },
                        {
                          label: 'STH Supply',
                          data: supplyData.map(d => d.sthSupply),
                          borderColor: '#fbbf24',
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          borderWidth: 2,
                          fill: false,
                          pointRadius: 0,
                          tension: 0.1,
                          yAxisID: 'y',
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          display: true,
                          position: 'bottom',
                          align: 'end',
                          labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#ffffff',
                          },
                        },
                        tooltip: {
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderWidth: 0,
                          callbacks: {
                            title: function(context: any) {
                              const date = new Date(context[0].label)
                              return date.toLocaleDateString()
                            },
                            label: function(context: any) {
                              const label = context.dataset.label || ''
                              const value = context.parsed.y
                              if (label === 'Bitcoin Price') {
                                return `${label}: ${formatPrice(value)}`
                              } else {
                                return `${label}: ${formatSupply(value)}`
                              }
                            }
                          }
                        },
                        zoom: {
                          zoom: {
                            wheel: {
                              enabled: true,
                            },
                            pinch: {
                              enabled: true,
                            },
                            mode: 'xy',
                          },
                          pan: {
                            enabled: true,
                            mode: 'xy',
                          },
                        },
                      },
                      scales: {
                        x: {
                          type: 'time',
                          time: {
                            unit: 'year',
                          },
                          grid: {
                            color: '#374151',
                          },
                          ticks: {
                            color: '#9ca3af',
                            maxTicksLimit: 10,
                          },
                        },
                        y: {
                          type: 'logarithmic',
                          position: 'left',
                          grid: {
                            color: '#374151',
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatSupplyShort(value)
                            },
                            maxTicksLimit: 8,
                          },
                        },
                        y1: {
                          type: 'logarithmic',
                          position: 'right',
                          grid: {
                            drawOnChartArea: false,
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatPriceShort(value)
                            },
                            maxTicksLimit: 8,
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 