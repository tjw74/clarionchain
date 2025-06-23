"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import DashboardLayout from "@/components/dashboard-layout"
import { brkClient } from "@/lib/api/brkClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
})

function formatGrafanaShort(v: number): string {
  if (typeof v !== 'number' || !isFinite(v)) return '$0'
  if (v >= 1e6) return `$${(v / 1e6).toPrecision(3)}M`
  if (v >= 1e3) return `$${(v / 1e3).toPrecision(3)}K`
  if (v >= 1) return `$${v.toPrecision(3)}`
  return `$${v}`
}

export default function MiscPage() {
  const [priceData, setPriceData] = useState<Array<{ date: string; price: number }>>([])
  const [sthRealizedPriceData, setSthRealizedPriceData] = useState<number[]>([])
  const chartRef = useRef<any>(null)

  useEffect(() => {
    async function fetchData() {
      const today = new Date()
      const jan2012 = new Date('2012-01-01')
      const days = Math.floor((today.getTime() - jan2012.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const [closePrices, sthRealizedPrices] = await Promise.all([
        brkClient.fetchDailyCloseHistory(days),
        brkClient.fetchSTHRealizedPriceHistory(days)
      ])
      const data = closePrices.map((price, i) => {
        const date = new Date(jan2012)
        date.setDate(jan2012.getDate() + i)
        return {
          date: date.toISOString().split("T")[0],
          price,
        }
      })
      setPriceData(data)
      setSthRealizedPriceData(sthRealizedPrices)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('chartjs-plugin-zoom').then((zoomPlugin) => {
        ChartJS.register(
          CategoryScale,
          LinearScale,
          LogarithmicScale,
          TimeScale,
          PointElement,
          LineElement,
          Title,
          Tooltip,
          Legend,
          Filler,
          zoomPlugin.default
        )
      })
    }
  }, [])

  const chartOptions = useMemo(() => {
    if (!priceData.length) return {}
    const values = priceData.map(d => d.price).filter(v => v > 0)
    if (!values.length) return {}
    
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const minPow = Math.floor(Math.log2(minVal))
    const maxPow = Math.ceil(Math.log2(maxVal))
    const startPow = Math.max(1, minPow - 1)
    const endPow = maxPow + 1
    
    const calculatedTicks: number[] = []
    for (let p = startPow; p <= endPow; p++) {
      calculatedTicks.push(Math.pow(2, p))
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderWidth: 0,
          callbacks: {
            label: (context: any) => `Price: $${context.parsed.y.toLocaleString()}`,
          },
        },
        zoom: {
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' as const },
          pan: { enabled: true, mode: 'xy' as const },
        },
      },
      scales: {
        x: {
          type: 'time' as const,
          time: { unit: 'year' as const },
          grid: { color: 'rgba(55, 65, 81, 0.5)' },
          ticks: { color: '#9ca3af' },
        },
        y: {
          type: 'logarithmic' as const,
          position: 'right' as const,
          grid: { color: 'rgba(55, 65, 81, 0.5)' },
          ticks: {
            color: '#9ca3af',
            callback: (value: number | string) => formatGrafanaShort(typeof value === 'string' ? parseFloat(value) : value),
          },
          afterBuildTicks: (axis: any) => {
            axis.ticks = calculatedTicks.map(v => ({ value: v }))
          },
          min: Math.pow(2, startPow),
          max: Math.pow(2, endPow),
        },
      },
    }
  }, [priceData])

  const chartData = useMemo(() => ({
    labels: priceData.map(d => d.date),
    datasets: [
      {
        label: 'Price',
        data: priceData.map(d => d.price),
        borderColor: '#3b82f6',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'STH Realized Price',
        data: sthRealizedPriceData.slice(-priceData.length),
        borderColor: '#fbbf24',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }), [priceData, sthRealizedPriceData])

  // Get latest values for legend
  const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : null
  const latestSTH = sthRealizedPriceData.length > 0 ? sthRealizedPriceData[sthRealizedPriceData.length - 1] : null

  return (
    <DashboardLayout title="Misc">
      <Card>
        <CardHeader>
          <CardTitle>Price : STH Realized Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 520 }}>
            {priceData.length > 0 ? (
              <Line 
                ref={chartRef}
                options={chartOptions} 
                data={chartData} 
                onDoubleClick={() => {
                  if (chartRef.current && chartRef.current.resetZoom) {
                    chartRef.current.resetZoom()
                  } else if (chartRef.current && chartRef.current.chart && chartRef.current.chart.resetZoom) {
                    chartRef.current.chart.resetZoom()
                  }
                }}
              />
            ) : (
              <div className="h-[520px] w-full bg-gray-900 animate-pulse rounded-md" />
            )}
          </div>
          {/* Custom Legend: lower right, solid dot, right-aligned */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  marginRight: 8,
                }} />
                <span style={{ color: '#fff', fontSize: 14 }}>Price</span>
                {latestPrice !== null && (
                  <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>
                    {formatGrafanaShort(latestPrice)}
                  </span>
                )}
              </div>
              {/* STH Realized Price */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#fbbf24',
                  marginRight: 8,
                }} />
                <span style={{ color: '#fff', fontSize: 14 }}>STH Realized Price</span>
                {latestSTH !== null && (
                  <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>
                    {formatGrafanaShort(latestSTH)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
} 