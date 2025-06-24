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
import 'rc-slider/assets/index.css'
import Slider from 'rc-slider'
import zoomPlugin from 'chartjs-plugin-zoom'

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
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
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
      zoomPlugin
    )
  }, [])
  if (!mounted) return null

  const [dates, setDates] = useState<string[]>([])
  const [marketValues, setMarketValues] = useState<number[]>([])
  const [realizedValues, setRealizedValues] = useState<number[]>([])
  const [mvrvRatios, setMvrvRatios] = useState<number[]>([])
  const [brush, setBrush] = useState<[number, number]>([0, 0])
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
      // Default brush: start at Jan 1, 2016
      const defaultEnd = marketCap.length - 1
      // Find the index for Jan 1, 2016
      const jan2016 = new Date('2016-01-01')
      let defaultStart = 0
      for (let i = 0; i < dateArr.length; i++) {
        if (new Date(dateArr[i]) >= jan2016) {
          defaultStart = i
          break
        }
      }
      setBrush([defaultStart, defaultEnd])
    }
    fetchData()
  }, [])

  // Filtered data for main chart based on brush
  const filteredDates = useMemo(() => dates.slice(brush[0], brush[1] + 1), [dates, brush])
  const filteredMarketValues = useMemo(() => marketValues.slice(brush[0], brush[1] + 1), [marketValues, brush])
  const filteredRealizedValues = useMemo(() => realizedValues.slice(brush[0], brush[1] + 1), [realizedValues, brush])
  const filteredMvrvRatios = useMemo(() => mvrvRatios.slice(brush[0], brush[1] + 1), [mvrvRatios, brush])

  // Chart options: log Y-axis, short-form USD ticks, custom tooltip, zoom/pan
  const chartOptions = useMemo(() => {
    if (!filteredMarketValues.length) return {}
    const values = filteredMarketValues.filter(v => v > 0)
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
          ticks: {
            color: '#9ca3af',
            align: 'center' as const,
            maxTicksLimit: 10,
          },
          padding: { left: 0, right: 0 },
          offset: false,
          min: filteredDates[0],
          max: filteredDates[filteredDates.length - 1],
          position: 'bottom' as const,
        },
        y: {
          type: 'logarithmic' as const,
          position: 'right' as const,
          grid: { color: 'rgba(55, 65, 81, 0.5)' },
          ticks: {
            color: '#9ca3af',
            font: { family: 'monospace', size: 12 },
            callback: (value: number | string) => formatGrafanaShort(typeof value === 'string' ? parseFloat(value) : value),
            align: 'end' as const,
          },
          afterBuildTicks: (axis: any) => {
            axis.ticks = calculatedTicks.map(v => ({ value: v }))
          },
          min: Math.pow(2, startPow),
          max: Math.pow(2, endPow),
          padding: { left: 60, right: 0 },
        },
      },
      layout: { padding: 0 },
    }
  }, [filteredMarketValues, filteredDates])

  // Chart data: MV (blue), RV (yellow)
  const chartData = useMemo(() => ({
    labels: filteredDates,
    datasets: [
      {
        label: 'Market Value',
        data: filteredMarketValues,
        borderColor: '#3b82f6',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'Realized Value',
        data: filteredRealizedValues,
        borderColor: '#fbbf24',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }), [filteredDates, filteredMarketValues, filteredRealizedValues])

  // Chart data: MVRV Ratio (white)
  const mvrvRatioData = useMemo(() => ({
    labels: filteredDates,
    datasets: [
      {
        label: 'MVRV Ratio',
        data: filteredMvrvRatios,
        borderColor: '#fff',
        borderWidth: 1,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }), [filteredDates, filteredMvrvRatios])

  // Chart options for MVRV Ratio panel
  const mvrvRatioOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderWidth: 0,
        callbacks: {
          label: (context: any) => `MVRV Ratio: ${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'year' as const },
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: {
          color: '#9ca3af',
          align: 'center' as const,
          maxTicksLimit: 10,
        },
        padding: { left: 0, right: 0 },
        offset: false,
        min: filteredDates[0],
        max: filteredDates[filteredDates.length - 1],
        position: 'bottom' as const,
      },
      y: {
        type: 'logarithmic' as const,
        position: 'right' as const,
        grid: { color: 'rgba(55, 65, 81, 0.5)' },
        ticks: {
          color: '#9ca3af',
          font: { family: 'monospace', size: 12 },
          callback: (value: number | string) => (typeof value === 'number' ? value.toFixed(2) : value),
          align: 'end' as const,
        },
        padding: { left: 60, right: 0 },
      },
    },
    layout: { padding: 0 },
  }), [filteredDates])

  // Legend: MV (blue), RV (yellow), with latest values
  const latestMV = filteredMarketValues.length > 0 ? filteredMarketValues[filteredMarketValues.length - 1] : null
  const latestRV = filteredRealizedValues.length > 0 ? filteredRealizedValues[filteredRealizedValues.length - 1] : null

  // Mini-map chart options and data (no interactivity, always full range)
  const miniMapOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { type: 'time' as const, time: { unit: 'year' as const }, grid: { color: 'rgba(55, 65, 81, 0.2)' }, ticks: { color: '#6b7280' } },
      y: { type: 'logarithmic' as const, position: 'right' as const, grid: { color: 'rgba(55, 65, 81, 0.2)' }, ticks: { color: '#6b7280', callback: (value: number | string) => formatGrafanaShort(typeof value === 'string' ? parseFloat(value) : value) } },
    },
  }), [])
  const miniMapData = useMemo(() => ({
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

  // Register custom tooltip positioner only on the client
  useEffect(() => {
    if (typeof window !== 'undefined' && Tooltip && typeof (Tooltip.positioners as any)['customAbove'] === 'undefined') {
      (Tooltip.positioners as any)['customAbove'] = function(items: any[], eventPosition: any) {
        if (!items.length) return false
        // Always place tooltip at a fixed offset from the top of the chart area
        return { x: eventPosition.x, y: 32 }
      }
    }
  }, [])

  return (
    <>
      <style jsx global>{`
        html, body, #__next, main, .bg-black, .bg-muted, .border, .rounded-md, .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl {
          background: #000 !important;
          box-shadow: none !important;
          border: none !important;
        }
      `}</style>
      <DashboardLayout title="MVRV">
        <Card className="bg-black">
          <CardHeader>
            <CardTitle>Market Value : Realized Value</CardTitle>
          </CardHeader>
          <CardContent className="!p-0 bg-black">
            <div className="bg-black min-w-0 flex flex-col">
              {/* Main Chart area */}
              <div className="w-full" style={{ height: 360 }}>
                {filteredMarketValues.length > 0 ? (
                  <Line 
                    ref={chartRef}
                    options={chartOptions} 
                    data={chartData} 
                    height={360}
                  />
                ) : (
                  <div className="h-[360px] w-full bg-gray-900 animate-pulse rounded-md" />
                )}
              </div>
              {/* Ratio Chart area */}
              <div className="w-full" style={{ height: 360 }}>
                <Line options={mvrvRatioOptions} data={mvrvRatioData} height={360} />
              </div>
              {/* Time Slider below the charts */}
              <div style={{ marginTop: 12, marginBottom: 0, width: '100%' }} className="bg-black">
                <Slider
                  range
                  min={0}
                  max={dates.length - 1}
                  value={brush}
                  onChange={(val: number | number[]) => setBrush(val as [number, number])}
                  trackStyle={[{ backgroundColor: '#9ca3af', height: 1.5 }]}
                  handleStyle={[
                    { borderColor: '#fff', backgroundColor: '#9ca3af', height: 9, width: 9, marginTop: -4 },
                    { borderColor: '#fff', backgroundColor: '#9ca3af', height: 9, width: 9, marginTop: -4 }
                  ]}
                  railStyle={{ backgroundColor: '#374151', height: 1.5 }}
                />
              </div>
              {/* Legend: lower right, solid dot, right-aligned */}
              <div className="flex justify-end mt-4 pr-4 bg-black">
                <div className="flex items-center gap-6">
                  {/* Market Value */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-white text-sm">MV</span>
                    {latestMV !== null && (
                      <span className="text-white text-sm ml-1">{formatGrafanaShort(latestMV)}</span>
                    )}
                  </div>
                  {/* Realized Value */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fbbf24' }}></div>
                    <span className="text-white text-sm">RV</span>
                    {latestRV !== null && (
                      <span className="text-white text-sm ml-1">{formatGrafanaShort(latestRV)}</span>
                    )}
                  </div>
                  {/* MVRV Ratio */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fff' }}></div>
                    <span className="text-white text-sm">MVRV Ratio</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    </>
  )
} 