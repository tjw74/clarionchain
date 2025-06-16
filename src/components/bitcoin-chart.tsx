"use client"

import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react'
import dynamic from 'next/dynamic'
import { brkClient } from '@/lib/api/brkClient'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

// Extend window type for Plotly
declare global {
  interface Window {
    Plotly: any
  }
}

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

  // Force re-render when container size changes
  useEffect(() => {
    if (!containerRef.current || !isClient) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Force a complete re-render by updating revision
        setRevision(prev => prev + 1)
      }
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
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

  // Calculate dynamic Y-axis ticks for log scale
  const calculateLogTicks = (values: number[]) => {
    const minVal = Math.min(...values.filter(v => v > 0))
    const maxVal = Math.max(...values)
    
    // Work in log space
    const logMin = Math.log10(minVal)
    const logMax = Math.log10(maxVal)
    
    // Add 5% padding in log space
    const logRange = logMax - logMin
    const paddedLogMin = logMin - (logRange * 0.05)
    const paddedLogMax = logMax + (logRange * 0.05)
    
    // Create 5 evenly spaced ticks in log space
    const tickvals = []
    for (let i = 0; i <= 4; i++) {
      const logTick = paddedLogMin + (i * (paddedLogMax - paddedLogMin) / 4)
      const tickValue = Math.pow(10, logTick)
      
      // Round to appropriate precision based on magnitude
      let roundedValue
      if (tickValue >= 1e12) {
        roundedValue = Math.round(tickValue / 1e10) * 1e10 // Round to nearest 10B
      } else if (tickValue >= 1e11) {
        roundedValue = Math.round(tickValue / 1e9) * 1e9 // Round to nearest 1B
      } else if (tickValue >= 1e10) {
        roundedValue = Math.round(tickValue / 1e8) * 1e8 // Round to nearest 100M
      } else if (tickValue >= 1e9) {
        roundedValue = Math.round(tickValue / 1e7) * 1e7 // Round to nearest 10M
      } else {
        roundedValue = Math.round(tickValue / 1e6) * 1e6 // Round to nearest 1M
      }
      
      tickvals.push(roundedValue)
    }
    
    return tickvals
  }

  // Calculate ticks for top subplot (combine MV and RV data)
  const topSubplotTicks = calculateLogTicks([...marketValues, ...realizedValues])

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

  // Create subplot configuration
  const plotData = [
    // Top subplot - Market Value and Realized Value
    {
      x: dates,
      y: marketValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Market Value',
      line: { color: '#3b82f6', width: 1 }, // Blue
      xaxis: 'x',
      yaxis: 'y',
    },
    {
      x: dates,
      y: realizedValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Realized Value',
      line: { color: '#eab308', width: 1 }, // Yellow
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
      line: { color: '#ffffff', width: 1 }, // White
      xaxis: 'x2',
      yaxis: 'y2',
    },
    // Center line for MVRV Ratio at y=1
    {
      x: [dates[0], dates[dates.length - 1]],
      y: [1, 1],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Center Line',
      line: { 
        color: '#6b7280', 
        width: 1, 
        dash: 'dot' 
      },
      xaxis: 'x2',
      yaxis: 'y2',
      showlegend: false,
    },
  ] as any

  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#ffffff' },
    margin: { l: 60, r: 60, t: 5, b: 40 },
    
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
      side: 'right',
      tickvals: topSubplotTicks,
      tickmode: 'array',
      ticktext: topSubplotTicks.map(formatUSDValue),
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
      side: 'right',
    },
    
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'center',
      x: 0.5,
      font: { color: '#ffffff' },
    },
    

  } as any

  const config = {
    displayModeBar: 'hover',
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    responsive: true,
    scrollZoom: true,
    autosizable: true,
  } as any

  return (
    <div ref={containerRef} className="w-full" style={{ containerType: 'inline-size' }}>
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
          .plotly-chart-container {
            container-type: inline-size;
            width: 100%;
          }
        `
      }} />
      <div className="plotly-chart-container">
        <Plot
          data={plotData}
          layout={{
            ...layout,
            autosize: true,
          }}
          config={config}
          style={{ width: '100%', height: '500px' }}
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
    </div>
  )
})

BitcoinChart.displayName = 'BitcoinChart'

export default BitcoinChart 