"use client"

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import { brkClient } from '@/lib/api/brkClient'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export interface BitcoinChartRef {
  captureImage: () => Promise<string>
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

  if (!isClient) {
    return (
      <div className="h-[450px] flex items-center justify-center bg-muted/50 rounded-md">
        <p className="text-muted-foreground">Loading chart...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-[450px] flex items-center justify-center bg-muted/50 rounded-md">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Loading MVRV Analysis Chart...</p>
          <p className="text-sm text-muted-foreground">Fetching 8-year rolling window data</p>
        </div>
      </div>
    )
  }

  const { dates, marketValues, realizedValues, mvrvRatios } = data

  // Create subplot configuration
  const plotData = [
    // Top subplot - Market Value and Realized Value
    {
      x: dates,
      y: marketValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Market Value',
      line: { color: '#3b82f6', width: 2 }, // Blue
      xaxis: 'x',
      yaxis: 'y',
    },
    {
      x: dates,
      y: realizedValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Realized Value',
      line: { color: '#eab308', width: 2 }, // Yellow
      xaxis: 'x',
      yaxis: 'y',
    },
    // Bottom subplot - MVRV Ratio
    {
      x: dates,
      y: mvrvRatios,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'MVRV Ratio',
      line: { color: '#ffffff', width: 2 }, // White
      xaxis: 'x2',
      yaxis: 'y2',
    },
  ] as any

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff' },
    height: 450,
    margin: { l: 60, r: 60, t: 20, b: 60 },
    
    // Subplot configuration
    grid: { rows: 2, columns: 1, pattern: 'independent', roworder: 'top to bottom' },
    
    // Top subplot (price metrics)
    xaxis: {
      domain: [0, 1],
      anchor: 'y',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
      showticklabels: false,
      matches: 'x2',
    },
    yaxis: {
      domain: [0.4, 1],
      anchor: 'x',
      title: 'Value (USD)',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
      type: 'log', // Log scale for values
    },
    
    // Bottom subplot (oscillators)
    xaxis2: {
      domain: [0, 1],
      anchor: 'y2',
      title: 'Date',
      showgrid: true,
      gridcolor: '#374151',
      color: '#9ca3af',
      matches: 'x',
    },
    yaxis2: {
      domain: [0, 0.35],
      anchor: 'x2',
      title: 'MVRV Ratio',
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
    

  } as any

  const config = {
    displayModeBar: 'hover',
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
    scrollZoom: true,
  } as any

  return (
    <div ref={containerRef} className="w-full h-full">
      <style dangerouslySetInnerHTML={{
        __html: `
          .modebar {
            background: transparent !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .modebar-group {
            background: transparent !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .modebar-btn {
            background: transparent !important;
            border: none !important;
            margin: 2px 0 !important;
          }
          .modebar-btn:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `
      }} />
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