"use client"

import { useEffect, useRef, useCallback } from 'react'
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
  ChartOptions,
  TooltipItem,
  Plugin
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface PriceChartProps {
  data: Array<{timestamp: string, price: number}>
  onHover: (dataIndex: number) => void
}

export default function PriceChart({ data, onHover }: PriceChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null)
  
  // Debug logging
  console.log('PriceChart received data:', data.length, 'items')
  if (data.length > 0) {
    console.log('Sample data:', data.slice(0, 3))
  }

  // Throttled hover handler for performance
  const throttledHover = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null
      return (dataIndex: number) => {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => onHover(dataIndex), 16) // ~60fps
      }
    })(),
    [onHover]
  )

  const chartData = {
    labels: data.length > 0 ? data.map(item => {
      const date = new Date(item.timestamp)
      return date.getFullYear().toString()
    }) : ['No Data'],
    datasets: [
      {
        label: 'Bitcoin Price',
        data: data.length > 0 ? data.map(item => item.price) : [0],
        borderColor: '#3b82f6',
        backgroundColor: (context: any) => {
          if (!context.chart.chartArea) {
            return 'rgba(59, 130, 246, 0.1)'
          }
          const { ctx, chartArea } = context.chart
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)')
          return gradient
        },
        borderWidth: 2,
        fill: 'origin',
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3b82f6',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      }
    ]
  }



  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        callbacks: {
          title: (context) => {
            const index = context[0].dataIndex
            const date = new Date(data[index].timestamp)
            return date.toLocaleDateString()
          },
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y
            return `Price: $${value.toLocaleString()}`
          }
        },
        external: (context: any) => {
          const { chart, tooltip } = context
          if (tooltip.opacity === 0) return
          
          const position = chart.canvas.getBoundingClientRect()
          const tooltipEl = document.getElementById('chartjs-tooltip') || document.createElement('div')
          
          if (!document.getElementById('chartjs-tooltip')) {
            tooltipEl.id = 'chartjs-tooltip'
            tooltipEl.style.position = 'absolute'
            tooltipEl.style.pointerEvents = 'none'
            tooltipEl.style.transition = 'all 0.1s ease'
            document.body.appendChild(tooltipEl)
          }
          
          tooltipEl.innerHTML = `
            <div style="
              background: rgba(59, 130, 246, 0.15);
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              border: none;
              font-size: 12px;
              white-space: nowrap;
              backdrop-filter: blur(8px);
            ">
              ${tooltip.title[0]}<br/>
              ${tooltip.body[0].lines[0]}
            </div>
          `
          
          tooltipEl.style.left = position.left + tooltip.caretX - tooltipEl.offsetWidth / 2 + 'px'
          tooltipEl.style.top = position.top + tooltip.caretY - tooltipEl.offsetHeight - 20 + 'px'
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          maxTicksLimit: 8
        }
      },
      y: {
        display: true,
        type: 'logarithmic',
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          callback: function(value) {
            return '$' + Number(value).toLocaleString()
          }
        }
      }
    },
    onHover: (event, activeElements) => {
      if (activeElements.length > 0) {
        const dataIndex = activeElements[0].index
        throttledHover(dataIndex)
      }
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    }
  }

  if (data.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading price data...</div>
          <div className="text-sm text-muted-foreground mt-2">Fetching Bitcoin price history</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full">
      <Line 
        ref={chartRef}
        data={chartData} 
        options={options}
      />
    </div>
  )
} 