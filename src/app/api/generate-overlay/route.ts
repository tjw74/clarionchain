import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, chartData, timeframe } = await request.json()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // For now, we'll simulate AI responses with predefined patterns
    // In production, you'd integrate with OpenAI, Anthropic, or another LLM
    const overlayResponse = await generateOverlayFromPrompt(prompt, chartData, timeframe)

    return NextResponse.json({
      success: true,
      overlay: overlayResponse
    })

  } catch (error) {
    console.error('Error generating overlay:', error)
    return NextResponse.json(
      { error: 'Failed to generate overlay' },
      { status: 500 }
    )
  }
}

async function generateOverlayFromPrompt(prompt: string, chartData: any, timeframe: string) {
  // Simulate AI processing - in production, replace with actual LLM API call
  const lowerPrompt = prompt.toLowerCase()
  
  // Pattern matching for different overlay types
  if (lowerPrompt.includes('oversold') || lowerPrompt.includes('rsi') || lowerPrompt.includes('below 30')) {
    return {
      type: 'technical_indicator',
      name: 'RSI Oversold Zones',
      description: 'Highlighting periods when Bitcoin was oversold (RSI < 30)',
      annotations: generateOversoldAnnotations(chartData),
      indicators: [{
        name: 'RSI',
        type: 'line',
        values: generateRSIValues(chartData),
        color: '#ff6b6b',
        yAxis: 'y2'
      }],
      shapes: generateOversoldShapes(chartData)
    }
  }
  
  if (lowerPrompt.includes('support') || lowerPrompt.includes('resistance')) {
    return {
      type: 'support_resistance',
      name: 'Support & Resistance Levels',
      description: 'Key support and resistance levels based on historical price action',
      annotations: generateSupportResistanceAnnotations(chartData),
      shapes: generateSupportResistanceShapes(chartData)
    }
  }
  
  if (lowerPrompt.includes('bull market') || lowerPrompt.includes('bear market') || lowerPrompt.includes('cycle')) {
    return {
      type: 'market_cycles',
      name: 'Market Cycle Analysis',
      description: 'Bitcoin market cycles with bull and bear market phases',
      annotations: generateMarketCycleAnnotations(),
      shapes: generateMarketCycleShapes()
    }
  }
  
  if (lowerPrompt.includes('halving') || lowerPrompt.includes('halvening')) {
    return {
      type: 'events',
      name: 'Bitcoin Halving Events',
      description: 'Bitcoin halving events and their impact on price',
      annotations: generateHalvingAnnotations(),
      shapes: generateHalvingShapes()
    }
  }
  
  if (lowerPrompt.includes('fibonacci') || lowerPrompt.includes('fib')) {
    return {
      type: 'fibonacci',
      name: 'Fibonacci Retracements',
      description: 'Fibonacci retracement levels for the current trend',
      annotations: generateFibonacciAnnotations(chartData),
      shapes: generateFibonacciShapes(chartData)
    }
  }
  
  // Default response for unrecognized prompts
  return {
    type: 'general',
    name: 'AI Analysis',
    description: `Analysis based on: "${prompt}"`,
    annotations: [{
      x: chartData?.dates?.[Math.floor(chartData.dates.length / 2)] || '2023-01-01',
      y: chartData?.prices?.[Math.floor(chartData.prices?.length / 2)] || 50000,
      text: `AI Insight: ${prompt}`,
      showarrow: true,
      arrowhead: 2,
      arrowsize: 1,
      arrowwidth: 2,
      arrowcolor: '#00d4aa',
      font: { color: '#00d4aa', size: 12 },
      bgcolor: 'rgba(0, 212, 170, 0.1)',
      bordercolor: '#00d4aa',
      borderwidth: 1
    }],
    shapes: []
  }
}

function generateOversoldAnnotations(chartData: any) {
  // Simulate RSI oversold periods
  return [
    {
      x: '2022-06-18',
      y: 17500,
      text: 'Oversold Zone<br>RSI: 25',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#ff6b6b', size: 10 },
      bgcolor: 'rgba(255, 107, 107, 0.1)',
      bordercolor: '#ff6b6b'
    },
    {
      x: '2022-11-21',
      y: 15500,
      text: 'Extreme Oversold<br>RSI: 18',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#ff6b6b', size: 10 },
      bgcolor: 'rgba(255, 107, 107, 0.1)',
      bordercolor: '#ff6b6b'
    }
  ]
}

function generateOversoldShapes(chartData: any) {
  return [
    {
      type: 'rect',
      xref: 'x',
      yref: 'paper',
      x0: '2022-06-15',
      y0: 0,
      x1: '2022-06-25',
      y1: 1,
      fillcolor: 'rgba(255, 107, 107, 0.1)',
      line: { width: 0 }
    }
  ]
}

