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
  TooltipItem
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
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#f59e0b',
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
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
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