"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Users, Clock } from "lucide-react"
import { useEffect, useState } from "react"
import { brkClient } from "@/lib/api/brkClient"
import dynamic from 'next/dynamic'

const ChartJSLine = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false
})

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

  useEffect(() => {
    async function fetchSupplyData() {
      try {
        const [lthSupply, sthSupply, priceHistory] = await Promise.all([
          brkClient.fetchLTHSupplyHistory(2555),
          brkClient.fetchSTHSupplyHistory(2555),
          brkClient.fetchDailyCloseHistory(2555)
        ])

        const combinedData: SupplyData[] = []
        const endDate = new Date()
        
        for (let i = 0; i < Math.min(lthSupply.length, sthSupply.length, priceHistory.length); i++) {
          const date = new Date(endDate)
          date.setDate(date.getDate() - (lthSupply.length - 1 - i))
          
          const price = priceHistory[i]
          const totalSupply = lthSupply[i] + sthSupply[i] // Calculate total supply
          combinedData.push({
            date: date.toISOString().split('T')[0],
            totalSupply: totalSupply,
            lthSupply: lthSupply[i],
            sthSupply: sthSupply[i],
            lthSupplyUSD: lthSupply[i] * price,
            sthSupplyUSD: sthSupply[i] * price,
            price: price
          })
        }

        setSupplyData(combinedData)
      } catch (error) {
        console.error('Failed to fetch supply data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSupplyData()
  }, [])

  if (loading) {
    return (
      <DashboardLayout title="Supply Analysis">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading supply data...</div>
        </div>
      </DashboardLayout>
    )
  }

  const calculateTrend = (data: SupplyData[], key: keyof SupplyData) => {
    if (data.length < 2) return 0
    const recent = data[data.length - 1][key] as number
    const previous = data[data.length - 2][key] as number
    return ((recent - previous) / previous) * 100
  }

  const lthTrend = calculateTrend(supplyData, 'lthSupply')
  const sthTrend = calculateTrend(supplyData, 'sthSupply')
  const totalTrend = calculateTrend(supplyData, 'totalSupply')
  const priceTrend = calculateTrend(supplyData, 'price')

  const getTrendIcon = (trend: number) => {
    if (trend > 0.1) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < -0.1) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const formatShort = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`
    return Math.round(value).toString()
  }

  const formatSupply = (value: number) => {
    // Convert from satoshis to BTC first
    const btcValue = value / 1e8
    if (btcValue >= 1e6) return `${(btcValue / 1e6).toFixed(0)}M BTC`
    if (btcValue >= 1e3) return `${(btcValue / 1e3).toFixed(0)}K BTC`
    return `${btcValue.toFixed(0)} BTC`
  }

  const formatSupplyShort = (value: number) => {
    // Convert from satoshis to BTC first
    const btcValue = value / 1e8
    if (btcValue >= 1e6) return `${(btcValue / 1e6).toFixed(0)}M`
    if (btcValue >= 1e3) return `${(btcValue / 1e3).toFixed(0)}K`
    return btcValue.toFixed(0)
  }

  const formatPrice = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  const formatPriceShort = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
    return `$${Math.round(value)}`
  }

  // Calculate logarithmic ticks for even spacing
  // This ensures Y-axis ticks are visually evenly spaced on logarithmic scale
  const calculateLogTicks = (values: number[]) => {
    // Find the min/max values in the dataset (filter out zeros for log scale)
    const minVal = Math.min(...values.filter(v => v > 0))
    const maxVal = Math.max(...values)
    
    // Convert to logarithmic space
    const logMin = Math.log10(minVal)
    const logMax = Math.log10(maxVal)
    const logRange = logMax - logMin
    
    // Add 10% padding on both ends for better visualization
    const paddedLogMin = logMin - (logRange * 0.1)
    const paddedLogMax = logMax + (logRange * 0.1)
    
    // Generate 7 evenly spaced ticks in logarithmic space (0-6 range)
    const ticks = []
    for (let i = 0; i <= 6; i++) {
      const logValue = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 6)
      // Convert back to linear space
      ticks.push(Math.pow(10, logValue))
    }
    
    return { ticks, paddedLogMin, paddedLogMax }
  }

  // Calculate ticks for LTH Supply chart (left Y-axis: supply, right Y-axis: price)
  const lthSupplyValues = supplyData.map(d => d.lthSupply)
  const lthPriceValues = supplyData.map(d => d.price)
  const lthSupplyTicks = calculateLogTicks(lthSupplyValues)
  const lthPriceTicks = calculateLogTicks(lthPriceValues)

  // Calculate ticks for STH Supply chart (left Y-axis: supply, right Y-axis: price)
  const sthSupplyValues = supplyData.map(d => d.sthSupply)
  const sthPriceValues = supplyData.map(d => d.price)
  const sthSupplyTicks = calculateLogTicks(sthSupplyValues)
  const sthPriceTicks = calculateLogTicks(sthPriceValues)

  return (
    <DashboardLayout title="Supply Analysis">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Supply</p>
                  <p className="text-2xl font-bold">
                    {supplyData.length > 0 ? formatSupply(supplyData[supplyData.length - 1].totalSupply) : '0M BTC'}
                  </p>
                </div>
                {getTrendIcon(totalTrend)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">LTH Supply</p>
                  <p className="text-2xl font-bold">
                    {supplyData.length > 0 ? formatSupply(supplyData[supplyData.length - 1].lthSupply) : '0M BTC'}
                  </p>
                </div>
                {getTrendIcon(lthTrend)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">STH Supply</p>
                  <p className="text-2xl font-bold">
                    {supplyData.length > 0 ? formatSupply(supplyData[supplyData.length - 1].sthSupply) : '0M BTC'}
                  </p>
                </div>
                {getTrendIcon(sthTrend)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bitcoin Price</p>
                  <p className="text-2xl font-bold">
                    {supplyData.length > 0 ? formatPrice(supplyData[supplyData.length - 1].price) : '$0'}
                  </p>
                </div>
                {getTrendIcon(priceTrend)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
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
                          display: false,
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
                          },
                          // Set explicit bounds using calculated padded values
                          min: Math.pow(10, lthSupplyTicks.paddedLogMin),
                          max: Math.pow(10, lthSupplyTicks.paddedLogMax),
                          // Override Chart.js default tick generation with our evenly spaced ticks
                          afterBuildTicks: function(axis: any) {
                            axis.ticks = lthSupplyTicks.ticks.map((value: number) => ({ value }))
                          },
                        },
                        y1: {
                          type: 'logarithmic',
                          position: 'right',
                          grid: {
                            drawOnChartArea: false, // Don't draw grid lines for right axis
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatPriceShort(value)
                            },
                          },
                          // Set explicit bounds using calculated padded values
                          min: Math.pow(10, lthPriceTicks.paddedLogMin),
                          max: Math.pow(10, lthPriceTicks.paddedLogMax),
                          // Override Chart.js default tick generation with our evenly spaced ticks
                          afterBuildTicks: function(axis: any) {
                            axis.ticks = lthPriceTicks.ticks.map((value: number) => ({ value }))
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
              {/* Custom HTML Legend - positioned lower right with solid circle dots */}
              <div className="flex justify-end mt-4 space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-white">Bitcoin Price</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-sm text-white">LTH Supply</span>
                </div>
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
                          display: false,
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
                          },
                          // Set explicit bounds using calculated padded values
                          min: Math.pow(10, sthSupplyTicks.paddedLogMin),
                          max: Math.pow(10, sthSupplyTicks.paddedLogMax),
                          // Override Chart.js default tick generation with our evenly spaced ticks
                          afterBuildTicks: function(axis: any) {
                            axis.ticks = sthSupplyTicks.ticks.map((value: number) => ({ value }))
                          },
                        },
                        y1: {
                          type: 'logarithmic',
                          position: 'right',
                          grid: {
                            drawOnChartArea: false, // Don't draw grid lines for right axis
                          },
                          ticks: {
                            color: '#9ca3af',
                            callback: function(value: any) {
                              return formatPriceShort(value)
                            },
                          },
                          // Set explicit bounds using calculated padded values
                          min: Math.pow(10, sthPriceTicks.paddedLogMin),
                          max: Math.pow(10, sthPriceTicks.paddedLogMax),
                          // Override Chart.js default tick generation with our evenly spaced ticks
                          afterBuildTicks: function(axis: any) {
                            axis.ticks = sthPriceTicks.ticks.map((value: number) => ({ value }))
                          },
                        },
                      },
                    }}
                  />
                )}
              </div>
              {/* Custom HTML Legend - positioned lower right with solid circle dots */}
              <div className="flex justify-end mt-4 space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-white">Bitcoin Price</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span className="text-sm text-white">STH Supply</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 