function generateRSIValues(chartData: any) {
  // Simulate RSI values (normally calculated from price data)
  if (!chartData?.prices) return []
  
  return chartData.prices.map((price: number, index: number) => {
    // Simple RSI simulation
    const variation = Math.sin(index * 0.1) * 20 + 50
    return Math.max(0, Math.min(100, variation))
  })
}

function generateSupportResistanceAnnotations(chartData: any) {
  return [
    {
      x: '2023-06-01',
      y: 25000,
      text: 'Strong Support<br>$25,000',
      showarrow: false,
      font: { color: '#00d4aa', size: 10 },
      bgcolor: 'rgba(0, 212, 170, 0.1)',
      bordercolor: '#00d4aa'
    },
    {
      x: '2023-06-01',
      y: 45000,
      text: 'Resistance<br>$45,000',
      showarrow: false,
      font: { color: '#ff6b6b', size: 10 },
      bgcolor: 'rgba(255, 107, 107, 0.1)',
      bordercolor: '#ff6b6b'
    }
  ]
}

function generateSupportResistanceShapes(chartData: any) {
  return [
    {
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: '2022-01-01',
      y0: 25000,
      x1: '2024-01-01',
      y1: 25000,
      line: { color: '#00d4aa', width: 2, dash: 'dash' }
    },
    {
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: '2022-01-01',
      y0: 45000,
      x1: '2024-01-01',
      y1: 45000,
      line: { color: '#ff6b6b', width: 2, dash: 'dash' }
    }
  ]
}

function generateMarketCycleAnnotations() {
  return [
    {
      x: '2020-03-01',
      y: 8000,
      text: 'Bear Market Bottom<br>COVID Crash',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#ff6b6b', size: 10 },
      bgcolor: 'rgba(255, 107, 107, 0.1)',
      bordercolor: '#ff6b6b'
    },
    {
      x: '2021-11-01',
      y: 69000,
      text: 'Bull Market Peak<br>All-Time High',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#00d4aa', size: 10 },
      bgcolor: 'rgba(0, 212, 170, 0.1)',
      bordercolor: '#00d4aa'
    }
  ]
}

function generateMarketCycleShapes() {
  return [
    {
      type: 'rect',
      xref: 'x',
      yref: 'paper',
      x0: '2020-03-01',
      y0: 0,
      x1: '2021-11-01',
      y1: 1,
      fillcolor: 'rgba(0, 212, 170, 0.05)',
      line: { width: 0 }
    }
  ]
}

function generateHalvingAnnotations() {
  return [
    {
      x: '2020-05-11',
      y: 8500,
      text: 'Bitcoin Halving<br>May 11, 2020',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#f39c12', size: 10 },
      bgcolor: 'rgba(243, 156, 18, 0.1)',
      bordercolor: '#f39c12'
    },
    {
      x: '2024-04-20',
      y: 65000,
      text: 'Bitcoin Halving<br>April 20, 2024',
      showarrow: true,
      arrowhead: 2,
      font: { color: '#f39c12', size: 10 },
      bgcolor: 'rgba(243, 156, 18, 0.1)',
      bordercolor: '#f39c12'
    }
  ]
}

function generateHalvingShapes() {
  return [
    {
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: '2020-05-11',
      y0: 0,
      x1: '2020-05-11',
      y1: 1,
      line: { color: '#f39c12', width: 3, dash: 'dot' }
    },
    {
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: '2024-04-20',
      y0: 0,
      x1: '2024-04-20',
      y1: 1,
      line: { color: '#f39c12', width: 3, dash: 'dot' }
    }
  ]
}

function generateFibonacciAnnotations(chartData: any) {
  return [
    {
      x: '2023-01-01',
      y: 38200,
      text: '61.8% Fib<br>$38,200',
      showarrow: false,
      font: { color: '#9b59b6', size: 9 },
      bgcolor: 'rgba(155, 89, 182, 0.1)',
      bordercolor: '#9b59b6'
    },
    {
      x: '2023-01-01',
      y: 31000,
      text: '50% Fib<br>$31,000',
      showarrow: false,
      font: { color: '#9b59b6', size: 9 },
      bgcolor: 'rgba(155, 89, 182, 0.1)',
      bordercolor: '#9b59b6'
    }
  ]
}

function generateFibonacciShapes(chartData: any) {
  return [
    {
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: '2022-01-01',
      y0: 38200,
      x1: '2024-01-01',
      y1: 38200,
      line: { color: '#9b59b6', width: 1, dash: 'dot' }
    },
    {
      type: 'line',
      xref: 'x',
      yref: 'y',
      x0: '2022-01-01',
      y0: 31000,
      x1: '2024-01-01',
      y1: 31000,
      line: { color: '#9b59b6', width: 1, dash: 'dot' }
    }
  ]
} 