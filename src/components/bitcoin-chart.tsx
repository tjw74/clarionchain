"use client"

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface BitcoinChartRef {
  captureImage: () => Promise<string>
}

// Generate realistic dummy data
const generateDummyData = () => {
  const days = 365 * 2 // 2 years of data
  const startDate = new Date('2022-01-01')
  const dates: string[] = []
  const prices: number[] = []
  const realizedPrices: number[] = []
  const mvrvRatios: number[] = []
  const zScores: number[] = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    dates.push(date.toISOString().split('T')[0])

    // Generate realistic Bitcoin price data with volatility
    const basePrice = 30000 + Math.sin(i / 100) * 15000 + Math.random() * 5000
    const volatility = Math.sin(i / 50) * 0.1 + 0.05
    const price = Math.max(15000, basePrice * (1 + (Math.random() - 0.5) * volatility))
    prices.push(price)

    // Realized price grows more slowly and smoothly
    const realizedPrice = 20000 + (i / days) * 25000 + Math.sin(i / 200) * 3000
    realizedPrices.push(realizedPrice)

    // MVRV ratio = price / realized price
    const mvrv = price / realizedPrice
    mvrvRatios.push(mvrv)

    // Z-score oscillates between -2 and 8 with realistic patterns
    const zScore = Math.sin(i / 80) * 2 + Math.cos(i / 120) * 1.5 + (Math.random() - 0.5) * 0.5
    zScores.push(Math.max(-2.5, Math.min(8, zScore)))
  }

  return { dates, prices, realizedPrices, mvrvRatios, zScores }
}

const BitcoinChart = forwardRef<BitcoinChartRef>((props, ref) => {
  const [data, setData] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [revision, setRevision] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const plotlyRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    captureImage: async () => {
      if (!plotlyRef.current) {
        throw new Error('Chart not ready')
      }
      
      try {
        // Wait a bit to ensure chart is fully rendered
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Use Plotly's downloadImage functionality but capture the result
        return new Promise<string>((resolve, reject) => {
          // Create a temporary canvas to capture the SVG
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          
          // Set canvas size
          canvas.width = 1200
          canvas.height = 450
          
          // Fill with black background
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Find the SVG element in the plot
          const svgElement = plotlyRef.current.querySelector('svg')
          
          if (!svgElement) {
            reject(new Error('SVG element not found'))
            return
          }
          
          // Clone the SVG to avoid modifying the original
          const svgClone = svgElement.cloneNode(true) as SVGElement
          
          // Set explicit dimensions
          svgClone.setAttribute('width', '1200')
          svgClone.setAttribute('height', '450')
          
          // Convert SVG to data URL
          const svgData = new XMLSerializer().serializeToString(svgClone)
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const svgUrl = URL.createObjectURL(svgBlob)
          
          // Create image and draw to canvas
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(svgUrl)
            
            const imageData = canvas.toDataURL('image/png', 0.9)
            
            if (!imageData || imageData === 'data:,') {
              reject(new Error('Failed to generate image data'))
            } else {
              resolve(imageData)
            }
          }
          
          img.onerror = () => {
            URL.revokeObjectURL(svgUrl)
            reject(new Error('Failed to load SVG image'))
          }
          
          img.src = svgUrl
        })
        
      } catch (error) {
        console.error('Failed to capture chart image:', error)
        throw new Error(`Failed to capture chart image: ${(error as Error).message}`)
      }
    }
  }))

  useEffect(() => {
    setIsClient(true)
    setData(generateDummyData())
  }, [])

  // Add resize observer to trigger chart resize when container changes
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      // Add a small delay to ensure the container has finished resizing
      setTimeout(() => {
        setRevision(prev => prev + 1)
      }, 100)
    })

    resizeObserver.observe(containerRef.current)

    // Also listen for window resize events
    const handleWindowResize = () => {
      setTimeout(() => {
        setRevision(prev => prev + 1)
      }, 100)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [isClient])

  if (!isClient || !data) {
    return (
      <div className="h-[450px] flex items-center justify-center bg-muted/50 rounded-md">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  const { dates, prices, realizedPrices, mvrvRatios, zScores } = data

  // Create subplot configuration
  const plotData = [
    // Top subplot - Price metrics
    {
      x: dates,
      y: prices,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Bitcoin Price',
      line: { color: '#f7931a', width: 2 },
      xaxis: 'x',
      yaxis: 'y',
    },
    {
      x: dates,
      y: realizedPrices,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Realized Price',
      line: { color: '#8b5cf6', width: 2 },
      xaxis: 'x',
      yaxis: 'y',
    },
    {
      x: dates,
      y: mvrvRatios.map((ratio: number) => ratio * 10000), // Scale for visibility
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'MVRV Ratio (×10k)',
      line: { color: '#10b981', width: 1 },
      xaxis: 'x',
      yaxis: 'y',
    },
    // Bottom subplot - Z-Score oscillator
    {
      x: dates,
      y: zScores,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'MVRV Z-Score',
      line: { color: '#f59e0b', width: 2 },
      xaxis: 'x2',
      yaxis: 'y2',
    },
  ] as any

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff' },
    height: 450,
    margin: { l: 60, r: 60, t: 60, b: 60 },
    
    // Subplot configuration
    grid: { rows: 2, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
    
    // Top subplot (price metrics)
    xaxis: {
      domain: [0, 1],
      anchor: 'y',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
    },
    yaxis: {
      domain: [0.4, 1],
      anchor: 'x',
      title: 'Price (USD)',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
      type: 'log', // Log scale for price
    },
    
    // Bottom subplot (oscillators)
    xaxis2: {
      domain: [0, 1],
      anchor: 'y2',
      title: 'Date',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
    },
    yaxis2: {
      domain: [0, 0.35],
      anchor: 'x2',
      title: 'Z-Score',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
      zeroline: true,
      zerolinecolor: '#6b7280',
    },
    
    legend: {
      orientation: 'h',
      y: -0.1,
      x: 0,
      font: { color: '#ffffff' },
    },
    
    // Add horizontal reference lines for Z-score
    shapes: [
      // Overbought line
      {
        type: 'line',
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: 7,
        y1: 7,
        xref: 'x2',
        yref: 'y2',
        line: { color: '#ef4444', width: 1, dash: 'dash' },
      },
      // Oversold line
      {
        type: 'line',
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: -1,
        y1: -1,
        xref: 'x2',
        yref: 'y2',
        line: { color: '#22c55e', width: 1, dash: 'dash' },
      },
    ],
  } as any

  const config = {
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
  } as any

  return (
    <div ref={containerRef} className="w-full h-full">
      <Plot
        data={plotData}
        layout={{
          ...layout,
          autosize: true,
        }}
        config={config}
        style={{ width: '100%', height: '450px' }}
        revision={revision}
        useResizeHandler={true}
        onInitialized={(figure, graphDiv) => {
          plotlyRef.current = graphDiv
        }}
        onUpdate={(figure, graphDiv) => {
          plotlyRef.current = graphDiv
        }}
      />
    </div>
  )
})

BitcoinChart.displayName = 'BitcoinChart'

export default BitcoinChart 