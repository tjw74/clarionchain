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

// --- ClarionChain: Misc Page ---
// This page now fetches and displays Market Value, Realized Value, and MVRV Ratio.
// Chart uses Chart.js with log Y-axis, short-form USD formatting, and custom legend.
// Legend and Y-axis formatting updated to always use $1.2M, $500K, $2.1B, etc.
// MVRV Ratio is plotted in white, MV in blue, RV in yellow.
// --------------------------------

function formatGrafanaShort(v: number): string {
  if (typeof v !== 'number' || !isFinite(v)) return '$0'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  if (v >= 1) return `$${Math.round(v)}`
  return `$${v.toFixed(2)}`
}

export default function MiscPage() {
  const [dates, setDates] = useState<string[]>([])
  const [marketValues, setMarketValues] = useState<number[]>([])
  const [realizedValues, setRealizedValues] = useState<number[]>([])
  const [mvrvRatios, setMvrvRatios] = useState<number[]>([])
  const chartRef = useRef<any>(null)

  // Fetch Market Value, Realized Value, and compute MVRV Ratio
  useEffect(() => {
    async function fetchData() {
      const today = new Date()
      const jan2012 = new Date('2012-01-01')
      const days = Math.floor((today.getTime() - jan2012.getTime()) / (1000 * 60 * 60 * 24)) + 1
      // Fetch full history for both metrics
      const [marketCap, realizedCap] = await Promise.all([
        brkClient.fetchMarketCapHistory(days),
        brkClient.fetchRealizedCapHistory(days)
      ])
      // Build date array
      const dateArr = Array.from({ length: marketCap.length }, (_, i) => {
        const date = new Date(jan2012)
        date.setDate(jan2012.getDate() + i)
        return date.toISOString().split('T')[0]
      })
      // Calculate MVRV Ratio (MV / RV)
      const mvrv = marketCap.map((mv, i) => {
        const rv = realizedCap[i]
        return rv && rv !== 0 ? mv / rv : NaN
      })
      setDates(dateArr)
      setMarketValues(marketCap)
      setRealizedValues(realizedCap)
      setMvrvRatios(mvrv)
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
        // Register custom tooltip positioner
        if (Tooltip && typeof (Tooltip.positioners as any)['customAbove'] === 'undefined') {
          (Tooltip.positioners as any)['customAbove'] = function(items: any[], eventPosition: any) {
            if (!items.length) return false
            // Always place tooltip at a fixed offset from the top of the chart area
            return { x: eventPosition.x, y: 32 }
          }
        }
      })
    }
  }, [])

  // Chart options: log Y-axis, short-form USD ticks, custom tooltip, zoom/pan
  const chartOptions = useMemo(() => {
    if (!marketValues.length) return {}
    const values = marketValues.filter(v => v > 0)
    if (!values.length) return {}
    // Calculate log ticks for Y-axis
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
          position: ((): any => (ctx: any, options: any) => 'customAbove')(),
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y
              let color = '#ffffff'
              if (label === 'Market Value') color = '#3b82f6'
              if (label === 'Realized Value') color = '#fbbf24'
              if (label === 'MVRV Ratio') color = '#ffffff'
              return (
                `\u25A0 ` + label + ': $' + value.toLocaleString(undefined, { maximumFractionDigits: 6 })
              )
            },
          },
        },
        zoom: {
          // Enable independent panning for y and y2 axes (official config)
          pan: {
            enabled: true,
            scales: {
              y: { enabled: true, axis: 'y' },
            },
          },
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
            font: { family: 'monospace', size: 12 },
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
  }, [marketValues])

  // Chart data: MV (blue), RV (yellow)
  const chartData = useMemo(() => ({
    labels: dates,
    datasets: [
      {
        label: 'Market Value',
        data: marketValues,
        borderColor: '#3b82f6',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'Realized Value',
        data: realizedValues,
        borderColor: '#fbbf24',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }), [dates, marketValues, realizedValues])

  // Legend: MV (blue), RV (yellow), with latest values
  const latestMV = marketValues.length > 0 ? marketValues[marketValues.length - 1] : null
  const latestRV = realizedValues.length > 0 ? realizedValues[realizedValues.length - 1] : null

  return (
    <DashboardLayout title="MVRV">
      <Card>
        <CardHeader>
          <CardTitle>MVRV</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 624 }}>
            {marketValues.length > 0 ? (
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
              {/* Market Value */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  marginRight: 8,
                }} />
                <span style={{ color: '#fff', fontSize: 14 }}>MV</span>
                {latestMV !== null && (
                  <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>
                    {formatGrafanaShort(latestMV)}
                  </span>
                )}
              </div>
              {/* Realized Value */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#fbbf24',
                  marginRight: 8,
                }} />
                <span style={{ color: '#fff', fontSize: 14 }}>RV</span>
                {latestRV !== null && (
                  <span style={{ color: '#fff', fontSize: 14, marginLeft: 8 }}>
                    {formatGrafanaShort(latestRV)}
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