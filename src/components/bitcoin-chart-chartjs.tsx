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
  priceValues?: number[]
  priceMA200?: number[]
  priceRatios?: number[]
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
  const ratioChartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get sidebar state
  const { state: sidebarState } = useSidebar()

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      if (!chartRef.current || !ratioChartRef.current) {
        throw new Error('Charts not ready')
      }
      
      try {
        // Get both canvases
        const mainCanvas = chartRef.current.canvas
        const ratioCanvas = ratioChartRef.current.canvas
        
        // Create a combined canvas
        const combinedCanvas = document.createElement('canvas')
        const ctx = combinedCanvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('Could not get canvas context')
        }
        
        // Set combined canvas dimensions (main chart height + ratio chart height + legend space)
        const legendHeight = 48 // Height of legend area
        const totalHeight = mainCanvas.height + ratioCanvas.height + legendHeight
        const totalWidth = Math.max(mainCanvas.width, ratioCanvas.width)
        
        combinedCanvas.width = totalWidth
        combinedCanvas.height = totalHeight
        
        // Fill with dark background to match the chart theme
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, totalWidth, totalHeight)
        
        // Draw legend area
        ctx.fillStyle = '#ffffff'
        ctx.font = '14px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'center'
        
        const legendY = 30
        const legendCenterX = totalWidth / 2
        
        // Draw legend items
        const legendItems = currentConfig.legend
        
        const itemSpacing = 120
        const startX = legendCenterX - (legendItems.length - 1) * itemSpacing / 2
        
        legendItems.forEach((item, index) => {
          const x = startX + index * itemSpacing
          
          // Draw colored circle
          ctx.fillStyle = item.color
          ctx.beginPath()
          ctx.arc(x - 30, legendY, 6, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw label
          ctx.fillStyle = '#ffffff'
          ctx.fillText(item.label, x, legendY + 5)
        })
        
        // Draw main chart (Market Value + Realized Value)
        ctx.drawImage(mainCanvas, 0, legendHeight)
        
        // Draw ratio chart below main chart
        ctx.drawImage(ratioCanvas, 0, legendHeight + mainCanvas.height)
        
        // Return the combined image as data URL
        return combinedCanvas.toDataURL('image/png', 0.9)
        
      } catch (error) {
        console.error('Failed to capture chart image:', error)
        throw new Error(`Failed to capture chart image: ${(error as Error).message}`)
      }
    }
  }))

  useEffect(() => {
    setIsClient(true)
    
    // Fetch data based on selected metric
    const fetchData = async () => {
      try {
        if (selectedMetric === 'mvrv') {
          // Fetch MVRV data from BRK API
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
        } else if (selectedMetric === 'price') {
          // Fetch Price Analysis data
          const priceHistory = await brkClient.fetchDailyCloseHistory(2920)

          if (priceHistory.length > 0) {
            // Generate dates for the last 8 years
            const dates: string[] = []
            const endDate = new Date()
            for (let i = priceHistory.length - 1; i >= 0; i--) {
              const date = new Date(endDate)
              date.setDate(date.getDate() - i)
              dates.push(date.toISOString().split('T')[0])
            }

            // Calculate 200-day moving average
            const priceMA200 = priceHistory.map((_, index) => {
              if (index < 199) return null // Not enough data for 200-day MA
              const sum = priceHistory.slice(index - 199, index + 1).reduce((a, b) => a + b, 0)
              return sum / 200
            }).filter(val => val !== null) as number[]

            // Calculate Price/MA200 ratio (only for periods where MA200 exists)
            const priceRatios = priceHistory.slice(199).map((price, i) => {
              const ma = priceMA200[i]
              return ma && ma !== 0 ? price / ma : 0
            })

            setData({
              dates: dates.slice(199), // Align with MA200 data
              marketValues: [], // Not used for price analysis
              realizedValues: [], // Not used for price analysis
              mvrvRatios: [], // Not used for price analysis
              priceValues: priceHistory.slice(199),
              priceMA200,
              priceRatios
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setData(null)
      }
    }

    fetchData()
  }, [selectedMetric])

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
      if (ratioChartRef.current) {
        ratioChartRef.current.resize()
        console.log('Ratio chart resize completed')
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
        if (ratioChartRef.current) {
          ratioChartRef.current.resize()
          console.log('Ratio chart resize called')
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
          <p className="text-muted-foreground mb-2">Loading {selectedMetric === 'mvrv' ? 'MVRV Analysis' : selectedMetric === 'price' ? 'Price Analysis' : 'Chart'} Chart...</p>
          <p className="text-sm text-muted-foreground">Fetching 8-year rolling window data</p>
        </div>
      </div>
    )
  }

  const { dates, marketValues, realizedValues, mvrvRatios, priceValues, priceMA200, priceRatios } = data

  // Metric configuration
  const metricConfigs = {
    mvrv: {
      mainChart: {
        datasets: [
          {
            label: 'Market Value',
            data: marketValues,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: 'Realized Value',
            data: realizedValues,
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
          }
        ]
      },
      ratioChart: {
        datasets: [
          {
            label: 'MVRV Ratio',
            data: mvrvRatios,
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        ],
        centerLine: 1.0,
        yRange: [0, 5]
      },
      legend: [
        { color: '#3b82f6', label: 'Market Value' },
        { color: '#eab308', label: 'Realized Value' },
        { color: '#ffffff', label: 'MVRV Ratio' }
      ]
    },
    price: {
      mainChart: {
        datasets: [
          {
            label: 'BTC Price',
            data: priceValues || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: '200-Day MA',
            data: priceMA200 || [],
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
          }
        ]
      },
      ratioChart: {
        datasets: [
          {
            label: 'Price/MA200 Ratio',
            data: priceRatios || [],
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        ],
        centerLine: 1.0,
        yRange: [0.5, 3.0]
      },
      legend: [
        { color: '#3b82f6', label: 'Price' },
        { color: '#eab308', label: '200DMA' },
        { color: '#ffffff', label: 'Mayer Ratio' }
      ]
    }
  }

  const currentConfig = metricConfigs[selectedMetric as keyof typeof metricConfigs] || metricConfigs.mvrv

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

  // Calculate dynamic USD axis configuration for Market Value and Realized Value (logarithmic with even spacing)
  const allUSDValues = [...marketValues, ...realizedValues].filter(v => v > 0)
  const minUSD = Math.min(...allUSDValues)
  const maxUSD = Math.max(...allUSDValues)
  
  // Calculate logarithmic range with even visual spacing
  const logMin = Math.log10(minUSD)
  const logMax = Math.log10(maxUSD)
  const logRange = logMax - logMin
  const paddedLogMin = logMin - (logRange * 0.1) // 10% padding
  const paddedLogMax = logMax + (logRange * 0.1) // 10% padding
  
  // Generate evenly spaced logarithmic ticks
  const generateLogTicks = () => {
    const ticks = []
    for (let i = 0; i <= 8; i++) {
      const logValue = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 8)
      ticks.push(Math.pow(10, logValue))
    }
    return ticks
  }
  
  const usdLogTicks = generateLogTicks()

  // Main chart data (dynamic based on metric)
  const mainChartData = {
    labels: dates,
    datasets: currentConfig.mainChart.datasets.map(dataset => ({
      ...dataset,
      borderWidth: 1,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'y',
    })),
  }

  // Ratio chart data (dynamic based on metric)
  const ratioChartData = {
    labels: dates,
    datasets: [
      ...currentConfig.ratioChart.datasets.map(dataset => ({
        ...dataset,
        borderWidth: 0.5,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y',
      })),
      {
        label: 'Center Line',
        data: Array(dates.length).fill(currentConfig.ratioChart.centerLine),
        borderColor: '#ffffff',
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        yAxisID: 'y',
        showlegend: false,
      },
    ],
  }

  // Main chart options (MV + RV)
  const mainChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onHover: (event: any, elements: any, chart: any) => {
      // Sync tooltip with ratio chart
      if (ratioChartRef.current && elements.length > 0) {
        const activeIndex = elements[0].index
        ratioChartRef.current.setActiveElements([{
          datasetIndex: 0,
          index: activeIndex
        }])
        ratioChartRef.current.tooltip?.setActiveElements([{
          datasetIndex: 0,
          index: activeIndex
        }], { x: event.x, y: event.y })
        ratioChartRef.current.update('none')
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        position: 'nearest' as const,
        yAlign: 'bottom' as const,
        caretPadding: 10,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatUSDValue(value)}`
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'year' as const,
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
        type: 'logarithmic' as const,
        position: 'right' as const,
        display: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
          minRotation: 0,
          maxRotation: 0,
          font: {
            family: 'monospace',
            size: 12,
          },
          callback: function(value: any) {
            return formatUSDValue(value).padStart(10, ' ')
          },
        },
        title: {
          display: false,
        },
        min: Math.pow(10, paddedLogMin),
        max: Math.pow(10, paddedLogMax),
        afterBuildTicks: function(axis: any) {
          axis.ticks = usdLogTicks.map((value: number) => ({ value }))
        },
      },
    },
  }

  // Ratio chart options
  const ratioChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onHover: (event: any, elements: any, chart: any) => {
      // Sync tooltip with main chart
      if (chartRef.current && elements.length > 0) {
        const activeIndex = elements[0].index
        chartRef.current.setActiveElements([
          { datasetIndex: 0, index: activeIndex }, // Market Value
          { datasetIndex: 1, index: activeIndex }  // Realized Value
        ])
        chartRef.current.tooltip?.setActiveElements([
          { datasetIndex: 0, index: activeIndex },
          { datasetIndex: 1, index: activeIndex }
        ], { x: event.x, y: event.y })
        chartRef.current.update('none')
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        position: 'nearest' as const,
        yAlign: 'bottom' as const,
        caretPadding: 10,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${value.toFixed(2)}`
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'year' as const,
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
        type: 'linear' as const,
        position: 'right' as const,
        display: true,
        grid: {
          color: '#374151',
        },
        ticks: {
          color: '#9ca3af',
          minRotation: 0,
          maxRotation: 0,
          font: {
            family: 'monospace',
            size: 12,
          },
          callback: function(value: any) {
            return value.toString().padStart(10, ' ')
          },
        },
        title: {
          display: false,
        },
        min: currentConfig.ratioChart.yRange[0],
        max: currentConfig.ratioChart.yRange[1],
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
            {currentConfig.legend.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-white text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Main Chart area (MV + RV) */}
        <div className="flex-1 px-4 pb-2">
          <Line
            key={chartKey}
            ref={chartRef}
            data={mainChartData}
            options={mainChartOptions}
          />
        </div>
        {/* Ratio Chart area */}
        <div className="h-48 px-4 pb-4">
          <Line
            key={`ratio-${chartKey}`}
            ref={ratioChartRef}
            data={ratioChartData}
            options={ratioChartOptions}
          />
        </div>
      </div>
    </div>
  )
})

BitcoinChartJS.displayName = 'BitcoinChartJS'

export default BitcoinChartJS 