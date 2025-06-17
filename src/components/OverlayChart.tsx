"use client"

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { brkClient } from '@/lib/api/brkClient'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface OverlayData {
  type: string
  name: string
  description: string
  annotations?: any[]
  shapes?: any[]
  indicators?: any[]
}

interface OverlayChartProps {
  overlays: OverlayData[]
  timeframe: string
}

export default function OverlayChart({ overlays, timeframe }: OverlayChartProps) {
  const [data, setData] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [revision, setRevision] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Fetch Bitcoin price data
    const fetchPriceData = async () => {
      try {
        const days = timeframe === '1Y' ? 365 : timeframe === '2Y' ? 730 : 2920 // Default 8Y
        const prices = await brkClient.fetchDailyCloseHistory(days)

        if (prices.length > 0) {
          // Generate dates
          const dates: string[] = []
          const endDate = new Date()
          for (let i = prices.length - 1; i >= 0; i--) {
            const date = new Date(endDate)
            date.setDate(date.getDate() - i)
            dates.push(date.toISOString().split('T')[0])
          }

          setData({
            dates,
            prices
          })
        }
      } catch (error) {
        console.error('Failed to fetch price data:', error)
        setData(null)
      }
    }

    fetchPriceData()
  }, [timeframe])

  // Force re-render when container size changes
  useEffect(() => {
    if (!containerRef.current || !isClient) return

    const resizeObserver = new ResizeObserver(() => {
      setRevision(prev => prev + 1)
    })

    resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [isClient])

  if (!isClient) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-muted/50 rounded-md">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-muted/50 rounded-md">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Loading Bitcoin Price Chart...</p>
          <p className="text-sm text-muted-foreground">Preparing overlay canvas</p>
        </div>
      </div>
    )
  }

  const { dates, prices } = data

  // Combine all annotations and shapes from overlays
  const allAnnotations = overlays.flatMap(overlay => overlay.annotations || [])
  const allShapes = overlays.flatMap(overlay => overlay.shapes || [])
  
  // Create traces
  const traces: any[] = [
    {
      x: dates,
      y: prices,
      type: 'scatter',
      mode: 'lines',
      name: 'Bitcoin Price',
      line: {
        color: '#f7931a',
        width: 2
      },
      hovertemplate: '<b>%{y:$,.0f}</b><br>%{x}<extra></extra>'
    }
  ]

  // Add indicator traces if any overlays have them
  overlays.forEach(overlay => {
    if (overlay.indicators) {
      overlay.indicators.forEach(indicator => {
        traces.push({
          x: dates,
          y: indicator.values,
          type: 'scatter',
          mode: 'lines',
          name: indicator.name,
          line: {
            color: indicator.color,
            width: 1
          },
          yaxis: indicator.yAxis || 'y',
          hovertemplate: `<b>${indicator.name}: %{y:.1f}</b><br>%{x}<extra></extra>`
        })
      })
    }
  })

  const layout: any = {
    title: {
      text: 'Bitcoin Price with AI-Generated Overlays',
      font: { color: '#ffffff', size: 18 },
      x: 0.02
    },
    paper_bgcolor: '#000000',
    plot_bgcolor: '#000000',
    font: { color: '#ffffff' },
    xaxis: {
      title: 'Date',
      gridcolor: '#333333',
      color: '#ffffff',
      type: 'date'
    },
    yaxis: {
      title: 'Price (USD)',
      gridcolor: '#333333',
      color: '#ffffff',
      type: 'log',
      tickformat: '$,.0f'
    },
    yaxis2: {
      title: 'RSI',
      overlaying: 'y',
      side: 'right',
      range: [0, 100],
      gridcolor: '#333333',
      color: '#ffffff'
    },
    showlegend: true,
    legend: {
      font: { color: '#ffffff' },
      bgcolor: 'rgba(0,0,0,0.5)'
    },
    margin: { l: 80, r: 80, t: 60, b: 60 },
    annotations: allAnnotations,
    shapes: allShapes,
    hovermode: 'x unified'
  }

  const config: any = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'bitcoin-overlay-chart',
      height: 600,
      width: 1200,
      scale: 1
    }
  }

  return (
    <div ref={containerRef} className="w-full">
      <Plot
        data={traces}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '600px' }}
        revision={revision}
      />
    </div>
  )
} 