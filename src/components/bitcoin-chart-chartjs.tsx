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
// Dynamic import for zoom plugin to avoid SSR issues
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { brkClient } from '@/lib/api/brkClient'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSidebar } from "@/components/ui/sidebar"
import * as Slider from '@radix-ui/react-slider'

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
  realizedPrice?: number[]
  trueMarketMean?: number[]
  lthMarketValue?: number[]
  lthRealizedValue?: number[]
  lthMvrvRatios?: number[]
  sthMarketValue?: number[]
  sthRealizedValue?: number[]
  sthMvrvRatios?: number[]
}

type MetricType = 'mvrv' | 'price' | 'volume' | 'onchain' | 'profit-loss'

interface BitcoinChartProps {
  selectedMetric?: MetricType
  chartSection?: 'main' | 'ratio' | 'full'
  range?: [number, number]
  onDataLengthChange?: (len: number) => void
  visibleTraces?: Record<TraceKey, boolean>
  onTraceToggle?: (key: TraceKey) => void
}

// Add type for visibleTraces keys
const TRACE_KEYS = [
  'price',
  'ma200',
  'realizedPrice',
  'trueMarketMean',
  'mayer',
  'priceRealized',
  'priceTrueMean',
  'lthMarketValue',
  'lthRealizedValue',
  'mvrv',
  'lthMvrv',
  'sthMarketValue',
  'sthRealizedValue',
  'sthMvrv'
] as const

type TraceKey = typeof TRACE_KEYS[number]

