"use client"

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { brkClient } from '@/lib/api/brkClient'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSidebar } from "@/components/ui/sidebar"

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
)

export interface BitcoinChartRef {
  captureImage: () => Promise<string>
}

interface ChartData {
  dates: string[]
  marketValues: number[]
  realizedValues: number[]
  mvrvRatios: number[]
}

type MetricType = 'mvrv' | 'price' | 'volume' | 'onchain'

interface BitcoinChartProps {
  selectedMetric?: MetricType
}

const BitcoinChartJS = forwardRef<BitcoinChartRef, BitcoinChartProps>(({ selectedMetric = 'mvrv' }, ref) => {
  const [data, setData] = useState<ChartData | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [chartKey, setChartKey] = useState(0) // Force chart recreation
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get sidebar state
  const { state: sidebarState } = useSidebar()

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      if (!chartRef.current) {
        throw new Error('Chart not ready')
      }
      
      try {
        const canvas = chartRef.current.canvas
        return canvas.toDataURL('image/png', 0.9)
      } catch (error) {
        console.error('Failed to capture chart image:', error)
        throw new Error(`Failed to capture chart image: ${(error as Error).message}`)
      }
    }
  }))

  useEffect(() => {
    setIsClient(true)
    
    // Fetch MVRV data from BRK API
    const fetchMVRVData = async () => {
      try {
        // Fetch 8 years of data (2920 days)
        const [marketCapHistory, realizedCapHistory] = await Promise.all([
          brkClient.fetchMarketCapHistory(2920),
          brkClient.fetchRealizedCapHistory(2920)
        ])

        if (marketCapHistory.length > 0 && realizedCapHistory.length > 0) {
          // Generate dates for the last 8 years
          const dates: string[] = []
          const endDate = new Date()
          for (let i = marketCapHistory.length - 1; i >= 0; i--) {
            const date = new Date(endDate)
            date.setDate(date.getDate() - i)
            dates.push(date.toISOString().split('T')[0])
          }

          // Calculate MVRV Ratio
          const mvrvRatios = marketCapHistory.map((mv, i) => {
            const rv = realizedCapHistory[i]
            return rv && rv !== 0 ? mv / rv : 0
          })

          setData({
            dates,
            marketValues: marketCapHistory,
            realizedValues: realizedCapHistory,
            mvrvRatios
          })
        }
      } catch (error) {
        console.error('Failed to fetch MVRV data:', error)
        setData(null)
      }
    }

    fetchMVRVData()
  }, [])

  // Monitor sidebar state changes and force chart resize
  useEffect(() => {
    if (!isClient || !chartRef.current) return
    
    console.log('Sidebar state changed to:', sidebarState)
    
    // Add a delay to allow the sidebar animation to complete
    const timer = setTimeout(() => {
      console.log('Forcing chart resize due to sidebar state change')
      if (chartRef.current) {
        chartRef.current.resize()
        console.log('Chart resize completed')
      }
    }, 250) // Wait for sidebar animation
    
    return () => clearTimeout(timer)
  }, [sidebarState, isClient])

  // Simplified resize handling - CSS min-width fix should handle the core issue
  useEffect(() => {
    if (!containerRef.current || !isClient) return

    let resizeTimeout: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        console.log('Chart resize triggered, container width:', containerRef.current?.offsetWidth)
        if (chartRef.current) {
          chartRef.current.resize()
          console.log('Chart resize called')
        }
      }, 100) // Shorter delay since CSS should handle the main issue
    }

    // Basic resize observer for container changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log('Container size changed:', entry.contentRect.width, 'x', entry.contentRect.height)
        handleResize()
      }
    })
    
    resizeObserver.observe(containerRef.current)

    // Window resize fallback
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [isClient])

  if (!isClient) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-md">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/50 rounded-md">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Loading MVRV Analysis Chart...</p>
          <p className="text-sm text-muted-foreground">Fetching 8-year rolling window data</p>
        </div>
      </div>
    )
  }

  const { dates, marketValues, realizedValues, mvrvRatios } = data

  // Format USD values with appropriate units
  const formatUSDValue = (value: number) => {
    if (value >= 1e12) {
      const formatted = (value / 1e12).toFixed(2)
      return `$${formatted.replace(/\.?0+$/, '')}T`
    } else if (value >= 1e9) {
      const formatted = (value / 1e9).toFixed(2)
      return `$${formatted.replace(/\.?0+$/, '')}B`
    } else if (value >= 1e6) {
      const formatted = (value / 1e6).toFixed(2)
      return `$${formatted.replace(/\.?0+$/, '')}M`
    } else if (value >= 1e3) {
      const formatted = (value / 1e3).toFixed(2)
      return `$${formatted.replace(/\.?0+$/, '')}K`
    } else {
      return `$${value.toFixed(2).replace(/\.?0+$/, '')}`
    }
  }

  // Calculate evenly spaced log ticks
  const calculateLogTicks = (values: number[]) => {
    const minVal = Math.min(...values.filter(v => v > 0))
    const maxVal = Math.max(...values)
    
    const logMin = Math.log10(minVal)
    const logMax = Math.log10(maxVal)
    
    const logRange = logMax - logMin
    const paddedLogMin = logMin - (logRange * 0.05)
    const paddedLogMax = logMax + (logRange * 0.05)
    
    const tickvals = []
    for (let i = 0; i <= 4; i++) {
      const logTick = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 4)
      const tickValue = Math.pow(10, logTick)
      
      let roundedValue
      if (tickValue >= 1e12) {
        roundedValue = Math.round(tickValue / 1e10) * 1e10
      } else if (tickValue >= 1e11) {
        roundedValue = Math.round(tickValue / 1e9) * 1e9
      } else if (tickValue >= 1e10) {
        roundedValue = Math.round(tickValue / 1e8) * 1e8
      } else if (tickValue >= 1e9) {
        roundedValue = Math.round(tickValue / 1e7) * 1e7
      } else {
        roundedValue = Math.round(tickValue / 1e6) * 1e6
      }
      
      tickvals.push(roundedValue)
    }
    
    return tickvals
  }

  const topSubplotTicks = calculateLogTicks([...marketValues, ...realizedValues])

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Market Value',
        data: marketValues,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Realized Value',
        data: realizedValues,
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'MVRV Ratio',
        data: mvrvRatios,
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y1',
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          color: '#ffffff',
          usePointStyle: true,
          padding: 20,
        },
        fullSize: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            if (context.datasetIndex < 2) {
              return `${label}: ${formatUSDValue(value)}`
            } else {
              return `${label}: ${value.toFixed(2)}`
            }
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'month' as const,
        },
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
        },
      },
      y: {
        type: 'logarithmic' as const,
        position: 'right' as const,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value: any) {
            return formatUSDValue(value)
          },
        },
        title: {
          display: true,
          text: 'Value (USD)',
          color: '#9ca3af',
        },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#9ca3af',
        },
        title: {
          display: true,
          text: 'MVRV Ratio',
          color: '#9ca3af',
        },
        min: 0,
        max: 5,
      },
    },
  }

  return (
    // CRITICAL: min-w-0 overrides flexbox default min-width: auto behavior
    // This allows the chart container to shrink when sidebar reopens
    // Without this, flexbox prevents shrinking below content size
    <div ref={containerRef} className="w-full min-w-0">
      {/* Chart Container - styled to match AI component */}
      <div className="border rounded-md bg-muted/20 min-w-0 h-[680px] flex flex-col">
        {/* Legend area - centered vertically with uniform spacing */}
        <div className="flex justify-center items-center h-12 px-4 pt-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-white text-sm">Market Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-white text-sm">Realized Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white"></div>
              <span className="text-white text-sm">MVRV Ratio</span>
            </div>
          </div>
        </div>
        {/* Chart area */}
        <div className="flex-1 px-4 pb-4">
          <Line
            key={chartKey}
            ref={chartRef}
            data={chartData}
            options={{
              ...options,
              plugins: {
                ...options.plugins,
                legend: {
                  display: false, // Hide Chart.js legend since we're using custom
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
})

BitcoinChartJS.displayName = 'BitcoinChartJS'

export default BitcoinChartJS 