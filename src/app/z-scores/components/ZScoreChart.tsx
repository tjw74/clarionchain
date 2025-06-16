"use client"

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ZScoreMetric {
  key: string
  label: string
  color: string
}

interface ZScoreChartProps {
  zScores: Record<string, number>
  metrics: ZScoreMetric[]
}

export default function ZScoreChart({ zScores, metrics }: ZScoreChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null)

  // Get color based on Z-score value
  const getZScoreColor = (zScore: number): string => {
    const absScore = Math.abs(zScore)
    if (absScore >= 2) return '#ef4444' // Red for extreme
    if (absScore >= 1) return '#f59e0b' // Yellow for elevated
    return '#10b981' // Green for normal
  }

  // Prepare chart data
  const chartData = {
    labels: metrics.map(metric => metric.label),
    datasets: [
      {
        label: 'Z-Score',
        data: metrics.map(metric => zScores[metric.key] || 0),
        backgroundColor: metrics.map(metric => {
          const zScore = zScores[metric.key] || 0
          return getZScoreColor(zScore)
        }),
        borderColor: metrics.map(metric => {
          const zScore = zScores[metric.key] || 0
          return getZScoreColor(zScore)
        }),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.parsed.x
            const interpretation = Math.abs(value) >= 2 ? 'Extreme' : 
                                 Math.abs(value) >= 1 ? 'Elevated' : 'Normal'
            return `Z-Score: ${value.toFixed(2)} (${interpretation})`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        min: -3,
        max: 3,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af',
          stepSize: 1,
          callback: function(value) {
            return value.toString()
          }
        },

      },
      y: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 11
          }
        }
      }
    },
    animation: {
      duration: 200,
      easing: 'easeInOutQuart'
    }
  }

  // Update chart when zScores change
  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current
      
      // Update data
      chart.data.datasets[0].data = metrics.map(metric => zScores[metric.key] || 0)
      chart.data.datasets[0].backgroundColor = metrics.map(metric => {
        const zScore = zScores[metric.key] || 0
        return getZScoreColor(zScore)
      })
      chart.data.datasets[0].borderColor = metrics.map(metric => {
        const zScore = zScores[metric.key] || 0
        return getZScoreColor(zScore)
      })
      
      chart.update('none') // Update without animation for real-time feel
    }
  }, [zScores, metrics])

  return (
    <div className="h-96 w-full">
      <Bar 
        ref={chartRef}
        data={chartData} 
        options={options}
      />
    </div>
  )
} 