const BitcoinChartJS = forwardRef<BitcoinChartRef, BitcoinChartProps>(({ selectedMetric = 'mvrv', chartSection = 'full', range: propRange, onDataLengthChange, visibleTraces: externalVisibleTraces, onTraceToggle }, ref) => {
  const [data, setData] = useState<ChartData | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [chartKey, setChartKey] = useState(0) // Force chart recreation
  const chartRef = useRef<ChartJS<'line'> | null>(null)
  const ratioChartRef = useRef<ChartJS<'line'> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get sidebar state
  const { state: sidebarState } = useSidebar()

  // Add state for trace visibility (use external state if provided)
  const [internalVisibleTraces, setInternalVisibleTraces] = useState<Record<TraceKey, boolean>>({
    price: true,
    ma200: true,
    realizedPrice: true,
    trueMarketMean: true,
    mayer: true,
    priceRealized: false,
    priceTrueMean: false,
    lthMarketValue: false,
    lthRealizedValue: false,
    mvrv: true,
    lthMvrv: false,
    sthMarketValue: false,
    sthRealizedValue: false,
    sthMvrv: false
  })
  
  const visibleTraces = externalVisibleTraces || internalVisibleTraces

  // Use propRange if provided, otherwise use internal state
  const [range, setRange] = useState<[number, number]>([0, (data?.dates.length ?? 1) - 1])
  useEffect(() => {
    if (data?.dates && !propRange) {
      setRange([0, data.dates.length - 1])
    }
  }, [data?.dates?.length])
  const effectiveRange = propRange || range
  const rangeStart = Math.min(effectiveRange[0], effectiveRange[1])
  const rangeEnd = Math.max(effectiveRange[0], effectiveRange[1])
  const visibleDates = data?.dates?.slice(rangeStart, rangeEnd + 1) ?? []
  const sliceArr = (arr?: number[]) => arr ? arr.slice(rangeStart, rangeEnd + 1) : []

  // Helper to toggle traces
  const handleLegendClick = (key: TraceKey) => {
    if (onTraceToggle) {
      // Use external callback if provided
      onTraceToggle(key)
    } else {
      // Use internal state
      setInternalVisibleTraces(prev => ({
        ...prev,
        [key]: !prev[key]
      }))
    }
    // Force chart re-render when traces are toggled
    setChartKey(prev => prev + 1)
  }

  // Register Chart.js components and plugins in useEffect (client-only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
      setChartReady(true)
      setIsClient(true)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      // For AI Analysis page with separate chart sections, capture individual chart
      if (chartSection === 'main' || chartSection === 'ratio') {
        if (!chartRef.current) {
          throw new Error('Chart component not initialized')
        }
        
        try {
          const canvas = chartRef.current.canvas
          if (!canvas) {
            throw new Error('Chart canvas not available')
          }
          return canvas.toDataURL('image/png', 0.95)
        } catch (error) {
          console.error('Failed to capture chart image:', error)
          throw new Error(`Failed to capture chart image: ${(error as Error).message}`)
        }
      }
      
      // For other pages with both charts in one component (legacy behavior)
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
        const legendItems: { key: TraceKey, color: string, label: string }[] = [
          { key: 'price', color: '#3b82f6', label: 'Price' },
          { key: 'ma200', color: '#fbbf24', label: '200DMA' },
          { key: 'realizedPrice', color: '#10b981', label: 'Realized Price' },
          { key: 'trueMarketMean', color: '#fb923c', label: 'True Market Mean' },
          { key: 'mayer', color: '#ffffff', label: 'Mayer Ratio' },
          { key: 'lthMarketValue', color: '#10b981', label: 'LTH Market Value' },
          { key: 'lthRealizedValue', color: '#fb923c', label: 'LTH Realized Value' },
          { key: 'priceRealized', color: '#10b981', label: 'Price/Realized Price' },
          { key: 'priceTrueMean', color: '#fb923c', label: 'Price/True Market Mean' }
        ]
        
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
    if (!chartReady) return
    
    // Fetch data based on selected metric
    const fetchData = async () => {
      try {
        if (selectedMetric === 'mvrv') {
          // Fetch MVRV Analysis data
          const [marketCapHistory, realizedCapHistory] = await Promise.all([
            brkClient.fetchMarketCapHistory(2920),
            brkClient.fetchRealizedCapHistory(2920)
          ])

          if (marketCapHistory.length > 0 && realizedCapHistory.length > 0) {
            // Generate dates for the last 8 years (EXACT COPY OF PRICE PATTERN)
            const dates: string[] = []
            const endDate = new Date()
            for (let i = marketCapHistory.length - 1; i >= 0; i--) {
              const date = new Date(endDate)
              date.setDate(date.getDate() - i)
              dates.push(date.toISOString().split('T')[0])
            }

            // Find first non-zero index (skip leading zeros like price does with MA200)
            const firstNonZeroIndex = marketCapHistory.findIndex(val => val > 0)
            const skipZeros = Math.max(0, firstNonZeroIndex)

            // Calculate MVRV Ratio (REPLACING PRICE/MA200 RATIO)
            const mvrvRatios = marketCapHistory.map((mv, i) => {
              const rv = realizedCapHistory[i]
              return rv && rv !== 0 ? mv / rv : 0
            })

            // EXACT COPY OF PRICE setData PATTERN (skip leading zeros)
            setData({
              dates: dates.slice(skipZeros), // Skip leading zeros like price skips first 199
              marketValues: [], // Not used for mvrv analysis  
              realizedValues: [], // Not used for mvrv analysis
              mvrvRatios: [], // Not used for mvrv analysis
              priceValues: marketCapHistory.slice(skipZeros), // Market Cap = "Price" equivalent
              priceMA200: realizedCapHistory.slice(skipZeros), // Realized Cap = "MA200" equivalent  
              priceRatios: mvrvRatios.slice(skipZeros), // MVRV Ratio = "Price/MA200" equivalent
              realizedPrice: [], // Not used for mvrv
              trueMarketMean: [], // Not used for mvrv
              lthMarketValue: [], // Not used for mvrv
              lthRealizedValue: [], // Not used for mvrv
              lthMvrvRatios: [], // Not used for mvrv analysis
              sthMarketValue: [], // Not used for mvrv
              sthRealizedValue: [], // Not used for mvrv
              sthMvrvRatios: [] // Not used for mvrv analysis
            })
          }
        } else if (selectedMetric === 'profit-loss') {
          // Fetch Profit & Loss Analysis data (includes LTH and STH Market Value and Realized Value)
          const [marketCapHistory, realizedCapHistory, lthSupplyHistory, lthRealizedValueHistory, sthSupplyHistory, sthRealizedValueHistory, priceHistory] = await Promise.all([
            brkClient.fetchMarketCapHistory(2920),
            brkClient.fetchRealizedCapHistory(2920),
            brkClient.fetchLTHMarketValueHistory(2920),
            brkClient.fetchLTHRealizedValueHistory(2920),
            brkClient.fetchSTHMarketValueHistory(2920),
            brkClient.fetchSTHRealizedValueHistory(2920),
            brkClient.fetchDailyCloseHistory(2920)
          ])

          if (marketCapHistory.length > 0 && realizedCapHistory.length > 0 && lthSupplyHistory.length > 0 && lthRealizedValueHistory.length > 0 && sthSupplyHistory.length > 0 && sthRealizedValueHistory.length > 0 && priceHistory.length > 0) {
            // Generate dates for the last 8 years
            const dates: string[] = []
            const endDate = new Date()
            for (let i = marketCapHistory.length - 1; i >= 0; i--) {
              const date = new Date(endDate)
              date.setDate(date.getDate() - i)
              dates.push(date.toISOString().split('T')[0])
            }

            // Calculate LTH Market Value (convert satoshis to BTC and multiply by price)
            const lthMarketValueHistory = lthSupplyHistory.map((lthSupplySats, i) => {
              const lthSupplyBTC = (lthSupplySats || 0) / 100000000 // Convert satoshis to BTC
              const price = priceHistory[i] || 0
              return lthSupplyBTC * price
            })

            // Find first non-zero index (skip leading zeros)
            const firstNonZeroIndex = marketCapHistory.findIndex(val => val > 0)
            const skipZeros = Math.max(0, firstNonZeroIndex)

            // Calculate MVRV Ratio
            const mvrvRatios = marketCapHistory.map((mv, i) => {
              const rv = realizedCapHistory[i]
              return rv && rv !== 0 ? mv / rv : 0
            })

            // Calculate LTH MVRV Ratio (LTH Market Value / LTH Realized Value)
            const lthMvrvRatios = lthMarketValueHistory.map((lthMv, i) => {
              const lthRv = lthRealizedValueHistory[i]
              return lthRv && lthRv !== 0 ? lthMv / lthRv : 0
            })

            // Calculate STH Market Value (convert satoshis to BTC and multiply by price)
            const sthMarketValueHistory = sthSupplyHistory.map((sthSupplySats, i) => {
              const sthSupplyBTC = (sthSupplySats || 0) / 100000000 // Convert satoshis to BTC
              const price = priceHistory[i] || 0
              return sthSupplyBTC * price
            })

            // Calculate STH MVRV Ratio (STH Market Value / STH Realized Value)
            const sthMvrvRatios = sthMarketValueHistory.map((sthMv, i) => {
              const sthRv = sthRealizedValueHistory[i]
              return sthRv && sthRv !== 0 ? sthMv / sthRv : 0
            })

            setData({
              dates: dates.slice(skipZeros),
              marketValues: [], // Not used for profit-loss analysis  
              realizedValues: [], // Not used for profit-loss analysis
              mvrvRatios: [], // Not used for profit-loss analysis
              priceValues: marketCapHistory.slice(skipZeros), // Market Cap = "Price" equivalent
              priceMA200: realizedCapHistory.slice(skipZeros), // Realized Cap = "MA200" equivalent  
              priceRatios: mvrvRatios.slice(skipZeros), // MVRV Ratio = "Price/MA200" equivalent
              realizedPrice: [], // Not used for profit-loss
              trueMarketMean: [], // Not used for profit-loss
              lthMarketValue: lthMarketValueHistory.slice(skipZeros), // LTH Market Value
              lthRealizedValue: lthRealizedValueHistory.slice(skipZeros), // LTH Realized Value
              lthMvrvRatios: lthMvrvRatios.slice(skipZeros), // LTH MVRV Ratios
              sthMarketValue: sthMarketValueHistory.slice(skipZeros), // STH Market Value
              sthRealizedValue: sthRealizedValueHistory.slice(skipZeros), // STH Realized Value
              sthMvrvRatios: sthMvrvRatios.slice(skipZeros) // STH MVRV Ratios
            })
          }
        } else if (selectedMetric === 'price') {
          // Fetch Price Analysis data
          const [priceHistory, realizedPriceHistory, trueMarketMeanHistory] = await Promise.all([
            brkClient.fetchDailyCloseHistory(2920),
            brkClient.fetchRealizedPriceHistory(2920),
            brkClient.fetchTrueMarketMeanHistory(2920)
          ])

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

            // Align realized price and true market mean to MA200 window
            const realizedPrice = realizedPriceHistory.slice(199)
            const trueMarketMean = trueMarketMeanHistory.slice(199)

            setData({
              dates: dates.slice(199), // Align with MA200 data
              marketValues: [], // Not used for price analysis
              realizedValues: [], // Not used for price analysis
              mvrvRatios: [], // Not used for price analysis
              priceValues: priceHistory.slice(199),
              priceMA200,
              priceRatios,
              realizedPrice,
              trueMarketMean,
              lthMarketValue: [], // Not used for price analysis
              lthRealizedValue: [], // Not used for price analysis
              lthMvrvRatios: [], // Not used for price analysis
              sthMarketValue: [], // Not used for price analysis
              sthRealizedValue: [], // Not used for price analysis
              sthMvrvRatios: [] // Not used for price analysis
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        console.error('Error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          selectedMetric
        })
        setData(null)
      }
    }

    fetchData()
  }, [chartReady, selectedMetric])

  useEffect(() => {
    if (data?.dates && onDataLengthChange) {
      onDataLengthChange(data.dates.length)
    }
  }, [data?.dates?.length])

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
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout)
      resizeObserver.disconnect()
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
    }
  }, [isClient])

  if (!isClient || !chartReady) {
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
          <p className="text-muted-foreground mb-2">Loading {selectedMetric === 'mvrv' ? 'MVRV Analysis' : selectedMetric === 'price' ? 'Price Analysis' : selectedMetric === 'profit-loss' ? 'Profit & Loss Analysis' : 'Chart'} Chart...</p>
          <p className="text-sm text-muted-foreground">Fetching 8-year rolling window data</p>
        </div>
      </div>
    )
  }

  const { dates, marketValues, realizedValues, mvrvRatios, priceValues, priceMA200, priceRatios, realizedPrice, trueMarketMean, lthMarketValue, lthRealizedValue, lthMvrvRatios, sthMarketValue, sthRealizedValue, sthMvrvRatios } = data

  // Metric configuration
  const metricConfigs = {
    mvrv: {
      mainChart: {
        datasets: [
          {
            label: 'Market Value',
            data: priceValues || [], // Using priceValues (Market Cap)
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: 'Realized Value', 
            data: priceMA200 || [], // Using priceMA200 (Realized Cap)
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
          }
        ]
      },
      ratioChart: {
        datasets: [
          {
            label: 'MVRV Ratio',
            data: priceRatios || [], // Using priceRatios (MVRV Ratio)
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
    'profit-loss': {
      mainChart: {
        datasets: [
          {
            label: 'Market Value',
            data: priceValues || [], // Using priceValues (Market Cap)
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
          {
            label: 'Realized Value', 
            data: priceMA200 || [], // Using priceMA200 (Realized Cap)
            borderColor: '#eab308',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
          },
          {
            label: 'LTH Market Value',
            data: lthMarketValue || [], // LTH Market Value
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
          }
        ]
      },
      ratioChart: {
        datasets: [
          {
            label: 'MVRV Ratio',
            data: priceRatios || [], // Using priceRatios (MVRV Ratio)
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
        { color: '#10b981', label: 'LTH Market Value' },
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
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
          },
          {
            label: 'Realized Price',
            data: realizedPrice || [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
          },
          {
            label: 'True Market Mean',
            data: trueMarketMean || [],
            borderColor: '#fb923c',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
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
        { color: '#fbbf24', label: '200DMA' },
        { color: '#10b981', label: 'Realized Price' },
        { color: '#fb923c', label: 'True Market Mean' },
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

  // Calculate dynamic USD axis configuration based on metric
  let allUSDValues: number[]
  let minUSD: number, maxUSD: number, logMin: number, logMax: number, logRange: number
  let paddedLogMin: number, paddedLogMax: number, usdLogTicks: number[]
  
  if (selectedMetric === 'mvrv' || selectedMetric === 'profit-loss') {
    // MVRV Analysis: Use price data structure (EXACT COPY OF PRICE PATTERN)
    const visiblePriceValues = sliceArr(priceValues)
    const visibleMA200Values = sliceArr(priceMA200)
    allUSDValues = [...visiblePriceValues, ...visibleMA200Values].filter(v => v > 0)
  } else if (selectedMetric === 'price') {
    // Price Analysis: Use ONLY the visible/sliced data for tight Y-axis scaling
    const visiblePriceValues = sliceArr(priceValues || [])
    const visibleMA200 = sliceArr(priceMA200 || [])
    const visibleRealizedPrice = sliceArr(realizedPrice || [])
    const visibleTrueMarketMean = sliceArr(trueMarketMean || [])
    allUSDValues = [...visiblePriceValues, ...visibleMA200, ...visibleRealizedPrice, ...visibleTrueMarketMean].filter(v => v > 0)
  } else {
    // Fallback
    allUSDValues = [...marketValues, ...realizedValues].filter(v => v > 0)
  }
  
  if (allUSDValues.length > 0) {
    minUSD = Math.min(...allUSDValues)
    maxUSD = Math.max(...allUSDValues)
    
    // Calculate logarithmic range with even visual spacing
    logMin = Math.log10(minUSD)
    logMax = Math.log10(maxUSD)
    logRange = logMax - logMin
    
    // Helper function for nice tick values
    const getNextNiceTick = (value: number) => {
      const logV = Math.log10(value)
      const base = Math.floor(logV)
      const pow10 = Math.pow(10, base)
      if (value <= pow10) return pow10
      if (value <= 2 * pow10) return 2 * pow10
      if (value <= 5 * pow10) return 5 * pow10
      return 10 * pow10
    }

    // For price data, use a much tighter range
    if (selectedMetric === 'price') {
      // Set tight bounds around the actual data
      const reasonableMin = minUSD * 0.8  // 20% below minimum
      const reasonableMax = maxUSD * 1.2  // 20% above maximum
      paddedLogMin = Math.log10(reasonableMin)
      paddedLogMax = Math.log10(reasonableMax)
    } else {
      paddedLogMin = logMin - (logRange * 0.05)
      const nextTick = getNextNiceTick(maxUSD * 1.1)
      paddedLogMax = Math.log10(nextTick)
    }

    // Generate evenly spaced logarithmic ticks
    const generateLogTicks = () => {
      const ticks = []
      for (let i = 0; i <= 8; i++) {
        const logValue = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 8)
        ticks.push(Math.pow(10, logValue))
      }
      // Guarantee the last tick is strictly greater than maxUSD
      if (ticks[ticks.length - 1] <= maxUSD) {
        const nextMajor = getNextNiceTick(maxUSD * 1.01)
        ticks[ticks.length - 1] = nextMajor
      }
      return ticks
    }
    
    usdLogTicks = generateLogTicks()
  } else {
    // Fallback values
    paddedLogMin = 3
    paddedLogMax = 6
    usdLogTicks = [1000, 10000, 100000, 1000000]
  }

  // Compute all ratios for the ratio chart
  const mayerRatio = priceValues && priceMA200 ? priceValues.map((p, i) => (priceMA200[i] ? p / priceMA200[i] : 0)) : []
  const priceRealizedRatio = priceValues && realizedPrice ? priceValues.map((p, i) => (realizedPrice[i] ? p / realizedPrice[i] : 0)) : []
  const priceTrueMeanRatio = priceValues && trueMarketMean ? priceValues.map((p, i) => (trueMarketMean[i] ? p / trueMarketMean[i] : 0)) : []

  // Sliced chart data - conditional based on metric
  const mainChartDatasets = selectedMetric === 'mvrv' ? [
    {
      key: 'price',
      label: 'Market Value',
      data: sliceArr(priceValues),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      visible: visibleTraces.price
    },
    {
      key: 'ma200',
      label: 'Realized Value',
      data: sliceArr(priceMA200),
      borderColor: '#eab308',
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      visible: visibleTraces.ma200
    }
  ].filter(ds => ds.visible) : selectedMetric === 'profit-loss' ? [
    {
      key: 'price',
      label: 'Market Value',
      data: sliceArr(priceValues),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      visible: visibleTraces.price
    },
    {
      key: 'ma200',
      label: 'Realized Value',
      data: sliceArr(priceMA200),
      borderColor: '#eab308',
      backgroundColor: 'rgba(234, 179, 8, 0.1)',
      visible: visibleTraces.ma200
    },
    {
      key: 'lthMarketValue',
      label: 'LTH Market Value',
      data: sliceArr(lthMarketValue),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      visible: visibleTraces.lthMarketValue
    },
    {
      key: 'lthRealizedValue',
      label: 'LTH Realized Value',
      data: sliceArr(lthRealizedValue),
      borderColor: '#fb923c',
      backgroundColor: 'rgba(251, 146, 60, 0.1)',
      visible: visibleTraces.lthRealizedValue
    },
    {
      key: 'sthMarketValue',
      label: 'STH Market Value',
      data: sliceArr(sthMarketValue),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      visible: visibleTraces.sthMarketValue
    },
    {
      key: 'sthRealizedValue',
      label: 'STH Realized Value',
      data: sliceArr(sthRealizedValue),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      visible: visibleTraces.sthRealizedValue
    }
  ].filter(ds => ds.visible) : [
    {
      key: 'price',
      label: 'BTC Price',
      data: sliceArr(priceValues),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      visible: visibleTraces.price
    },
    {
      key: 'ma200',
      label: '200DMA',
      data: sliceArr(priceMA200),
      borderColor: '#fbbf24',
      backgroundColor: 'rgba(251, 191, 36, 0.1)',
      visible: visibleTraces.ma200
    },
    {
      key: 'realizedPrice',
      label: 'Realized Price',
      data: sliceArr(realizedPrice),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      visible: visibleTraces.realizedPrice
    },
    {
      key: 'trueMarketMean',
      label: 'True Market Mean',
      data: sliceArr(trueMarketMean),
      borderColor: '#fb923c',
      backgroundColor: 'rgba(251, 146, 60, 0.1)',
      visible: visibleTraces.trueMarketMean
    }
  ].filter(ds => ds.visible)

  const mayerRatioSliced = sliceArr(priceValues).map((p, i) => (sliceArr(priceMA200)[i] ? p / sliceArr(priceMA200)[i] : 0))
  const priceRealizedRatioSliced = sliceArr(priceValues).map((p, i) => (sliceArr(realizedPrice)[i] ? p / sliceArr(realizedPrice)[i] : 0))
  const priceTrueMeanRatioSliced = sliceArr(priceValues).map((p, i) => (sliceArr(trueMarketMean)[i] ? p / sliceArr(trueMarketMean)[i] : 0))

  const ratioChartDatasets = selectedMetric === 'mvrv' ? [
    {
      key: 'mayer',
      label: 'MVRV Ratio',
      data: sliceArr(priceRatios),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.1)',
      visible: visibleTraces.mayer
    }
  ].filter(ds => ds.visible) : selectedMetric === 'profit-loss' ? [
    {
      key: 'mvrv',
      label: 'MVRV Ratio',
      data: sliceArr(priceRatios), // Using priceRatios which contains MVRV data for profit-loss
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.1)',
      visible: visibleTraces.mvrv
    },
    {
      key: 'lthMvrv',
      label: 'LTH MVRV Ratio',
      data: sliceArr(lthMvrvRatios),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.1)',
      visible: visibleTraces.lthMvrv
    },
    {
      key: 'sthMvrv',
      label: 'STH MVRV Ratio',
      data: sliceArr(sthMvrvRatios),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.1)',
      visible: visibleTraces.sthMvrv
    }
  ].filter(ds => ds.visible) : [
    {
      key: 'mayer',
      label: 'Mayer Ratio',
      data: mayerRatioSliced,
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.1)',
      visible: visibleTraces.mayer
    },
    {
      key: 'priceRealized',
      label: 'Price/Realized Price',
      data: priceRealizedRatioSliced,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16,185,129,0.1)',
      visible: visibleTraces.priceRealized
    },
    {
      key: 'priceTrueMean',
      label: 'Price/True Market Mean',
      data: priceTrueMeanRatioSliced,
      borderColor: '#fb923c',
      backgroundColor: 'rgba(251,146,60,0.1)',
      visible: visibleTraces.priceTrueMean
    }
  ].filter(ds => ds.visible)

  const mainChartData = {
    labels: visibleDates,
    datasets: mainChartDatasets.map(dataset => ({
      ...dataset,
      borderWidth: 1,
      fill: false,
      pointRadius: 0,
      pointHoverRadius: 4,
      yAxisID: 'y',
    })),
  }

  const ratioChartData = {
    labels: visibleDates,
    datasets: [
      ...ratioChartDatasets.map(dataset => ({
        ...dataset,
        borderWidth: 0.5,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y',
      })),
      {
        label: 'Center Line',
        data: Array(visibleDates.length).fill(1.0),
        borderColor: '#ffffff',
        backgroundColor: 'transparent',
        borderWidth: 0.5,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        yAxisID: 'y',
        showlegend: false,
        skipTooltip: true, // Custom flag to skip in tooltip
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
      if (ratioChartRef.current) {
        if (elements.length > 0) {
          const activeIndex = elements[0].index
          // Set active elements for main chart (all visible datasets)
          chart.setActiveElements(mainChartDatasets.map((_, i) => ({ datasetIndex: i, index: activeIndex })))
          // Sync with ratio chart (ratioChartDatasets is already filtered)
          ratioChartRef.current.setActiveElements(ratioChartDatasets.map((_, i) => ({ datasetIndex: i, index: activeIndex })))
          ratioChartRef.current.tooltip?.setActiveElements(ratioChartDatasets.map((_, i) => ({ datasetIndex: i, index: activeIndex })), { x: event.x, y: event.y })
        } else {
          // Clear ratio chart tooltip when cursor leaves main chart
          ratioChartRef.current.setActiveElements([])
          ratioChartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
          if (ratioChartRef.current.tooltip) {
            ratioChartRef.current.tooltip.opacity = 0
          }
        }
        ratioChartRef.current.update('none')
      }
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
        position: 'nearest' as const,
        yAlign: 'bottom' as const,
        caretPadding: 10,
        callbacks: {
          title: function(context: any) {
            return visibleDates[context[0].dataIndex]
          },
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${formatUSDValue(value)}`
          }
        }
      },
    },
    layout: {
      padding: 0
    },
    // Set chart area background to match panel
    backgroundColor: 'rgba(17,24,39,1)',
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
      if (chartRef.current) {
        if (elements.length > 0) {
          const activeIndex = elements[0].index
          chartRef.current.setActiveElements(mainChartDatasets.map((_, i) => ({ datasetIndex: i, index: activeIndex })))
          chartRef.current.tooltip?.setActiveElements(mainChartDatasets.map((_, i) => ({ datasetIndex: i, index: activeIndex })), { x: event.x, y: event.y })
        } else {
          chartRef.current.setActiveElements([])
          chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
          if (chartRef.current.tooltip) {
            chartRef.current.tooltip.opacity = 0
          }
        }
        chartRef.current.update('none')
      }
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
        position: 'nearest' as const,
        yAlign: 'bottom' as const,
        caretPadding: 10,
        filter: function(tooltipItem: any) {
          // Completely exclude center line from tooltips
          return tooltipItem.dataset.label !== 'Center Line' && !tooltipItem.dataset.skipTooltip
        },
        callbacks: {
          title: function(context: any) {
            return visibleDates[context[0].dataIndex]
          },
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ${value.toFixed(2)}`
          }
        }
      },
    },
    layout: {
      padding: 0
    },
    // Set chart area background to match panel
    backgroundColor: 'rgba(17,24,39,1)',
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
            return value.toFixed(2).padStart(10, ' ')
          },
        },
        title: {
          display: false,
        },
        min: (() => {
          // Calculate dynamic Y-axis range based on ONLY visible ratio data
          const visibleRatioValues = []
          
          // Include ratios based on selected metric and visible traces
          if (selectedMetric === 'mvrv') {
            if (visibleTraces.mayer) {
              visibleRatioValues.push(...sliceArr(priceRatios).filter(v => v > 0 && v < 100))
            }
          } else if (selectedMetric === 'profit-loss') {
            if (visibleTraces.mvrv) {
              visibleRatioValues.push(...sliceArr(priceRatios).filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.lthMvrv) {
              visibleRatioValues.push(...sliceArr(lthMvrvRatios).filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.sthMvrv) {
              visibleRatioValues.push(...sliceArr(sthMvrvRatios).filter(v => v > 0 && v < 100))
            }
          } else {
            // Price analysis ratios
            if (visibleTraces.mayer) {
              visibleRatioValues.push(...mayerRatioSliced.filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.priceRealized) {
              visibleRatioValues.push(...priceRealizedRatioSliced.filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.priceTrueMean) {
              visibleRatioValues.push(...priceTrueMeanRatioSliced.filter(v => v > 0 && v < 100))
            }
          }
          
          if (visibleRatioValues.length === 0) return 0.5
          
          const minRatio = Math.min(...visibleRatioValues)
          const maxRatio = Math.max(...visibleRatioValues)
          
          // Use tight padding (5%) for better space utilization
          const range = maxRatio - minRatio
          const paddedMin = Math.max(0, minRatio - range * 0.05)
          
          return paddedMin
        })(),
        max: (() => {
          // Calculate dynamic Y-axis range based on ONLY visible ratio data
          const visibleRatioValues = []
          
          // Include ratios based on selected metric and visible traces
          if (selectedMetric === 'mvrv') {
            if (visibleTraces.mayer) {
              visibleRatioValues.push(...sliceArr(priceRatios).filter(v => v > 0 && v < 100))
            }
          } else if (selectedMetric === 'profit-loss') {
            if (visibleTraces.mvrv) {
              visibleRatioValues.push(...sliceArr(priceRatios).filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.lthMvrv) {
              visibleRatioValues.push(...sliceArr(lthMvrvRatios).filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.sthMvrv) {
              visibleRatioValues.push(...sliceArr(sthMvrvRatios).filter(v => v > 0 && v < 100))
            }
          } else {
            // Price analysis ratios
            if (visibleTraces.mayer) {
              visibleRatioValues.push(...mayerRatioSliced.filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.priceRealized) {
              visibleRatioValues.push(...priceRealizedRatioSliced.filter(v => v > 0 && v < 100))
            }
            if (visibleTraces.priceTrueMean) {
              visibleRatioValues.push(...priceTrueMeanRatioSliced.filter(v => v > 0 && v < 100))
            }
          }
          
          if (visibleRatioValues.length === 0) return 3.0
          
          const minRatio = Math.min(...visibleRatioValues)
          const maxRatio = Math.max(...visibleRatioValues)
          
          // Use tight padding (5%) for better space utilization
          const range = maxRatio - minRatio
          const paddedMax = maxRatio + range * 0.05
          
          return paddedMax
        })(),
      },
    },
  }

  // Custom legend items for main and ratio traces - conditional based on metric
  const legendItems: { key: TraceKey, color: string, label: string }[] = selectedMetric === 'mvrv' ? [
    { key: 'price' as TraceKey, color: '#3b82f6', label: 'Market Value' },
    { key: 'ma200' as TraceKey, color: '#eab308', label: 'Realized Value' },
    { key: 'mayer' as TraceKey, color: '#ffffff', label: 'MVRV Ratio' }
  ] : selectedMetric === 'profit-loss' ? [
    { key: 'price' as TraceKey, color: '#3b82f6', label: 'Market Value' },
    { key: 'ma200' as TraceKey, color: '#eab308', label: 'Realized Value' },
    { key: 'mvrv' as TraceKey, color: '#ffffff', label: 'MVRV Ratio' },
    { key: 'lthMarketValue' as TraceKey, color: '#10b981', label: 'LTH Market Value' },
    { key: 'lthRealizedValue' as TraceKey, color: '#fb923c', label: 'LTH Realized Value' },
    { key: 'lthMvrv' as TraceKey, color: '#ffffff', label: 'LTH MVRV Ratio' },
    { key: 'sthMarketValue' as TraceKey, color: '#8b5cf6', label: 'STH Market Value' },
    { key: 'sthRealizedValue' as TraceKey, color: '#f59e0b', label: 'STH Realized Value' },
    { key: 'sthMvrv' as TraceKey, color: '#ffffff', label: 'STH MVRV Ratio' }
  ] : [
    { key: 'price' as TraceKey, color: '#3b82f6', label: 'Price' },
    { key: 'ma200' as TraceKey, color: '#fbbf24', label: '200DMA' },
    { key: 'realizedPrice' as TraceKey, color: '#10b981', label: 'Realized Price' },
    { key: 'trueMarketMean' as TraceKey, color: '#fb923c', label: 'True Market Mean' },
    { key: 'mayer' as TraceKey, color: '#ffffff', label: 'Mayer Ratio' },
    { key: 'priceRealized' as TraceKey, color: '#10b981', label: 'Price/Realized Price' },
    { key: 'priceTrueMean' as TraceKey, color: '#fb923c', label: 'Price/True Market Mean' }
  ]

  // Main render logic
  if (chartSection === 'main') {
    return (
      <div ref={containerRef} className="w-full min-w-0 flex-1 min-h-0 flex flex-col">
        {/* Chart Container - styled to match AI component */}
        <div className="bg-muted/20 min-w-0 flex-1 min-h-0 flex flex-col">
          {/* Legend area - centered vertically with uniform spacing */}
          <div className="flex justify-center items-center h-8 px-4">
            <div className="flex items-center gap-4">
              {legendItems.map((item) => (
                <button
                  key={item.key}
                  className={`flex items-center gap-1 focus:outline-none hover:bg-gray-700 p-1 rounded ${visibleTraces[item.key] ? '' : 'opacity-40 grayscale'}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleLegendClick(item.key)
                  }}
                  type="button"
                  tabIndex={0}
                  aria-pressed={visibleTraces[item.key]}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-white">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Main Chart area */}
          <div 
            className="flex-1 min-h-0 px-4 pb-1"
            onMouseLeave={() => {
              if (chartRef.current && ratioChartRef.current) {
                chartRef.current.setActiveElements([])
                chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
                if (chartRef.current.tooltip) {
                  chartRef.current.tooltip.opacity = 0
                }
                ratioChartRef.current.setActiveElements([])
                ratioChartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
                if (ratioChartRef.current.tooltip) {
                  ratioChartRef.current.tooltip.opacity = 0
                }
                chartRef.current.update('none')
                ratioChartRef.current.update('none')
              }
            }}
          >
            <Line
              key={chartKey}
              ref={chartRef}
              data={mainChartData}
              options={mainChartOptions}
            />
          </div>
        </div>
      </div>
    )
  }

  if (chartSection === 'ratio') {
    return (
      <div ref={containerRef} className="w-full min-w-0 flex-1 min-h-0 flex flex-col">
        <div className="bg-muted/20 min-w-0 flex-1 min-h-0 flex flex-col">
          {/* Ratio Chart area */}
          <div 
            className="flex-1 min-h-0 px-4 pb-2"
            onMouseLeave={() => {
              if (chartRef.current && ratioChartRef.current) {
                chartRef.current.setActiveElements([])
                chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
                if (chartRef.current.tooltip) {
                  chartRef.current.tooltip.opacity = 0
                }
                ratioChartRef.current.setActiveElements([])
                ratioChartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
                if (ratioChartRef.current.tooltip) {
                  ratioChartRef.current.tooltip.opacity = 0
                }
                chartRef.current.update('none')
                ratioChartRef.current.update('none')
              }
            }}
          >
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
  }

  // Default: render both (full)
  return (
    <div ref={containerRef} className="w-full min-w-0 flex-1 min-h-0 flex flex-col">
      {/* Chart Container - styled to match AI component */}
      <div className="bg-muted/20 min-w-0 flex-1 min-h-0 flex flex-col">
        {/* Legend area - centered vertically with uniform spacing */}
        <div className="flex justify-center items-center h-8 px-4">
          <div className="flex items-center gap-4">
            {legendItems.map((item) => (
              <button
                key={item.key}
                className={`flex items-center gap-1 focus:outline-none hover:bg-gray-700 p-1 rounded ${visibleTraces[item.key] ? '' : 'opacity-40 grayscale'}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleLegendClick(item.key)
                }}
                type="button"
                tabIndex={0}
                aria-pressed={visibleTraces[item.key]}
                style={{ cursor: 'pointer' }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-xs text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Main Chart area */}
        <div 
          className="flex-1 min-h-0 px-4 pb-1"
          onMouseLeave={() => {
            if (chartRef.current && ratioChartRef.current) {
              chartRef.current.setActiveElements([])
              chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
              if (chartRef.current.tooltip) {
                chartRef.current.tooltip.opacity = 0
              }
              ratioChartRef.current.setActiveElements([])
              ratioChartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
              if (ratioChartRef.current.tooltip) {
                ratioChartRef.current.tooltip.opacity = 0
              }
              chartRef.current.update('none')
              ratioChartRef.current.update('none')
            }
          }}
        >
          <Line
            key={chartKey}
            ref={chartRef}
            data={mainChartData}
            options={mainChartOptions}
          />
        </div>
        {/* Ratio Chart area */}
        <div 
          className="flex-1 min-h-0 px-4 pb-2"
          onMouseLeave={() => {
            if (chartRef.current && ratioChartRef.current) {
              chartRef.current.setActiveElements([])
              chartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
              if (chartRef.current.tooltip) {
                chartRef.current.tooltip.opacity = 0
              }
              ratioChartRef.current.setActiveElements([])
              ratioChartRef.current.tooltip?.setActiveElements([], { x: 0, y: 0 })
              if (ratioChartRef.current.tooltip) {
                ratioChartRef.current.tooltip.opacity = 0
              }
              chartRef.current.update('none')
              ratioChartRef.current.update('none')
            }
          }}
        >
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